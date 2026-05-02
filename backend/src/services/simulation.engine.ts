import {
  MatchEvent,
  MatchIssue,
  MidMatchInsight,
  PlayerInput,
  SimulationCalibration,
  SimulationInput,
  SimulationResult,
  TacticalStyle,
  TeamInput,
  TeamRatings,
  WorkRate,
  Zone,
} from '../types/simulation';

type PlayerRuntime = PlayerInput & {
  currentStamina: number;
};

type TeamRuntime = {
  name: string;
  formation: string;
  tacticalStyle: TacticalStyle;
  players: PlayerRuntime[];
  ratings: TeamRatings;
};

type MutableMatchStats = {
  homeGoals: number;
  awayGoals: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeXg: number;
  awayXg: number;
  homeBigChances: number;
  awayBigChances: number;
  homePossessionTicks: number;
  awayPossessionTicks: number;
};

const LEFT_ROLES = new Set(['LB', 'LWB', 'LM', 'LW', 'LAM', 'LCM', 'LCB']);
const RIGHT_ROLES = new Set(['RB', 'RWB', 'RM', 'RW', 'RAM', 'RCM', 'RCB']);
const CENTER_ROLES = new Set(['GK', 'CB', 'CDM', 'CM', 'CAM', 'ST', 'CF']);
const DEFENSIVE_ROLES = new Set(['GK', 'CB', 'LCB', 'RCB', 'LB', 'RB', 'LWB', 'RWB', 'CDM']);
const MIDFIELD_ROLES = new Set(['CDM', 'CM', 'LCM', 'RCM', 'CAM', 'LAM', 'RAM', 'LM', 'RM']);
const ATTACKING_ROLES = new Set(['LW', 'RW', 'ST', 'CF', 'CAM', 'LAM', 'RAM']);

const RATING_MIN = 10;
const RATING_MAX = 99;

