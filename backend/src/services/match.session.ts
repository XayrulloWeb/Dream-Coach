import { randomUUID } from 'crypto';
import {
  ExplainableInsight,
  MatchEvent,
  MatchFinalReport,
  MatchResumeResponse,
  MatchStateResponse,
  MatchStartResponse,
  MatchStateSnapshot,
  MatchStatus,
  MatchSubstitutionResponse,
  MidMatchInsight,
  PlayerInput,
  PlayerMatchRating,
  PlayerPauseState,
  SimulationInput,
  SimulationResult,
  SubstitutionAction,
  TacticalStyle,
  TacticsConfig,
  TeamInput,
  TeamMatchStats,
  TeamVectors,
  Zone,
} from '../types/simulation';
import {
  isDatabaseUnavailableError,
  loadPersistedMatchState,
  persistMatchFinal,
  persistMatchStart,
  persistSubstitution,
} from './match.persistence';
import { getActiveCalibration } from './calibration.service';
import { simulateMatch } from './simulation.engine';

type MatchSession = {
  id: string;
  minute: number;
  status: MatchStatus;
  pauseMinute: number;
  team: TeamInput;
  opponent: TeamInput;
  venue: 'HOME' | 'AWAY' | 'NEUTRAL';
  tacticsConfig?: TacticsConfig;
  simulation: SimulationResult;
  pauseSnapshot: MatchStateSnapshot;
  hasSubstitutions: boolean;
};

const sessions = new Map<string, MatchSession>();
const PAUSE_MINUTE = 60;

export async function startStatefulMatch(input: SimulationInput): Promise<MatchStartResponse> {
  const matchId = randomUUID();
  const team = cloneTeam(input.team);
  const opponent = cloneTeam(input.opponent ?? buildFallbackOpponent());
  const venue = input.venue ?? 'HOME';
  const tacticsConfig = input.tacticsConfig;

  const calibration = await getActiveCalibration();
  const simulation = simulateMatch({ team, opponent, venue, ...(tacticsConfig ? { tacticsConfig } : {}) }, calibration);

  const session: MatchSession = {
    id: matchId,
    minute: PAUSE_MINUTE,
    status: 'PAUSED_FOR_COACH',
    pauseMinute: PAUSE_MINUTE,
    team,
    opponent,
    venue,
    ...(tacticsConfig ? { tacticsConfig } : {}),
    simulation,
    pauseSnapshot: {} as MatchStateSnapshot,
    hasSubstitutions: false,
  };

  session.pauseSnapshot = buildPauseSnapshot(session);
  sessions.set(matchId, session);

  const snapshot = session.pauseSnapshot;
  const result: MatchStartResponse = {
    ...snapshot,
    suggestedActions: buildSuggestedActions(team, snapshot.insights),
  };

  await persistSafely(() => persistMatchStart(matchId, input, result));
  return result;
}

export function previewStatefulSubstitutions(
  matchId: string,
  substitutions: SubstitutionAction[],
  tacticalStyle?: TacticalStyle,
) {
  const session = sessions.get(matchId);
  if (!session) {
    throw new Error('Match session not found');
  }

  const beforeTeam = cloneTeam(session.team);
  const nextTeam = applySubstitutions(beforeTeam, substitutions);
  if (tacticalStyle) {
    nextTeam.tacticalStyle = tacticalStyle;
  }

  const before = calculateTeamVectors(beforeTeam);
  const after = calculateTeamVectors(nextTeam);

  return {
    before,
    after,
    deltas: {
      controlDelta: round(after.control - before.control),
      chanceCreationDelta: round(after.chanceCreation - before.chanceCreation),
      defenseDelta: round(after.defensiveWall - before.defensiveWall),
      leftRiskDelta: round(after.leftFlankRisk - before.leftFlankRisk),
      rightRiskDelta: round(after.rightFlankRisk - before.rightFlankRisk),
      pressingDelta: round(after.pressingPower - before.pressingPower),
    },
  };
}

