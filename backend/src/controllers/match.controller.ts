import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { getActiveCalibration } from '../services/calibration.service';
import { simulateMatch } from '../services/simulation.engine';
import {
  applyStatefulSubstitutions,
  getStatefulMatchState,
  resumeStatefulMatch,
  startStatefulMatch,
} from '../services/match.session';
import { PlayerInput, SimulationInput, SubstitutionAction, TacticalStyle, TeamInput, WorkRate } from '../types/simulation';
import { prisma } from '../lib/prisma';

const TACTICAL_STYLES: TacticalStyle[] = [
  'BALANCED',
  'HIGH_PRESS',
  'COUNTER',
  'POSSESSION',
  'LOW_BLOCK',
];

const WORK_RATES: WorkRate[] = ['LOW', 'MEDIUM', 'HIGH'];

export const simulate = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({
        code: 'SIM_VALIDATION_ERROR',
        message: 'Request body is required',
      });
      return;
    }

    const input = toSimulationInput(payload as Record<string, unknown>);
    const calibration = await getActiveCalibration();
    const result = simulateMatch(input, calibration);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        code: 'SIM_VALIDATION_ERROR',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to simulate match',
    });
  }
};

export const startMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({
        code: 'SIM_VALIDATION_ERROR',
        message: 'Request body is required',
      });
      return;
    }

    const input = toSimulationInput(payload as Record<string, unknown>);
    const result = await startStatefulMatch(input);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        code: 'SIM_VALIDATION_ERROR',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to start match simulation',
    });
  }
};

export const applySubstitutions = async (req: Request, res: Response): Promise<void> => {
  try {
    const matchId = typeof req.params.matchId === 'string' ? req.params.matchId : '';
    if (!matchId) {
      res.status(400).json({
        code: 'SIM_VALIDATION_ERROR',
        message: 'matchId is required',
      });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const substitutions = normalizeSubstitutions(body?.substitutions);

    const tacticalStyleRaw = typeof body?.tacticalStyle === 'string' ? body.tacticalStyle.trim().toUpperCase() : undefined;
    const tacticalStyle = tacticalStyleRaw && TACTICAL_STYLES.includes(tacticalStyleRaw as TacticalStyle)
      ? (tacticalStyleRaw as TacticalStyle)
      : undefined;

    const result = await applyStatefulSubstitutions(matchId, substitutions, tacticalStyle);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        code: 'SIM_VALIDATION_ERROR',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to apply substitutions',
    });
  }
};

export const resumeMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const matchId = typeof req.params.matchId === 'string' ? req.params.matchId : '';
    if (!matchId) {
      res.status(400).json({
        code: 'SIM_VALIDATION_ERROR',
        message: 'matchId is required',
      });
      return;
    }

    const result = await resumeStatefulMatch(matchId);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        code: 'SIM_VALIDATION_ERROR',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to resume match',
    });
  }
};

export const getMatchState = async (req: Request, res: Response): Promise<void> => {
  try {
    const matchId = typeof req.params.matchId === 'string' ? req.params.matchId : '';
    if (!matchId) {
      res.status(400).json({
        code: 'SIM_VALIDATION_ERROR',
        message: 'matchId is required',
      });
      return;
    }

    const state = await getStatefulMatchState(matchId);
    if (!state) {
      res.status(404).json({
        code: 'SIM_NOT_FOUND',
        message: 'Match state was not found',
      });
      return;
    }

    res.status(200).json(state);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        code: 'SIM_VALIDATION_ERROR',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to load match state',
    });
  }
};

export const getMatchHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!prisma) {
      res.status(200).json({ items: [] });
      return;
    }

    const matches = await prisma.match.findMany({
      where: {
        status: 'FINISHED',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    res.status(200).json({ items: matches });
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to load match history',
    });
  }
};