export function simulateMatch(
  input: SimulationInput,
  calibration?: SimulationCalibration,
): SimulationResult {
  const activeCalibration = calibration ?? {
    attackFrequencyMultiplier: 1,
    goalProbabilityMultiplier: 1,
    bigChanceMultiplier: 1,
    cardRateMultiplier: 1,
    injuryRateMultiplier: 1,
    zoneBias: {
      left: 1,
      center: 1,
      right: 1,
    },
  };

  const homeTeam = createTeamRuntime(input.team);
  const awayTeam = createTeamRuntime(input.opponent ?? createDefaultOpponent());
  const venue = input.venue ?? 'HOME';

  const stats: MutableMatchStats = {
    homeGoals: 0,
    awayGoals: 0,
    homeShots: 0,
    awayShots: 0,
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homeXg: 0,
    awayXg: 0,
    homeBigChances: 0,
    awayBigChances: 0,
    homePossessionTicks: 0,
    awayPossessionTicks: 0,
  };

  const events: MatchEvent[] = [];
  const insights: MidMatchInsight[] = [];

  for (let minute = 1; minute <= 90; minute += 1) {
    applyMinuteStaminaDrain(homeTeam, minute);
    applyMinuteStaminaDrain(awayTeam, minute);

    homeTeam.ratings = calculateTeamRatings(homeTeam);
    awayTeam.ratings = calculateTeamRatings(awayTeam);

    const homePossessionBonus = venue === 'HOME' ? 4 : venue === 'AWAY' ? -4 : 0;
    const homePossessionChance = probabilityFromDiff(
      homeTeam.ratings.control + homePossessionBonus - awayTeam.ratings.control,
    );
    const homeHasBall = Math.random() < homePossessionChance;

    if (homeHasBall) {
      stats.homePossessionTicks += 1;
    } else {
      stats.awayPossessionTicks += 1;
    }

    if (minute === 60) {
      const insight = buildMidMatchInsight(minute, homeTeam, awayTeam, stats);
      insights.push(insight);
      events.push({
        minute,
        team: 'SYSTEM',
        type: 'INSIGHT',
        message: 'AI coach generated tactical recommendations',
      });
      for (const issue of insight.issues) {
        const warning: MatchEvent = {
          minute,
          team: 'SYSTEM',
          type: 'TACTICAL_WARNING',
          message: issue.message,
        };

        const zone = issue.zone === 'MIDFIELD' ? 'center' : issue.zone;
        if (zone) {
          warning.zone = zone;
        }

        if (issue.player) {
          warning.player = issue.player;
        }

        events.push({
          ...warning,
        });
      }
    }

    const attacking = homeHasBall ? homeTeam : awayTeam;
    const defending = homeHasBall ? awayTeam : homeTeam;
    const isHomeAttacking = homeHasBall;

    const hasAttack =
      Math.random() < attackFrequency(attacking.ratings, defending.ratings, activeCalibration);
    if (!hasAttack) {
      maybeAddDisciplineEvent(minute, homeTeam, awayTeam, events, activeCalibration);
      continue;
    }

    const attackZone = pickAttackZone(attacking.ratings.attackingThreat, activeCalibration);
    const defenseZone = mirrorZone(attackZone);
    const vulnerabilityMultiplier = getVulnerabilityMultiplier(defending.ratings, defenseZone);

    const attackPower = attacking.ratings.attackingThreat[attackZone] * vulnerabilityMultiplier;
    const defensePower = defending.ratings.flankSecurity[defenseZone];

    const chanceCreated = Math.random() < probabilityFromDiff((attackPower - defensePower) / 1.2);
    if (!chanceCreated) {
      maybeAddDisciplineEvent(minute, homeTeam, awayTeam, events, activeCalibration);
      continue;
    }

    const shotQualityBoost = Math.max(0, attackPower - defensePower);
    const isBigChance =
      Math.random() < clamp((0.16 + shotQualityBoost / 180) * activeCalibration.bigChanceMultiplier, 0.08, 0.72);

    if (isHomeAttacking) {
      stats.homeShots += 1;
      if (isBigChance) {
        stats.homeBigChances += 1;
      }
    } else {
      stats.awayShots += 1;
      if (isBigChance) {
        stats.awayBigChances += 1;
      }
    }

    const shooter = pickShooter(attacking.players, attackZone);
    const goalkeeper = pickGoalkeeper(defending.players);
    const centerBlock = average(
      defending.players
        .filter((player) => roleToZone(player.rolePosition) === 'center')
        .map((player) => player.def),
      62,
    );

    const shotScore =
      shooter.sho * 0.52 +
      shooter.dri * 0.22 +
      shooter.pac * 0.14 +
      shooter.pas * 0.06 +
      randomBetween(-8, 12) +
      (isBigChance ? 8 : 0);

    const saveScore =
      goalkeeper.def * 0.4 +
      goalkeeper.phy * 0.16 +
      centerBlock * 0.34 +
      randomBetween(-6, 10);

    const xgIncrement = clamp(0.05 + (shotScore - saveScore + 35) / 130, 0.03, isBigChance ? 0.57 : 0.39);

    if (isHomeAttacking) {
      stats.homeXg += xgIncrement;
    } else {
      stats.awayXg += xgIncrement;
    }

    const onTarget = Math.random() < probabilityFromDiff((shotScore - saveScore) / 1.4);
    if (onTarget) {
      if (isHomeAttacking) {
        stats.homeShotsOnTarget += 1;
      } else {
        stats.awayShotsOnTarget += 1;
      }
    }

    const goalProbability = clamp(
      probabilityFromDiff((shotScore - saveScore) / 1.1) *
        (isBigChance ? 1.12 : 0.94) *
        activeCalibration.goalProbabilityMultiplier,
      0.05,
      0.92,
    );
    const isGoal = onTarget && Math.random() < goalProbability;

    if (isGoal) {
      if (isHomeAttacking) {
        stats.homeGoals += 1;
      } else {
        stats.awayGoals += 1;
      }

      events.push({
        minute,
        team: isHomeAttacking ? 'HOME' : 'AWAY',
        type: 'GOAL',
        zone: attackZone,
        player: shooter.name,
        message: `${shooter.name} scored from ${describeZone(attackZone)} side`,
      });
    } else {
      events.push({
        minute,
        team: isHomeAttacking ? 'HOME' : 'AWAY',
        type: 'SHOT',
        zone: attackZone,
        player: shooter.name,
        message: onTarget
          ? `${shooter.name} forced a save`
          : `${shooter.name} missed the target`,
      });
    }

    maybeAddDisciplineEvent(minute, homeTeam, awayTeam, events, activeCalibration);

  }

  const possessionTotal = Math.max(1, stats.homePossessionTicks + stats.awayPossessionTicks);
  const homePossession = Math.round((stats.homePossessionTicks / possessionTotal) * 100);
  const awayPossession = 100 - homePossession;

  return {
    score: {
      home: stats.homeGoals,
      away: stats.awayGoals,
    },
    stats: {
      home: {
        possession: homePossession,
        shots: stats.homeShots,
        shotsOnTarget: stats.homeShotsOnTarget,
        xg: roundToTwo(stats.homeXg),
        bigChances: stats.homeBigChances,
      },
      away: {
        possession: awayPossession,
        shots: stats.awayShots,
        shotsOnTarget: stats.awayShotsOnTarget,
        xg: roundToTwo(stats.awayXg),
        bigChances: stats.awayBigChances,
      },
    },
    ratings: {
      home: homeTeam.ratings,
      away: awayTeam.ratings,
    },
    insights,
    events,
  };
}