export async function applyStatefulSubstitutions(
  matchId: string,
  substitutions: SubstitutionAction[],
  tacticalStyle?: TacticalStyle,
): Promise<MatchSubstitutionResponse> {
  const session = sessions.get(matchId);
  if (!session) {
    throw new Error('Match session not found');
  }

  if (session.status !== 'PAUSED_FOR_COACH') {
    throw new Error('Substitutions are allowed only during coach pause');
  }

  const beforeTeam = cloneTeam(session.team);
  const nextTeam = applySubstitutions(beforeTeam, substitutions);
  if (tacticalStyle) {
    nextTeam.tacticalStyle = tacticalStyle;
  }

  const before = calculateTeamVectors(beforeTeam);
  const after = calculateTeamVectors(nextTeam);

  session.team = nextTeam;
  const calibration = await getActiveCalibration();
  session.simulation = simulateMatch({
    team: nextTeam,
    opponent: session.opponent,
    venue: session.venue,
    ...(session.tacticsConfig ? { tacticsConfig: session.tacticsConfig } : {}),
  }, calibration);
  session.hasSubstitutions = substitutions.length > 0 || Boolean(tacticalStyle);

  const response: MatchSubstitutionResponse = {
    matchId,
    minute: session.pauseMinute,
    status: session.status,
    impactPreview: {
      before,
      after,
      deltas: {
        controlDelta: round(after.control - before.control),
        chanceCreationDelta: round(after.chanceCreation - before.chanceCreation),
        defenseDelta: round(after.defensiveWall - before.defensiveWall),
        leftRiskDelta: round(after.leftFlankRisk - before.leftFlankRisk),
        rightRiskDelta: round(after.rightFlankRisk - before.rightFlankRisk),
        pressingDelta: round(after.pressingPower - before.pressingPower),
      },
    },
    team: nextTeam,
  };

  await persistSafely(() => persistSubstitution(matchId, substitutions, tacticalStyle, response));
  return response;
}

export async function resumeStatefulMatch(matchId: string): Promise<MatchResumeResponse> {
  const session = sessions.get(matchId);
  if (!session) {
    const persisted = await persistSafely(() => loadPersistedMatchState(matchId), null);
    if (persisted && persisted.status === 'FINISHED') {
      return {
        matchId,
        minute: 90,
        status: 'FINISHED',
        report: persisted.report,
      };
    }

    throw new Error('Match session not found');
  }

  session.status = 'FINISHED';
  session.minute = 90;

  const report = await buildFinalReport(session);

  await persistSafely(() => persistMatchFinal(matchId, report));
  sessions.delete(matchId);

  return {
    matchId,
    minute: 90,
    status: 'FINISHED',
    report,
  };
}

export async function getStatefulMatchState(matchId: string): Promise<MatchStateResponse | null> {
  const session = sessions.get(matchId);
  if (session) {
    return {
      matchId,
      minute: session.pauseMinute,
      status: 'PAUSED_FOR_COACH',
      pauseState: {
        ...session.pauseSnapshot,
        suggestedActions: buildSuggestedActions(session.team, session.pauseSnapshot.insights),
      },
    };
  }

  return loadPersistedMatchState(matchId);
}

async function persistSafely<T>(fn: () => Promise<T>, fallback?: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) {
      // ignore all persistence failures in MVP fallback mode
    }
    return fallback as T;
  }
}

function buildPauseSnapshot(session: MatchSession): MatchStateSnapshot {
  const minute = session.pauseMinute;
  const events = session.simulation.events.filter((event) => event.minute <= minute);
  const score = scoreFromEvents(events);
  const stats = estimateStatsAtMinute(session.simulation, minute, events);
  const insights = withEvidence(session.team, session.simulation.insights, events, minute);

  // Build real player states from engine stamina snapshot
  const playerStates = buildPlayerPauseStates(
    session.team,
    session.simulation,
    events,
    minute,
  );

  return {
    matchId: session.id,
    minute,
    status: session.status,
    score,
    stats,
    ratings: session.simulation.ratings,
    events,
    insights,
    ...(playerStates.length > 0 ? { playerStates } : {}),
  };
}

async function buildFinalReport(session: MatchSession): Promise<MatchFinalReport> {
  const effectiveSimulation = session.hasSubstitutions
    ? mergeSimulationsAtPause(session.pauseSnapshot, session.simulation, session.pauseMinute)
    : session.simulation;

  const goals = buildGoalSummary(effectiveSimulation.events);
  const playerRatings = buildPlayerRatings(session.team, session.opponent, effectiveSimulation.events);

  let mvp: any = playerRatings.length > 0 ? {
    playerId: playerRatings[0]!.playerId,
    name: playerRatings[0]!.name,
    rating: playerRatings[0]!.rating,
    reason: '',
    stats: playerRatings[0]!.stats,
  } : null;

  const { explainMatchReport } = require('./explainer.service');
  const explainerData = await explainMatchReport(effectiveSimulation, mvp, session.hasSubstitutions, session.team);

  if (mvp) {
    // Delete stats so it conforms strictly to the type
    delete mvp.stats;
  }

  return {
    ...effectiveSimulation,
    status: 'FINISHED',
    goals,
    playerRatings,
    mvp,
    tacticalSummary: explainerData.tacticalSummary,
    coachCard: explainerData.coachCard,
  };
}

