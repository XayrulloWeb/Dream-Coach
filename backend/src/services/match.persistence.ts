import { isDatabaseUnavailableError, prisma } from '../lib/prisma';
import {
  MatchFinalReport,
  MatchStartResponse,
  MatchStateResponse,
  MatchSubstitutionResponse,
  SimulationInput,
  SubstitutionAction,
  TacticalStyle,
} from '../types/simulation';

function isPrismaAvailable() {
  return Boolean(prisma);
}

export async function persistMatchStart(
  matchId: string,
  input: SimulationInput,
  pauseState: MatchStartResponse,
): Promise<void> {
  if (!isPrismaAvailable() || !prisma) {
    return;
  }

  const lineups = {
    team: input.team,
    opponent: input.opponent ?? null,
  };

  await prisma.match.upsert({
    where: { id: matchId },
    create: {
      id: matchId,
      status: 'PAUSED_FOR_COACH',
      seed: matchId,
      venue: input.venue ?? 'HOME',
      opponentName: input.opponent?.name ?? 'Riverdale FC',
      userScore: pauseState.score.home,
      opponentScore: pauseState.score.away,
      lineups,
      startedAt: new Date(),
    },
    update: {
      status: 'PAUSED_FOR_COACH',
      venue: input.venue ?? 'HOME',
      opponentName: input.opponent?.name ?? 'Riverdale FC',
      userScore: pauseState.score.home,
      opponentScore: pauseState.score.away,
      lineups,
    },
  });

  await prisma.matchStateSnapshot.create({
    data: {
      matchId,
      minute: pauseState.minute,
      status: 'PAUSED_FOR_COACH',
      payload: pauseState as unknown as object,
    },
  });
}

export async function persistSubstitution(
  matchId: string,
  substitutions: SubstitutionAction[],
  tacticalStyle: TacticalStyle | undefined,
  response: MatchSubstitutionResponse,
): Promise<void> {
  if (!isPrismaAvailable() || !prisma) {
    return;
  }

  if (!substitutions.length && !tacticalStyle) {
    return;
  }

  const firstSub = substitutions[0];
  if (!firstSub) {
    return;
  }

  await prisma.substitution.create({
    data: {
      matchId,
      minute: response.minute,
      teamId: 'HOME',
      playerOutId: firstSub.playerOutId,
      playerInId: firstSub.playerInId,
      oldPosition: null,
      newPosition: firstSub.newRolePosition ?? null,
      formationBefore: response.team.formation,
      formationAfter: response.team.formation,
      impactPreview: response.impactPreview as unknown as object,
    },
  });

  await prisma.match.update({
    where: { id: matchId },
    data: {
      lineups: {
        team: response.team,
      },
    },
  });
}

export async function persistMatchFinal(
  matchId: string,
  report: MatchFinalReport,
): Promise<void> {
  if (!isPrismaAvailable() || !prisma) {
    return;
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: 'FINISHED',
      userScore: report.score.home,
      opponentScore: report.score.away,
      matchStats: report as unknown as object,
      finishedAt: new Date(),
    },
  });

  await prisma.matchEvent.deleteMany({ where: { matchId } });
  await prisma.playerMatchRating.deleteMany({ where: { matchId } });

  if (report.events.length) {
    await prisma.matchEvent.createMany({
      data: report.events.map((event) => ({
        matchId,
        minute: event.minute,
        team: event.team,
        type: event.type,
        zone: event.zone ?? null,
        playerName: event.player ?? null,
        message: event.message,
      })),
    });
  }

  if (report.playerRatings.length) {
    await prisma.playerMatchRating.createMany({
      data: report.playerRatings.map((rating) => ({
        matchId,
        playerId: rating.playerId,
        playerName: rating.playerName,
        team: rating.team,
        rating: rating.rating,
        goals: rating.goals,
        assists: rating.assists,
      })),
    });
  }
}

export async function loadPersistedMatchState(matchId: string): Promise<MatchStateResponse | null> {
  if (!isPrismaAvailable() || !prisma) {
    return null;
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      snapshots: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!match) {
    return null;
  }

  if (match.status === 'FINISHED') {
    if (!match.matchStats || typeof match.matchStats !== 'object') {
      return null;
    }

    const report = match.matchStats as unknown as MatchFinalReport;
    return {
      matchId,
      status: 'FINISHED',
      minute: 90,
      report,
    };
  }

  const latestSnapshot = match.snapshots[0];
  if (!latestSnapshot || typeof latestSnapshot.payload !== 'object' || !latestSnapshot.payload) {
    return null;
  }

  const pauseState = latestSnapshot.payload as unknown as MatchStartResponse;
  return {
    matchId,
    status: 'PAUSED_FOR_COACH',
    minute: pauseState.minute,
    pauseState,
  };
}

export { isDatabaseUnavailableError };