function createTeamRuntime(team: TeamInput): TeamRuntime {
  const starters = team.players.filter((player) => !player.isSubstitute).slice(0, 11);
  const effectivePlayers = (starters.length ? starters : team.players).map((player) => ({
    ...player,
    rolePosition: player.rolePosition.toUpperCase(),
    naturalPosition: player.naturalPosition.toUpperCase(),
    preferredPositions: (player.preferredPositions ?? []).map((value) => value.toUpperCase()),
    currentStamina: clamp(player.stamina, 20, 100),
  }));

  const runtime: TeamRuntime = {
    name: team.name,
    formation: team.formation,
    tacticalStyle: team.tacticalStyle,
    players: effectivePlayers,
    ratings: {
      control: 50,
      chanceCreation: 50,
      defensiveWall: 50,
      transitionDefense: 50,
      pressingPower: 50,
      flankSecurity: { left: 50, center: 50, right: 50 },
      attackingThreat: { left: 50, center: 50, right: 50 },
      vulnerabilities: [],
    },
  };

  runtime.ratings = calculateTeamRatings(runtime);
  return runtime;
}

function calculateTeamRatings(team: TeamRuntime): TeamRatings {
  const attackEntries: Array<[number, number]> = [];
  const defenseEntries: Array<[number, number]> = [];
  const controlEntries: Array<[number, number]> = [];
  const pressingEntries: Array<[number, number]> = [];

  const flankSecurity: Record<Zone, number[]> = { left: [], center: [], right: [] };
  const attackingThreat: Record<Zone, number[]> = { left: [], center: [], right: [] };

  let lowDefAttackersCount = 0;

  for (const player of team.players) {
    const staminaFactor = staminaModifier(player.currentStamina);
    const fit = positionFit(player);
    const attackWork = workRateFactor(player.attackWorkRate);
    const defenseWork = workRateFactor(player.defenseWorkRate);

    const attackValue =
      (player.pac * 0.22 + player.dri * 0.24 + player.sho * 0.26 + player.pas * 0.18 + player.phy * 0.1) *
      fit *
      staminaFactor *
      attackWork;

    const defenseValue =
      (player.def * 0.46 + player.phy * 0.18 + player.pac * 0.12 + player.pas * 0.1 + player.dri * 0.08 + player.sho * 0.06) *
      fit *
      staminaFactor *
      defenseWork;

    const controlValue =
      (player.pas * 0.46 + player.dri * 0.2 + player.phy * 0.14 + player.pac * 0.08 + player.def * 0.06 + player.sho * 0.06) *
      fit *
      staminaFactor;

    const role = player.rolePosition;
    const zone = roleToZone(role);
    const isAttackingRole = ATTACKING_ROLES.has(role);
    const isDefensiveRole = DEFENSIVE_ROLES.has(role);
    const isMidRole = MIDFIELD_ROLES.has(role);

    attackEntries.push([attackValue, roleAttackWeight(role)]);
    defenseEntries.push([defenseValue, roleDefenseWeight(role)]);
    controlEntries.push([controlValue, roleControlWeight(role)]);
    pressingEntries.push([((player.def + player.phy + player.pac) / 3) * defenseWork, rolePressingWeight(role)]);

    if (isDefensiveRole || isMidRole) {
      flankSecurity[zone].push(defenseValue);
    }

    if (isAttackingRole || isMidRole) {
      attackingThreat[zone].push(attackValue);
    }

    if (isAttackingRole && player.defenseWorkRate === 'LOW') {
      lowDefAttackersCount += 1;
    }
  }

  let control = clamp(weightedAverage(controlEntries, 50), RATING_MIN, RATING_MAX);
  let chanceCreation = clamp(weightedAverage(attackEntries, 50), RATING_MIN, RATING_MAX);
  let defensiveWall = clamp(weightedAverage(defenseEntries, 50), RATING_MIN, RATING_MAX);
  let pressingPower = clamp(weightedAverage(pressingEntries, 50), RATING_MIN, RATING_MAX);

  let transitionDefense = clamp(
    defensiveWall * 0.62 +
      weightedAverage(
        team.players.map((player) => [
          (player.def + player.pac + player.phy) / 3 * workRateFactor(player.defenseWorkRate),
          MIDFIELD_ROLES.has(player.rolePosition) ? 1.1 : 1,
        ]),
        50,
      ) *
        0.38,
    RATING_MIN,
    RATING_MAX,
  );

  const zonalSecurity: Record<Zone, number> = {
    left: clamp(average(flankSecurity.left, defensiveWall), RATING_MIN, RATING_MAX),
    center: clamp(average(flankSecurity.center, defensiveWall), RATING_MIN, RATING_MAX),
    right: clamp(average(flankSecurity.right, defensiveWall), RATING_MIN, RATING_MAX),
  };

  const zonalThreat: Record<Zone, number> = {
    left: clamp(average(attackingThreat.left, chanceCreation), RATING_MIN, RATING_MAX),
    center: clamp(average(attackingThreat.center, chanceCreation), RATING_MIN, RATING_MAX),
    right: clamp(average(attackingThreat.right, chanceCreation), RATING_MIN, RATING_MAX),
  };

  const defensePenalty = clamp(1 - lowDefAttackersCount * 0.08, 0.6, 1);
  defensiveWall = clamp(defensiveWall * defensePenalty, RATING_MIN, RATING_MAX);
  transitionDefense = clamp(transitionDefense * clamp(1 - lowDefAttackersCount * 0.07, 0.62, 1), RATING_MIN, RATING_MAX);

  applyTacticalStyle(team.tacticalStyle, {
    control: (value) => {
      control = clamp(value, RATING_MIN, RATING_MAX);
    },
    chanceCreation: (value) => {
      chanceCreation = clamp(value, RATING_MIN, RATING_MAX);
    },
    defensiveWall: (value) => {
      defensiveWall = clamp(value, RATING_MIN, RATING_MAX);
    },
    transitionDefense: (value) => {
      transitionDefense = clamp(value, RATING_MIN, RATING_MAX);
    },
    pressingPower: (value) => {
      pressingPower = clamp(value, RATING_MIN, RATING_MAX);
    },
  }, {
    control,
    chanceCreation,
    defensiveWall,
    transitionDefense,
    pressingPower,
  });

  const vulnerabilities: string[] = [];

  const leftExposure = detectFlankExposure(team.players, 'left', zonalSecurity.left);
  const rightExposure = detectFlankExposure(team.players, 'right', zonalSecurity.right);

  if (leftExposure) {
    vulnerabilities.push('LEFT_FLANK_EXPOSED');
    zonalSecurity.left = clamp(zonalSecurity.left * 0.75, RATING_MIN, RATING_MAX);
  }

  if (rightExposure) {
    vulnerabilities.push('RIGHT_FLANK_EXPOSED');
    zonalSecurity.right = clamp(zonalSecurity.right * 0.75, RATING_MIN, RATING_MAX);
  }

  const midfielders = team.players.filter((player) => MIDFIELD_ROLES.has(player.rolePosition)).length;
  if (midfielders < 3) {
    vulnerabilities.push('MIDFIELD_OVERLOADED');
    zonalSecurity.center = clamp(zonalSecurity.center * 0.88, RATING_MIN, RATING_MAX);
    control = clamp(control * 0.92, RATING_MIN, RATING_MAX);
  }

  if (transitionDefense < 55 && chanceCreation > 72) {
    vulnerabilities.push('TRANSITION_WEAK');
  }

  return {
    control: Math.round(control),
    chanceCreation: Math.round(chanceCreation),
    defensiveWall: Math.round(defensiveWall),
    transitionDefense: Math.round(transitionDefense),
    pressingPower: Math.round(pressingPower),
    flankSecurity: {
      left: Math.round(zonalSecurity.left),
      center: Math.round(zonalSecurity.center),
      right: Math.round(zonalSecurity.right),
    },
    attackingThreat: {
      left: Math.round(zonalThreat.left),
      center: Math.round(zonalThreat.center),
      right: Math.round(zonalThreat.right),
    },
    vulnerabilities,
  };
}