function mergeSimulationsAtPause(
  pauseSnapshot: MatchStateSnapshot,
  adjustedSimulation: SimulationResult,
  pauseMinute: number,
): SimulationResult {
  const firstHalfEvents = pauseSnapshot.events.filter((event) => event.minute <= pauseMinute);
  const secondHalfEvents = adjustedSimulation.events.filter((event) => event.minute > pauseMinute);
  const mergedEvents = [...firstHalfEvents, ...secondHalfEvents].sort((a, b) => a.minute - b.minute);

  const adjustedFirstHalfEvents = adjustedSimulation.events.filter((event) => event.minute <= pauseMinute);
  const adjustedFirstHalfStats = estimateStatsAtMinute(adjustedSimulation, pauseMinute, adjustedFirstHalfEvents);

  const halfTwoHomeXg = Math.max(0, adjustedSimulation.stats.home.xg - adjustedFirstHalfStats.home.xg);
  const halfTwoAwayXg = Math.max(0, adjustedSimulation.stats.away.xg - adjustedFirstHalfStats.away.xg);

  const homeShots = mergedEvents.filter(
    (event) => event.team === 'HOME' && (event.type === 'SHOT' || event.type === 'GOAL'),
  ).length;
  const awayShots = mergedEvents.filter(
    (event) => event.team === 'AWAY' && (event.type === 'SHOT' || event.type === 'GOAL'),
  ).length;

  const homeShotsOnTarget = mergedEvents.filter(
    (event) =>
      event.team === 'HOME' &&
      (event.type === 'GOAL' || (event.type === 'SHOT' && event.message.includes('forced a save'))),
  ).length;
  const awayShotsOnTarget = mergedEvents.filter(
    (event) =>
      event.team === 'AWAY' &&
      (event.type === 'GOAL' || (event.type === 'SHOT' && event.message.includes('forced a save'))),
  ).length;

  const homeBigChances = mergedEvents.filter(
    (event) => event.team === 'HOME' && event.type === 'GOAL',
  ).length + Math.max(0, adjustedSimulation.stats.home.bigChances - adjustedFirstHalfStats.home.bigChances);
  const awayBigChances = mergedEvents.filter(
    (event) => event.team === 'AWAY' && event.type === 'GOAL',
  ).length + Math.max(0, adjustedSimulation.stats.away.bigChances - adjustedFirstHalfStats.away.bigChances);

  const homePossession = round(
    (pauseSnapshot.stats.home.possession * pauseMinute +
      adjustedSimulation.stats.home.possession * (90 - pauseMinute)) /
      90,
  );
  const awayPossession = 100 - homePossession;

  const mergedScore = scoreFromEvents(mergedEvents);

  return {
    score: mergedScore,
    stats: {
      home: {
        possession: homePossession,
        shots: homeShots,
        shotsOnTarget: homeShotsOnTarget,
        xg: roundToTwo(pauseSnapshot.stats.home.xg + halfTwoHomeXg),
        bigChances: round(homeBigChances),
      },
      away: {
        possession: awayPossession,
        shots: awayShots,
        shotsOnTarget: awayShotsOnTarget,
        xg: roundToTwo(pauseSnapshot.stats.away.xg + halfTwoAwayXg),
        bigChances: round(awayBigChances),
      },
    },
    ratings: adjustedSimulation.ratings,
    insights: pauseSnapshot.insights,
    events: mergedEvents,
  };
}

function scoreFromEvents(events: MatchEvent[]) {
  let home = 0;
  let away = 0;

  for (const event of events) {
    if (event.type !== 'GOAL') {
      continue;
    }

    if (event.team === 'HOME') {
      home += 1;
    }

    if (event.team === 'AWAY') {
      away += 1;
    }
  }

  return { home, away };
}