function toSimulationInput(payload: Record<string, unknown>): SimulationInput {
  const teamRaw = payload.team;
  if (!teamRaw || typeof teamRaw !== 'object') {
    throw new Error('team is required');
  }

  const team = toTeamInput(teamRaw as Record<string, unknown>, 'Dream FC');

  let opponent: TeamInput | undefined;
  const opponentRaw = payload.opponent;
  if (opponentRaw && typeof opponentRaw === 'object') {
    opponent = toTeamInput(opponentRaw as Record<string, unknown>, 'Riverdale FC');
  }

  const venueRaw = payload.venue;
  const venue =
    venueRaw === 'HOME' || venueRaw === 'AWAY' || venueRaw === 'NEUTRAL' ? venueRaw : 'HOME';

  if (opponent) {
    return {
      team,
      opponent,
      venue,
    };
  }

  return {
    team,
    venue,
  };
}

function toTeamInput(raw: Record<string, unknown>, defaultName: string): TeamInput {
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : defaultName;
  const formation = typeof raw.formation === 'string' && raw.formation.trim() ? raw.formation.trim() : '4-3-3';

  const tacticalStyleRaw =
    typeof raw.tacticalStyle === 'string' ? raw.tacticalStyle.trim().toUpperCase() : 'BALANCED';
  const tacticalStyle = TACTICAL_STYLES.includes(tacticalStyleRaw as TacticalStyle)
    ? (tacticalStyleRaw as TacticalStyle)
    : 'BALANCED';

  if (!Array.isArray(raw.players) || raw.players.length < 7) {
    throw new Error('team.players must contain at least 7 players');
  }

  const players = raw.players.map((value, index) => toPlayerInput(value, index));

  return {
    name,
    formation,
    tacticalStyle,
    players,
  };
}

function toPlayerInput(raw: unknown, index: number): PlayerInput {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`player at index ${index} is invalid`);
  }

  const source = raw as Record<string, unknown>;

  const naturalPosition =
    typeof source.naturalPosition === 'string' && source.naturalPosition.trim()
      ? source.naturalPosition.trim().toUpperCase()
      : 'CM';
  const rolePosition =
    typeof source.rolePosition === 'string' && source.rolePosition.trim()
      ? source.rolePosition.trim().toUpperCase()
      : naturalPosition;

  const attackWorkRate = normalizeWorkRate(source.attackWorkRate);
  const defenseWorkRate = normalizeWorkRate(source.defenseWorkRate);

  const preferredPositions = Array.isArray(source.preferredPositions)
    ? source.preferredPositions
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim().toUpperCase())
    : [naturalPosition];

  return {
    id: typeof source.id === 'string' && source.id.trim() ? source.id.trim() : randomUUID(),
    name: typeof source.name === 'string' && source.name.trim() ? source.name.trim() : `Player ${index + 1}`,
    naturalPosition,
    rolePosition,
    preferredPositions,
    isSubstitute: Boolean(source.isSubstitute),
    pac: normalizeStat(source.pac, 65),
    sho: normalizeStat(source.sho, 65),
    pas: normalizeStat(source.pas, 65),
    dri: normalizeStat(source.dri, 65),
    def: normalizeStat(source.def, 65),
    phy: normalizeStat(source.phy, 65),
    stamina: normalizeStamina(source.stamina),
    attackWorkRate,
    defenseWorkRate,
  };
}

function normalizeSubstitutions(input: unknown): SubstitutionAction[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const output: SubstitutionAction[] = [];

  for (const value of input) {
    if (!value || typeof value !== 'object') {
      continue;
    }

    const source = value as Record<string, unknown>;
    const playerOutId = typeof source.playerOutId === 'string' ? source.playerOutId.trim() : '';
    const playerInId = typeof source.playerInId === 'string' ? source.playerInId.trim() : '';
    const normalizedRole =
      typeof source.newRolePosition === 'string' ? source.newRolePosition.trim().toUpperCase() : '';

    if (!playerOutId || !playerInId) {
      continue;
    }

    if (normalizedRole) {
      output.push({
        playerOutId,
        playerInId,
        newRolePosition: normalizedRole,
      });
      continue;
    }

    output.push({
      playerOutId,
      playerInId,
    });
  }

  return output;
}