function buildMidMatchInsight(
  minute: number,
  home: TeamRuntime,
  away: TeamRuntime,
  stats: MutableMatchStats,
): MidMatchInsight {
  const issues: MatchIssue[] = [];

  const criticalStaminaPlayers = home.players
    .filter((player) => player.currentStamina < 35)
    .sort((a, b) => a.currentStamina - b.currentStamina)
    .slice(0, 2);

  for (const player of criticalStaminaPlayers) {
    issues.push({
      type: 'STAMINA_CRITICAL',
      severity: 'HIGH',
      player: player.name,
      zone: roleToZone(player.rolePosition),
      message: `${player.name} stamina is ${Math.round(player.currentStamina)}%. Performance dropped sharply.`,
      suggestedActions: ['Make a substitution in this zone', 'Reduce pressing intensity'],
    });
  }

  if (home.ratings.vulnerabilities.includes('LEFT_FLANK_EXPOSED')) {
    issues.push({
      type: 'TACTICAL_VULNERABILITY',
      severity: 'HIGH',
      zone: 'left',
      message: 'Left flank is exposed. Opponent has a direct route behind your wide defender.',
      suggestedActions: ['Add a defensive winger', 'Lower defensive line'],
    });
  }

  if (home.ratings.vulnerabilities.includes('RIGHT_FLANK_EXPOSED')) {
    issues.push({
      type: 'TACTICAL_VULNERABILITY',
      severity: 'MEDIUM',
      zone: 'right',
      message: 'Right flank balance is unstable during transitions.',
      suggestedActions: ['Use a safer fullback role', 'Reduce attack width'],
    });
  }

  const totalPossessionTicks = Math.max(1, stats.homePossessionTicks + stats.awayPossessionTicks);
  const homePossession = (stats.homePossessionTicks / totalPossessionTicks) * 100;
  if (homePossession < 42 || home.ratings.control + 5 < away.ratings.control) {
    issues.push({
      type: 'MIDFIELD_LOSS',
      severity: 'MEDIUM',
      zone: 'MIDFIELD',
      message: `Opponent is controlling midfield (${Math.round(100 - homePossession)}% possession share).`,
      suggestedActions: ['Introduce an extra midfielder', 'Switch to a lower-risk buildup'],
    });
  }

  if (home.ratings.transitionDefense < 55) {
    issues.push({
      type: 'TRANSITION_ALERT',
      severity: 'MEDIUM',
      zone: 'center',
      message: 'Transition defense is weak. Counter attacks can break your shape.',
      suggestedActions: ['Add a defensive midfielder', 'Reduce forward runs from fullbacks'],
    });
  }

  const filteredIssues = issues.slice(0, 4);

  return {
    minute,
    score: `${stats.homeGoals}-${stats.awayGoals}`,
    issues: filteredIssues,
  };
}