function estimateStatsAtMinute(
  simulation: SimulationResult,
  minute: number,
  events: MatchEvent[],
): { home: TeamMatchStats; away: TeamMatchStats } {
  const ratio = clamp(minute / 90, 0, 1);

  const homeShots = events.filter((event) => event.team === 'HOME' && (event.type === 'SHOT' || event.type === 'GOAL')).length;
  const awayShots = events.filter((event) => event.team === 'AWAY' && (event.type === 'SHOT' || event.type === 'GOAL')).length;

  const homeShotsOnTarget = events.filter(
    (event) => event.team === 'HOME' && (event.type === 'GOAL' || (event.type === 'SHOT' && event.message.includes('forced a save'))),
  ).length;
  const awayShotsOnTarget = events.filter(
    (event) => event.team === 'AWAY' && (event.type === 'GOAL' || (event.type === 'SHOT' && event.message.includes('forced a save'))),
  ).length;

  const homePossession = round(50 + (simulation.stats.home.possession - 50) * ratio);
  const awayPossession = 100 - homePossession;

  return {
    home: {
      possession: homePossession,
      shots: homeShots,
      shotsOnTarget: homeShotsOnTarget,
      xg: roundToTwo(simulation.stats.home.xg * ratio),
      bigChances: Math.max(0, round(simulation.stats.home.bigChances * ratio)),
    },
    away: {
      possession: awayPossession,
      shots: awayShots,
      shotsOnTarget: awayShotsOnTarget,
      xg: roundToTwo(simulation.stats.away.xg * ratio),
      bigChances: Math.max(0, round(simulation.stats.away.bigChances * ratio)),
    },
  };
}

function withEvidence(
  team: TeamInput,
  insights: MidMatchInsight[],
  events: MatchEvent[],
  minute: number,
): ExplainableInsight[] {
  const mapped: ExplainableInsight[] = [];

  for (const insight of insights) {
    if (insight.minute > minute) {
      continue;
    }

    const explainableIssues = insight.issues.map((issue) => {
      const zone = issue.zone === 'MIDFIELD' ? 'center' : issue.zone;
      const zoneEvents = zone
        ? events.filter((event) => event.team === 'AWAY' && (event.type === 'SHOT' || event.type === 'GOAL') && event.zone === zone)
        : events.filter((event) => event.team === 'AWAY' && (event.type === 'SHOT' || event.type === 'GOAL'));

      const playersInZone = zone
        ? team.players.filter((player) => roleToZone(player.rolePosition) === zone)
        : team.players;

      const staminaByPlayer = Object.fromEntries(
        playersInZone.slice(0, 3).map((player) => [player.name, estimateStamina(player, minute, team.tacticalStyle)]),
      );

      const evidenceBase = {
        opponentAttacksFromZone: zoneEvents.length,
        successfulOpponentAttacks: zoneEvents.filter((event) => event.type === 'GOAL').length,
        playerStamina: staminaByPlayer,
        workRateMismatch: playersInZone.some((player) => player.attackWorkRate === 'HIGH' && player.defenseWorkRate === 'LOW'),
      };

      if (issue.zone) {
        return {
          ...issue,
          evidence: {
            ...evidenceBase,
            zone: issue.zone,
          },
        };
      }

      return {
        ...issue,
        evidence: evidenceBase,
      };
    });

    mapped.push({
      ...insight,
      issues: explainableIssues,
    });
  }

  return mapped;
}

function buildSuggestedActions(team: TeamInput, insights: ExplainableInsight[]): SubstitutionAction[] {
  const firstIssue = insights[0]?.issues[0];
  if (!firstIssue) {
    return [];
  }

  if (firstIssue.zone === 'left') {
    const outPlayer = team.players.find((player) => player.rolePosition === 'LW');
    const inPlayer = team.players.find((player) => player.isSubstitute && roleToZone(player.rolePosition) === 'left');

    if (outPlayer && inPlayer) {
      return [{ playerOutId: outPlayer.id, playerInId: inPlayer.id }];
    }
  }

  if (firstIssue.zone === 'right') {
    const outPlayer = team.players.find((player) => player.rolePosition === 'RW');
    const inPlayer = team.players.find((player) => player.isSubstitute && roleToZone(player.rolePosition) === 'right');

    if (outPlayer && inPlayer) {
      return [{ playerOutId: outPlayer.id, playerInId: inPlayer.id }];
    }
  }

  const outMid = team.players.find((player) => player.rolePosition === 'RCM' || player.rolePosition === 'LCM');
  const inMid = team.players.find((player) => player.isSubstitute && (player.naturalPosition === 'CDM' || player.rolePosition === 'CDM'));

  if (outMid && inMid) {
    return [{ playerOutId: outMid.id, playerInId: inMid.id, newRolePosition: 'CDM' }];
  }

  return [];
}