function normalizeWorkRate(value: unknown): WorkRate {
  if (typeof value !== 'string') {
    return 'MEDIUM';
  }

  const normalized = value.trim().toUpperCase();
  return WORK_RATES.includes(normalized as WorkRate) ? (normalized as WorkRate) : 'MEDIUM';
}

function normalizeStat(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(99, Math.round(value)));
}

function normalizeStamina(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 100;
  }

  return Math.max(1, Math.min(100, Math.round(value)));
}

export const analyzeSquad = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ code: 'SIM_VALIDATION_ERROR', message: 'Request body is required' });
      return;
    }

    const input = toSimulationInput(payload as Record<string, unknown>);
    
    // We import here to avoid circular dependency issues if any, or we can add it to the top.
    // Let's rely on the imports at the top. Wait, we need to add imports to the top.
    // I will use require inline for now if imports aren't available, but I'll add the imports at the top in the next step.
    const { createTeamRuntime, createDefaultOpponent, calculateTeamRatings } = require('../services/simulation.engine');
    
    const homeTeam = createTeamRuntime(input.team);
    const awayTeam = createTeamRuntime(input.opponent ?? createDefaultOpponent());
    
    const ratings = calculateTeamRatings(homeTeam, awayTeam);
    
    res.status(200).json(ratings);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ code: 'SIM_VALIDATION_ERROR', message: error.message });
      return;
    }
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to analyze squad' });
  }
};

export const previewSubstitutions = async (req: Request, res: Response): Promise<void> => {
  try {
    const matchId = typeof req.params.matchId === 'string' ? req.params.matchId : '';
    if (!matchId) {
      res.status(400).json({ code: 'SIM_VALIDATION_ERROR', message: 'matchId is required' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const substitutions = normalizeSubstitutions(body?.changes || body?.substitutions);
    
    const tacticalStyleRaw = typeof body?.tacticsChanges === 'object' && body.tacticsChanges !== null 
      ? (body.tacticsChanges as Record<string, any>).style 
      : undefined;
      
    const { previewStatefulSubstitutions } = require('../services/match.session');
    const { explainSubstitutionImpact } = require('../services/explainer.service');

    try {
      const preview = previewStatefulSubstitutions(matchId, substitutions, tacticalStyleRaw as any);
      const explainerResult = explainSubstitutionImpact(preview.deltas, tacticalStyleRaw as any);
      
      res.status(200).json({
        before: preview.before,
        after: preview.after,
        deltas: preview.deltas,
        warningsResolved: explainerResult.warningsResolved,
        newWarnings: explainerResult.newWarnings,
        summary: explainerResult.summary
      });
    } catch (e: any) {
      if (e.message === 'Match session not found') {
        res.status(404).json({ code: 'SIM_NOT_FOUND', message: e.message });
        return;
      }
      throw e;
    }
  } catch (error) {
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to preview substitutions' });
  }
};

export const getMatchReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { matchId } = req.params;
    
    if (!matchId) {
      res.status(400).json({ code: 'INVALID_INPUT', message: 'Match ID is required' });
      return;
    }

    const { loadPersistedMatchState } = require('../services/match.persistence');
    const state = await loadPersistedMatchState(matchId);

    if (!state) {
      res.status(404).json({ code: 'MATCH_NOT_FOUND', message: 'Match not found' });
      return;
    }

    if (state.status !== 'FINISHED') {
      res.status(400).json({ code: 'MATCH_NOT_FINISHED', message: 'Match report is only available after the match has finished' });
      return;
    }

    res.status(200).json(state.report);
  } catch (error) {
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch match report' });
  }
};