function applyMinuteStaminaDrain(team: TeamRuntime, minute: number) {
  const styleMultiplier = styleStaminaMultiplier(team.tacticalStyle);
  const lateGamePenalty = minute >= 70 ? 1.15 : minute >= 55 ? 1.05 : 1;

  for (const player of team.players) {
    const roleLoad = ATTACKING_ROLES.has(player.rolePosition)
      ? 1.12
      : MIDFIELD_ROLES.has(player.rolePosition)
      ? 1.08
      : DEFENSIVE_ROLES.has(player.rolePosition)
      ? 1.02
      : 1;

    const drain = 0.42 * styleMultiplier * roleLoad * lateGamePenalty;
    player.currentStamina = clamp(player.currentStamina - drain, 12, 100);
  }
}

function maybeAddDisciplineEvent(
  minute: number,
  home: TeamRuntime,
  away: TeamRuntime,
  events: MatchEvent[],
  calibration: SimulationCalibration,
) {
  const cardChanceHome = (0.006 + (home.ratings.pressingPower > 74 ? 0.004 : 0)) * calibration.cardRateMultiplier;
  const cardChanceAway = (0.006 + (away.ratings.pressingPower > 74 ? 0.004 : 0)) * calibration.cardRateMultiplier;

  if (Math.random() < cardChanceHome) {
    const player = pickAnyOutfieldPlayer(home.players);
    events.push({
      minute,
      team: 'HOME',
      type: 'CARD',
      player: player.name,
      message: `${player.name} received a yellow card`,
    });
  }

  if (Math.random() < cardChanceAway) {
    const player = pickAnyOutfieldPlayer(away.players);
    events.push({
      minute,
      team: 'AWAY',
      type: 'CARD',
      player: player.name,
      message: `${player.name} received a yellow card`,
    });
  }

  const injuryRiskHome =
    (home.players.some((player) => player.currentStamina < 30) ? 0.0045 : 0.0015) *
    calibration.injuryRateMultiplier;
  if (Math.random() < injuryRiskHome) {
    const player = pickLowestStaminaPlayer(home.players);
    events.push({
      minute,
      team: 'HOME',
      type: 'INJURY',
      player: player.name,
      zone: roleToZone(player.rolePosition),
      message: `${player.name} looks injured and may need substitution`,
    });
  }
}