function applySubstitutions(team: TeamInput, substitutions: SubstitutionAction[]): TeamInput {
  const next = cloneTeam(team);

  for (const sub of substitutions) {
    if (!sub.playerOutId || !sub.playerInId || sub.playerOutId === sub.playerInId) {
      continue;
    }

    const outIndex = next.players.findIndex((player) => player.id === sub.playerOutId);
    const inIndex = next.players.findIndex((player) => player.id === sub.playerInId);

    if (outIndex === -1 || inIndex === -1) {
      continue;
    }

    const outPlayer = next.players[outIndex];
    const inPlayer = next.players[inIndex];

    if (!outPlayer || !inPlayer) {
      continue;
    }

    const targetRole = sub.newRolePosition?.trim().toUpperCase() || outPlayer.rolePosition;

    next.players[outIndex] = {
      ...outPlayer,
      isSubstitute: true,
    };

    next.players[inIndex] = {
      ...inPlayer,
      isSubstitute: false,
      rolePosition: targetRole,
    };
  }

  return next;
}

function calculateTeamVectors(team: TeamInput): TeamVectors {
  const starters = team.players.filter((player) => !player.isSubstitute).slice(0, 11);
  const players = starters.length ? starters : team.players;

  const midfield = players.filter((player) => ['CDM', 'CM', 'LCM', 'RCM', 'CAM'].includes(player.rolePosition));
  const defenders = players.filter((player) => ['CB', 'LCB', 'RCB', 'LB', 'RB', 'LWB', 'RWB', 'GK'].includes(player.rolePosition));
  const attackers = players.filter((player) => ['LW', 'RW', 'ST', 'CF', 'CAM'].includes(player.rolePosition));

  const control = round(weightedAverage(midfield.map((player) => player.pas * 0.6 + player.dri * 0.4), 65));
  const chanceCreation = round(weightedAverage(attackers.map((player) => player.sho * 0.42 + player.pas * 0.38 + player.dri * 0.2), 65));
  const defensiveWall = round(weightedAverage(defenders.map((player) => player.def * 0.7 + player.phy * 0.3), 65));

  const leftPlayers = players.filter((player) => roleToZone(player.rolePosition) === 'left');
  const rightPlayers = players.filter((player) => roleToZone(player.rolePosition) === 'right');

  const leftFlankRisk = round(100 - weightedAverage(leftPlayers.map((player) => player.def * 0.6 + workRateFactor(player.defenseWorkRate) * 25), 62));
  const rightFlankRisk = round(100 - weightedAverage(rightPlayers.map((player) => player.def * 0.6 + workRateFactor(player.defenseWorkRate) * 25), 62));

  const pressing = round(weightedAverage(players.map((player) => workRateFactor(player.attackWorkRate) * 30 + workRateFactor(player.defenseWorkRate) * 30 + player.stamina * 0.4), 60));

  const styleAdjusted = applyStyleModifiers(team.tacticalStyle, {
    control,
    chanceCreation,
    defensiveWall,
    leftFlankRisk,
    rightFlankRisk,
    pressingPower: pressing,
  });

  return {
    control: clamp(round(styleAdjusted.control), 1, 99),
    chanceCreation: clamp(round(styleAdjusted.chanceCreation), 1, 99),
    defensiveWall: clamp(round(styleAdjusted.defensiveWall), 1, 99),
    leftFlankRisk: clamp(round(styleAdjusted.leftFlankRisk), 1, 99),
    rightFlankRisk: clamp(round(styleAdjusted.rightFlankRisk), 1, 99),
    pressingPower: clamp(round(styleAdjusted.pressingPower), 1, 99),
  };
}