function getVulnerabilityMultiplier(ratings: TeamRatings, defendingZone: Zone): number {
  if (defendingZone === 'left' && ratings.vulnerabilities.includes('LEFT_FLANK_EXPOSED')) {
    return 1.5;
  }

  if (defendingZone === 'right' && ratings.vulnerabilities.includes('RIGHT_FLANK_EXPOSED')) {
    return 1.5;
  }

  if (defendingZone === 'center' && ratings.vulnerabilities.includes('MIDFIELD_OVERLOADED')) {
    return 1.35;
  }

  return 1;
}

function detectFlankExposure(players: PlayerRuntime[], zone: 'left' | 'right', zoneSecurity: number): boolean {
  const sidePlayers = players.filter((player) => roleToZone(player.rolePosition) === zone);
  if (sidePlayers.length < 2) {
    return false;
  }

  const attackWorkAverage = average(sidePlayers.map((player) => workRateFactor(player.attackWorkRate)), 1);
  const defenseWorkAverage = average(sidePlayers.map((player) => workRateFactor(player.defenseWorkRate)), 1);

  return attackWorkAverage >= 1.03 && defenseWorkAverage <= 0.94 && zoneSecurity < 68;
}

function pickShooter(players: PlayerRuntime[], zone: Zone): PlayerRuntime {
  const candidates = players.filter(
    (player) => roleToZone(player.rolePosition) === zone || ATTACKING_ROLES.has(player.rolePosition),
  );
  const pool = candidates.length ? candidates : players;

  let best = firstOrThrow(pool, 'No players available for shooter selection');
  let bestScore = -1;
  for (const player of pool) {
    const score = player.sho * 0.55 + player.pac * 0.2 + player.dri * 0.18 + randomBetween(0, 10);
    if (score > bestScore) {
      best = player;
      bestScore = score;
    }
  }
  return best;
}

function pickGoalkeeper(players: PlayerRuntime[]): PlayerRuntime {
  const explicitKeeper = players.find((player) => player.rolePosition === 'GK');
  if (explicitKeeper) {
    return explicitKeeper;
  }

  const fallback = firstOrThrow(players, 'No players available for goalkeeper selection');
  return players.reduce((best, current) => {
    const bestScore = best.def * 0.7 + best.phy * 0.3;
    const currentScore = current.def * 0.7 + current.phy * 0.3;
    return currentScore > bestScore ? current : best;
  }, fallback);
}

function pickAnyOutfieldPlayer(players: PlayerRuntime[]): PlayerRuntime {
  const outfield = players.filter((player) => player.rolePosition !== 'GK');
  if (!outfield.length) {
    return firstOrThrow(players, 'No players available for discipline event');
  }

  return (
    outfield[Math.floor(Math.random() * outfield.length)] ??
    firstOrThrow(outfield, 'No outfield players available for discipline event')
  );
}

function pickLowestStaminaPlayer(players: PlayerRuntime[]): PlayerRuntime {
  const fallback = firstOrThrow(players, 'No players available for injury event');
  return players.reduce((lowest, current) =>
    current.currentStamina < lowest.currentStamina ? current : lowest,
  fallback);
}

function attackFrequency(
  attacker: TeamRatings,
  defender: TeamRatings,
  calibration: SimulationCalibration,
): number {
  return clamp(
    (0.09 + attacker.chanceCreation / 190 + attacker.pressingPower / 560 - defender.defensiveWall / 430) *
      calibration.attackFrequencyMultiplier,
    0.08,
    0.42,
  );
}

function pickAttackZone(
  threat: Record<Zone, number>,
  calibration: SimulationCalibration,
): Zone {
  const left = Math.max(1, threat.left * calibration.zoneBias.left);
  const center = Math.max(1, threat.center * calibration.zoneBias.center);
  const right = Math.max(1, threat.right * calibration.zoneBias.right);
  const total = left + center + right;
  const roll = Math.random() * total;

  if (roll < left) {
    return 'left';
  }

  if (roll < left + center) {
    return 'center';
  }

  return 'right';
}

function mirrorZone(zone: Zone): Zone {
  if (zone === 'left') {
    return 'right';
  }

  if (zone === 'right') {
    return 'left';
  }

  return 'center';
}