function applyStyleModifiers(style: TacticalStyle, vectors: TeamVectors): TeamVectors {
  const next = { ...vectors };

  if (style === 'HIGH_PRESS') {
    next.pressingPower += 8;
    next.chanceCreation += 4;
    next.defensiveWall -= 3;
    next.leftFlankRisk += 6;
    next.rightFlankRisk += 6;
    return next;
  }

  if (style === 'COUNTER') {
    next.control -= 4;
    next.chanceCreation += 5;
    next.defensiveWall += 2;
    return next;
  }

  if (style === 'POSSESSION') {
    next.control += 8;
    next.chanceCreation += 2;
    next.pressingPower += 2;
    return next;
  }

  if (style === 'LOW_BLOCK') {
    next.control -= 6;
    next.chanceCreation -= 3;
    next.defensiveWall += 7;
    next.pressingPower -= 4;
    next.leftFlankRisk -= 4;
    next.rightFlankRisk -= 4;
    return next;
  }

  return next;
}

function buildGoalSummary(events: MatchEvent[]) {
  const goals = events.filter(
    (event): event is MatchEvent & { team: 'HOME' | 'AWAY' } =>
      event.type === 'GOAL' && (event.team === 'HOME' || event.team === 'AWAY'),
  );

  return goals.map((goal, index) => {
    const prev = goals[index - 1];
    const hasAssist = Boolean(prev && prev.team === goal.team && prev.player && prev.player !== goal.player && goal.minute - prev.minute <= 3);

    const item: {
      minute: number;
      team: 'HOME' | 'AWAY';
      scorer: string;
      assist?: string;
      zone?: Zone;
      chanceQuality: number;
    } = {
      minute: goal.minute,
      team: goal.team,
      scorer: goal.player ?? 'Unknown',
      chanceQuality: goal.message.includes('left') || goal.message.includes('right') ? 0.58 : 0.64,
    };

    if (hasAssist && prev?.player) {
      item.assist = prev.player;
    }

    if (goal.zone) {
      item.zone = goal.zone;
    }

    return item;
  });
}

function buildPlayerRatings(homeTeam: TeamInput, awayTeam: TeamInput, events: MatchEvent[]): PlayerMatchRating[] {
  const ratings = new Map<string, PlayerMatchRating>();

  addTeamRatingEntries(ratings, homeTeam, 'HOME');
  addTeamRatingEntries(ratings, awayTeam, 'AWAY');

  const goals = buildGoalSummary(events);

  for (const goal of goals) {
    const scorerEntry = findByName(ratings, goal.scorer, goal.team);
    if (scorerEntry) {
      scorerEntry.rating += 0.7;
      scorerEntry.stats.goals += 1;
      scorerEntry.ratingReasons.push('Scored a goal');
    }

    if (goal.assist) {
      const assistEntry = findByName(ratings, goal.assist, goal.team);
      if (assistEntry) {
        assistEntry.rating += 0.4;
        assistEntry.stats.assists += 1;
        assistEntry.ratingReasons.push('Provided an assist');
      }
    }
  }

  for (const event of events) {
    if (!event.player || (event.team !== 'HOME' && event.team !== 'AWAY')) {
      continue;
    }

    const entry = findByName(ratings, event.player, event.team as 'HOME' | 'AWAY');
    if (!entry) {
      continue;
    }

    if (event.type === 'SHOT' && event.message.includes('forced a save')) {
      entry.rating += 0.15;
      entry.stats.shots += 1;
    }

    if (event.type === 'SHOT' && event.message.includes('missed')) {
      entry.rating -= 0.08;
      entry.stats.shots += 1;
    }

    if (event.type === 'CARD') {
      entry.rating -= 0.15;
      entry.ratingReasons.push('Received a card');
    }

    if (event.type === 'INJURY') {
      entry.rating -= 0.2;
    }
  }

  const all = [...ratings.values()].map((entry) => ({
    ...entry,
    rating: clamp(roundToTwo(entry.rating), 3, 10),
  }));

  all.sort((a, b) => b.rating - a.rating);

  return all;
}

function addTeamRatingEntries(
  map: Map<string, PlayerMatchRating>,
  team: TeamInput,
  side: 'HOME' | 'AWAY',
) {
  for (const player of team.players.filter((item) => !item.isSubstitute).slice(0, 11)) {
    let rating = 6.5;
    rating -= positionFitPenalty(player);

    let ratingReasons: string[] = [];
    if (positionFitPenalty(player) > 0) {
      ratingReasons.push('Played out of preferred position');
    }

    if (estimateStamina(player, 90, team.tacticalStyle) < 35) {
      rating -= 0.2;
      ratingReasons.push('Stamina collapsed late game');
    }

    map.set(`${side}:${player.id}`, {
      playerId: player.id,
      name: player.name,
      position: player.rolePosition,
      rating,
      minutesPlayed: 90, // simplify for now
      stats: {
        goals: 0,
        assists: 0,
        shots: 0,
        keyPasses: 0,
        tackles: 0,
        interceptions: 0,
        saves: 0,
      },
      ratingReasons,
    });
  }
}