function roleToZone(rolePosition: string): Zone {
  const role = rolePosition.toUpperCase();
  if (LEFT_ROLES.has(role) || role.startsWith('L')) {
    return 'left';
  }

  if (RIGHT_ROLES.has(role) || role.startsWith('R')) {
    return 'right';
  }

  if (CENTER_ROLES.has(role)) {
    return 'center';
  }

  return 'center';
}

function roleAttackWeight(rolePosition: string): number {
  const role = rolePosition.toUpperCase();
  if (ATTACKING_ROLES.has(role)) {
    return 1.25;
  }

  if (MIDFIELD_ROLES.has(role)) {
    return 1;
  }

  if (role === 'GK') {
    return 0.1;
  }

  return 0.58;
}

function roleDefenseWeight(rolePosition: string): number {
  const role = rolePosition.toUpperCase();
  if (DEFENSIVE_ROLES.has(role)) {
    return 1.25;
  }

  if (MIDFIELD_ROLES.has(role)) {
    return 0.96;
  }

  if (ATTACKING_ROLES.has(role)) {
    return 0.52;
  }

  return 0.8;
}

function roleControlWeight(rolePosition: string): number {
  const role = rolePosition.toUpperCase();
  if (MIDFIELD_ROLES.has(role)) {
    return 1.3;
  }

  if (ATTACKING_ROLES.has(role)) {
    return 0.9;
  }

  if (DEFENSIVE_ROLES.has(role)) {
    return 0.82;
  }

  return 0.85;
}

function rolePressingWeight(rolePosition: string): number {
  const role = rolePosition.toUpperCase();
  if (MIDFIELD_ROLES.has(role) || ATTACKING_ROLES.has(role)) {
    return 1.15;
  }

  if (role === 'GK') {
    return 0.3;
  }

  return 1;
}

function positionFit(player: PlayerRuntime): number {
  const role = player.rolePosition;
  const natural = player.naturalPosition;
  const preferred = player.preferredPositions ?? [];

  if (role === natural || preferred.includes(role)) {
    return 1;
  }

  const roleBandValue = roleBand(role);
  const naturalBandValue = roleBand(natural);

  if (roleBandValue === naturalBandValue) {
    return 0.82;
  }

  if (
    (roleBandValue === 'DEF' && naturalBandValue === 'MID') ||
    (roleBandValue === 'MID' && naturalBandValue === 'DEF') ||
    (roleBandValue === 'MID' && naturalBandValue === 'ATT') ||
    (roleBandValue === 'ATT' && naturalBandValue === 'MID')
  ) {
    return 0.68;
  }

  return 0.55;
}

function roleBand(rolePosition: string): 'GK' | 'DEF' | 'MID' | 'ATT' {
  const role = rolePosition.toUpperCase();
  if (role === 'GK') {
    return 'GK';
  }

  if (DEFENSIVE_ROLES.has(role)) {
    return 'DEF';
  }

  if (MIDFIELD_ROLES.has(role)) {
    return 'MID';
  }

  return 'ATT';
}

function staminaModifier(stamina: number): number {
  if (stamina >= 70) {
    return 1;
  }

  if (stamina >= 50) {
    return 0.95 - ((70 - stamina) / 20) * 0.05;
  }

  if (stamina >= 35) {
    return 0.8 + ((stamina - 35) / 15) * 0.15;
  }

  return clamp(0.65 + (stamina / 35) * 0.15, 0.6, 0.8);
}

function workRateFactor(workRate: WorkRate): number {
  if (workRate === 'HIGH') {
    return 1.08;
  }

  if (workRate === 'LOW') {
    return 0.84;
  }

  return 1;
}

function styleStaminaMultiplier(style: TacticalStyle): number {
  switch (style) {
    case 'HIGH_PRESS':
      return 1.9;
    case 'POSSESSION':
      return 1.28;
    case 'COUNTER':
      return 1.08;
    case 'LOW_BLOCK':
      return 0.86;
    default:
      return 1;
  }
}