function findByName(
  ratings: Map<string, PlayerMatchRating>,
  playerName: string,
  side: 'HOME' | 'AWAY',
): PlayerMatchRating | undefined {
  for (const [key, entry] of ratings.entries()) {
    if (key.startsWith(side + ':') && entry.name === playerName) {
      return entry;
    }
  }

  return undefined;
}

function positionFitPenalty(player: PlayerInput): number {
  const role = player.rolePosition.toUpperCase();
  const natural = player.naturalPosition.toUpperCase();
  const preferred = (player.preferredPositions ?? []).map((item) => item.toUpperCase());

  if (role === natural || preferred.includes(role)) {
    return 0;
  }

  if (roleBand(role) === roleBand(natural)) {
    return 0.2;
  }

  return 0.5;
}

function roleBand(role: string): 'DEF' | 'MID' | 'ATT' | 'GK' {
  if (role === 'GK') {
    return 'GK';
  }

  if (['CB', 'LCB', 'RCB', 'LB', 'RB', 'LWB', 'RWB'].includes(role)) {
    return 'DEF';
  }

  if (['CDM', 'CM', 'LCM', 'RCM', 'CAM', 'LM', 'RM'].includes(role)) {
    return 'MID';
  }

  return 'ATT';
}

function roleToZone(rolePosition: string): Zone {
  const role = rolePosition.toUpperCase();
  if (role.startsWith('L')) {
    return 'left';
  }

  if (role.startsWith('R')) {
    return 'right';
  }

  return 'center';
}

function estimateStamina(player: PlayerInput, minute: number, style: TacticalStyle): number {
  const styleMultiplier = style === 'HIGH_PRESS' ? 1.85 : style === 'POSSESSION' ? 1.25 : style === 'LOW_BLOCK' ? 0.85 : 1;
  const roleMultiplier = roleBand(player.rolePosition.toUpperCase()) === 'ATT' ? 1.12 : roleBand(player.rolePosition.toUpperCase()) === 'MID' ? 1.08 : 1.02;
  const drain = minute * 0.42 * styleMultiplier * roleMultiplier;
  return clamp(round(player.stamina - drain), 12, 100);
}

function workRateFactor(rate: 'LOW' | 'MEDIUM' | 'HIGH'): number {
  if (rate === 'HIGH') {
    return 1.08;
  }

  if (rate === 'LOW') {
    return 0.84;
  }

  return 1;
}