function applyTacticalStyle(
  style: TacticalStyle,
  setters: {
    control: (value: number) => void;
    chanceCreation: (value: number) => void;
    defensiveWall: (value: number) => void;
    transitionDefense: (value: number) => void;
    pressingPower: (value: number) => void;
  },
  values: {
    control: number;
    chanceCreation: number;
    defensiveWall: number;
    transitionDefense: number;
    pressingPower: number;
  },
) {
  switch (style) {
    case 'HIGH_PRESS':
      setters.control(values.control + 3);
      setters.chanceCreation(values.chanceCreation + 7);
      setters.defensiveWall(values.defensiveWall - 4);
      setters.transitionDefense(values.transitionDefense - 8);
      setters.pressingPower(values.pressingPower + 12);
      break;
    case 'COUNTER':
      setters.control(values.control - 8);
      setters.chanceCreation(values.chanceCreation + 6);
      setters.defensiveWall(values.defensiveWall + 3);
      setters.transitionDefense(values.transitionDefense + 10);
      setters.pressingPower(values.pressingPower - 2);
      break;
    case 'POSSESSION':
      setters.control(values.control + 12);
      setters.chanceCreation(values.chanceCreation + 2);
      setters.defensiveWall(values.defensiveWall - 2);
      setters.transitionDefense(values.transitionDefense - 4);
      setters.pressingPower(values.pressingPower + 2);
      break;
    case 'LOW_BLOCK':
      setters.control(values.control - 12);
      setters.chanceCreation(values.chanceCreation - 5);
      setters.defensiveWall(values.defensiveWall + 10);
      setters.transitionDefense(values.transitionDefense + 12);
      setters.pressingPower(values.pressingPower - 10);
      break;
    default:
      break;
  }
}

function probabilityFromDiff(diff: number): number {
  return 1 / (1 + Math.exp(-diff / 15));
}

function weightedAverage(values: Array<[number, number]>, fallback: number): number {
  if (!values.length) {
    return fallback;
  }

  let weightedSum = 0;
  let weightSum = 0;
  for (const [value, weight] of values) {
    weightedSum += value * weight;
    weightSum += weight;
  }

  if (weightSum === 0) {
    return fallback;
  }

  return weightedSum / weightSum;
}

function average(values: number[], fallback: number): number {
  if (!values.length) {
    return fallback;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function describeZone(zone: Zone): string {
  if (zone === 'left') {
    return 'left';
  }

  if (zone === 'right') {
    return 'right';
  }

  return 'central';
}

function firstOrThrow(players: PlayerRuntime[], message: string): PlayerRuntime {
  const first = players[0];
  if (!first) {
    throw new Error(message);
  }
  return first;
}

function createDefaultOpponent(): TeamInput {
  const basePlayers: PlayerInput[] = [
    makeDefaultPlayer('gk-1', 'R. Holt', 'GK', 'GK', 42, 25, 55, 40, 84, 78, 'LOW', 'HIGH'),
    makeDefaultPlayer('lb-1', 'M. Grant', 'LB', 'LB', 74, 40, 68, 66, 74, 71, 'MEDIUM', 'HIGH'),
    makeDefaultPlayer('lcb-1', 'J. Pierce', 'CB', 'LCB', 62, 38, 63, 55, 80, 82, 'LOW', 'HIGH'),
    makeDefaultPlayer('rcb-1', 'A. Stone', 'CB', 'RCB', 64, 36, 62, 54, 81, 83, 'LOW', 'HIGH'),
    makeDefaultPlayer('rb-1', 'K. Doyle', 'RB', 'RB', 76, 42, 70, 68, 75, 72, 'MEDIUM', 'MEDIUM'),
    makeDefaultPlayer('cdm-1', 'F. Wade', 'CDM', 'CDM', 67, 58, 78, 70, 79, 79, 'MEDIUM', 'HIGH'),
    makeDefaultPlayer('lcm-1', 'E. North', 'CM', 'LCM', 71, 63, 80, 78, 71, 74, 'MEDIUM', 'MEDIUM'),
    makeDefaultPlayer('rcm-1', 'T. Quinn', 'CM', 'RCM', 73, 64, 79, 77, 70, 73, 'MEDIUM', 'MEDIUM'),
    makeDefaultPlayer('lw-1', 'D. Vega', 'LW', 'LW', 84, 76, 74, 82, 52, 66, 'HIGH', 'LOW'),
    makeDefaultPlayer('st-1', 'S. Knight', 'ST', 'ST', 82, 81, 69, 78, 45, 74, 'HIGH', 'LOW'),
    makeDefaultPlayer('rw-1', 'L. Archer', 'RW', 'RW', 83, 77, 73, 81, 50, 64, 'HIGH', 'LOW'),
  ];

  return {
    name: 'Riverdale FC',
    formation: '4-3-3',
    tacticalStyle: 'BALANCED',
    players: basePlayers,
  };
}

function makeDefaultPlayer(
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
  attackWorkRate: WorkRate,
  defenseWorkRate: WorkRate,
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