function weightedAverage(values: number[], fallback: number): number {
  if (!values.length) {
    return fallback;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildFallbackOpponent(): TeamInput {
  const players: PlayerInput[] = [
    makePlayer('opp-gk', 'R. Holt', 'GK', 'GK', 42, 25, 55, 40, 84, 78, 'LOW', 'HIGH'),
    makePlayer('opp-lb', 'M. Grant', 'LB', 'LB', 74, 40, 68, 66, 74, 71, 'MEDIUM', 'HIGH'),
    makePlayer('opp-lcb', 'J. Pierce', 'CB', 'LCB', 62, 38, 63, 55, 80, 82, 'LOW', 'HIGH'),
    makePlayer('opp-rcb', 'A. Stone', 'CB', 'RCB', 64, 36, 62, 54, 81, 83, 'LOW', 'HIGH'),
    makePlayer('opp-rb', 'K. Doyle', 'RB', 'RB', 76, 42, 70, 68, 75, 72, 'MEDIUM', 'MEDIUM'),
    makePlayer('opp-cdm', 'F. Wade', 'CDM', 'CDM', 67, 58, 78, 70, 79, 79, 'MEDIUM', 'HIGH'),
    makePlayer('opp-lcm', 'E. North', 'CM', 'LCM', 71, 63, 80, 78, 71, 74, 'MEDIUM', 'MEDIUM'),
    makePlayer('opp-rcm', 'T. Quinn', 'CM', 'RCM', 73, 64, 79, 77, 70, 73, 'MEDIUM', 'MEDIUM'),
    makePlayer('opp-lw', 'D. Vega', 'LW', 'LW', 84, 76, 74, 82, 52, 66, 'HIGH', 'LOW'),
    makePlayer('opp-st', 'S. Knight', 'ST', 'ST', 82, 81, 69, 78, 45, 74, 'HIGH', 'LOW'),
    makePlayer('opp-rw', 'L. Archer', 'RW', 'RW', 83, 77, 73, 81, 50, 64, 'HIGH', 'LOW'),
  ];

  return {
    name: 'Riverdale FC',
    formation: '4-3-3',
    tacticalStyle: 'BALANCED',
    players,
  };
}

function makePlayer(
  id: string,
  name: string,
  naturalPosition: string,
  rolePosition: string,
  pac: number,
  sho: number,
  pas: number,
  dri: number,
  def: number,
  phy: number,
  attackWorkRate: 'LOW' | 'MEDIUM' | 'HIGH',
  defenseWorkRate: 'LOW' | 'MEDIUM' | 'HIGH',
): PlayerInput {
  return {
    id,
    name,
    naturalPosition,
    rolePosition,
    preferredPositions: [naturalPosition],
    pac,
    sho,
    pas,
    dri,
    def,
    phy,
    stamina: 100,
    attackWorkRate,
    defenseWorkRate,
  };
}

function cloneTeam(team: TeamInput): TeamInput {
  return JSON.parse(JSON.stringify(team)) as TeamInput;
}

function round(value: number): number {
  return Math.round(value);
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildPlayerPauseStates(
  team: TeamInput,
  simulation: SimulationResult,
  events: MatchEvent[],
  minute: number,
): PlayerPauseState[] {
  const staminaSnapshot = simulation.playerStaminaSnapshot;
  if (!staminaSnapshot || staminaSnapshot.length === 0) {
    return [];
  }

  const staminaMap = new Map(staminaSnapshot.map((e) => [e.playerId, e.stamina]));
  const starters = team.players.filter((p) => !p.isSubstitute).slice(0, 11);

  return starters.map((player) => {
    const stamina = staminaMap.get(player.id) ?? estimateStamina(player, minute, team.tacticalStyle);
    const staminaRound = Math.round(stamina);

    // Interim rating
    let rating = 6.5;
    rating -= positionFitPenalty(player);

    // Boost/penalty from events
    for (const event of events) {
      if (!event.player || event.team !== 'HOME') continue;
      if (event.player !== player.name) continue;
      if (event.type === 'GOAL') rating += 0.7;
      if (event.type === 'SHOT' && event.message.includes('forced a save')) rating += 0.15;
      if (event.type === 'SHOT' && event.message.includes('missed')) rating -= 0.08;
      if (event.type === 'CARD') rating -= 0.15;
      if (event.type === 'INJURY') rating -= 0.2;
    }

    // Stamina penalty on rating
    if (staminaRound < 35) rating -= 0.3;
    else if (staminaRound < 50) rating -= 0.1;

    rating = clamp(Math.round(rating * 10) / 10, 3, 10);

    // Status classification
    const status: PlayerPauseState['status'] =
      staminaRound >= 70 ? 'FRESH' :
      staminaRound >= 50 ? 'OK' :
      staminaRound >= 35 ? 'TIRED' :
      'CRITICAL';

    // Reasons
    const reasons: string[] = [];
    if (status === 'CRITICAL') reasons.push(`Stamina critically low (${staminaRound}%)`);
    else if (status === 'TIRED') reasons.push(`Stamina dropping (${staminaRound}%)`);

    if (positionFitPenalty(player) > 0) reasons.push('Playing out of position');

    const playerGoals = events.filter((e) => e.type === 'GOAL' && e.team === 'HOME' && e.player === player.name).length;
    if (playerGoals > 0) reasons.push(`Scored ${playerGoals} goal${playerGoals > 1 ? 's' : ''}`);

    const playerCards = events.filter((e) => e.type === 'CARD' && e.team === 'HOME' && e.player === player.name).length;
    if (playerCards > 0) reasons.push('Received yellow card');

    if (player.attackWorkRate === 'HIGH' && player.defenseWorkRate === 'LOW') {
      reasons.push('Low defensive work rate — not tracking back');
    }

    return {
      playerId: player.id,
      name: player.name,
      position: player.rolePosition,
      rating,
      stamina: staminaRound,
      status,
      reasons,
    };
  });
}
