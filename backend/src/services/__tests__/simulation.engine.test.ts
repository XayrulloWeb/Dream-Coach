import assert from 'node:assert/strict';
import test from 'node:test';
import { simulateMatch } from '../simulation.engine';
import { applyStatefulSubstitutions, resumeStatefulMatch, startStatefulMatch } from '../match.session';
import type { PlayerInput, SimulationInput, TacticalStyle, TeamInput, WorkRate } from '../../types/simulation';

const DEFAULT_CALIBRATION = {
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

function makePlayer(
  id: string,
  rolePosition: string,
  naturalPosition: string,
  stats?: Partial<Pick<PlayerInput, 'pac' | 'sho' | 'pas' | 'dri' | 'def' | 'phy' | 'stamina'>>,
  workRates?: Partial<Pick<PlayerInput, 'attackWorkRate' | 'defenseWorkRate'>>,
): PlayerInput {
  return {
    id,
    name: id.toUpperCase(),
    naturalPosition,
    rolePosition,
    preferredPositions: [naturalPosition],
    pac: stats?.pac ?? 76,
    sho: stats?.sho ?? 74,
    pas: stats?.pas ?? 75,
    dri: stats?.dri ?? 75,
    def: stats?.def ?? 74,
    phy: stats?.phy ?? 74,
    stamina: stats?.stamina ?? 88,
    attackWorkRate: workRates?.attackWorkRate ?? 'MEDIUM',
    defenseWorkRate: workRates?.defenseWorkRate ?? 'MEDIUM',
  };
}

function createBaseTeam(style: TacticalStyle = 'BALANCED'): TeamInput {
  return {
    name: 'Dream FC',
    formation: '4-3-3',
    tacticalStyle: style,
    players: [
      makePlayer('gk', 'GK', 'GK', { pac: 42, sho: 20, pas: 60, dri: 40, def: 84, phy: 80 }),
      makePlayer('lb', 'LB', 'LB'),
      makePlayer('lcb', 'LCB', 'CB'),
      makePlayer('rcb', 'RCB', 'CB'),
      makePlayer('rb', 'RB', 'RB'),
      makePlayer('lcm', 'LCM', 'CM'),
      makePlayer('cdm', 'CDM', 'CDM', { def: 80, pas: 78, phy: 79 }),
      makePlayer('rcm', 'RCM', 'CM'),
      makePlayer('lw', 'LW', 'LW', { pac: 84, sho: 79, dri: 82, def: 48 }),
      makePlayer('st', 'ST', 'ST', { sho: 84, pac: 82 }),
      makePlayer('rw', 'RW', 'RW', { pac: 83, sho: 78, dri: 81, def: 49 }),
    ],
  };
}

function createOpponent(): TeamInput {
  return {
    ...createBaseTeam('BALANCED'),
    name: 'Rival FC',
  };
}

function withMockedRandom<T>(value: number, fn: () => T): T {
  const original = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

async function withMockedRandomAsync<T>(value: number, fn: () => Promise<T>): Promise<T> {
  const original = Math.random;
  Math.random = () => value;
  try {
    return await fn();
  } finally {
    Math.random = original;
  }
}

test('simulation: role fit mismatch reduces midfield control', () => {
  const balanced = createBaseTeam('BALANCED');
  const mismatch = createBaseTeam('BALANCED');

  mismatch.players = mismatch.players.map((player) => {
    if (player.id !== 'rcm') {
      return player;
    }

    return {
      ...player,
      naturalPosition: 'ST',
      preferredPositions: ['ST'],
    };
  });

  const goodResult = withMockedRandom(0.5, () =>
    simulateMatch({ team: balanced, opponent: createOpponent(), venue: 'HOME' }, DEFAULT_CALIBRATION),
  );

  const mismatchResult = withMockedRandom(0.5, () =>
    simulateMatch({ team: mismatch, opponent: createOpponent(), venue: 'HOME' }, DEFAULT_CALIBRATION),
  );

  assert.ok(
    mismatchResult.ratings.home.control < goodResult.ratings.home.control,
    `Expected control drop. good=${goodResult.ratings.home.control}, mismatch=${mismatchResult.ratings.home.control}`,
  );
});

test('simulation: HIGH_PRESS drains stamina enough to trigger stamina issues vs LOW_BLOCK', () => {
  const highPress = createBaseTeam('HIGH_PRESS');
  const lowBlock = createBaseTeam('LOW_BLOCK');

  highPress.players = highPress.players.map((player) => ({ ...player, stamina: 85 }));
  lowBlock.players = lowBlock.players.map((player) => ({ ...player, stamina: 85 }));

  const highPressResult = withMockedRandom(0.5, () =>
    simulateMatch({ team: highPress, opponent: createOpponent(), venue: 'HOME' }, DEFAULT_CALIBRATION),
  );
  const lowBlockResult = withMockedRandom(0.5, () =>
    simulateMatch({ team: lowBlock, opponent: createOpponent(), venue: 'HOME' }, DEFAULT_CALIBRATION),
  );

  const highPressIssues = highPressResult.insights[0]?.issues ?? [];
  const lowBlockIssues = lowBlockResult.insights[0]?.issues ?? [];

  assert.ok(highPressIssues.some((issue) => issue.type === 'STAMINA_CRITICAL'));
  assert.ok(!lowBlockIssues.some((issue) => issue.type === 'STAMINA_CRITICAL'));
});

test('simulation: left flank exposure is detected for unbalanced wing', () => {
  const exposed = createBaseTeam('HIGH_PRESS');

  exposed.players = exposed.players.map((player) => {
    if (player.id === 'lw') {
      return {
        ...player,
        def: 32,
        phy: 60,
        attackWorkRate: 'HIGH' as WorkRate,
        defenseWorkRate: 'LOW' as WorkRate,
      };
    }

    if (player.id === 'lb') {
      return {
        ...player,
        def: 40,
        phy: 62,
        attackWorkRate: 'HIGH' as WorkRate,
        defenseWorkRate: 'LOW' as WorkRate,
      };
    }

    return player;
  });

  const result = withMockedRandom(0.5, () =>
    simulateMatch({ team: exposed, opponent: createOpponent(), venue: 'HOME' }, DEFAULT_CALIBRATION),
  );

  assert.ok(result.ratings.home.vulnerabilities.includes('LEFT_FLANK_EXPOSED'));
});

test('match session: substitution impact reduces left risk for defensive replacement', async () => {
  const team = createBaseTeam('HIGH_PRESS');

  const benchDefender = makePlayer(
    'bench-lwb',
    'LWB',
    'LWB',
    { pac: 74, sho: 58, pas: 72, dri: 70, def: 86, phy: 84, stamina: 92 },
    { attackWorkRate: 'MEDIUM', defenseWorkRate: 'HIGH' },
  );

  const benchMid = makePlayer('bench-cdm', 'CDM', 'CDM', { def: 82, pas: 78, phy: 80, stamina: 90 });

  team.players = [
    ...team.players.map((player) => {
      if (player.id !== 'lw') {
        return player;
      }

      return {
        ...player,
        def: 30,
        phy: 58,
        attackWorkRate: 'HIGH' as WorkRate,
        defenseWorkRate: 'LOW' as WorkRate,
      };
    }),
    { ...benchDefender, isSubstitute: true },
    { ...benchMid, isSubstitute: true },
  ];

  const input: SimulationInput = {
    team,
    opponent: createOpponent(),
    venue: 'HOME',
  };

  let startedMatchId = '';

  try {
    await withMockedRandomAsync(0.5, async () => {
      const started = await startStatefulMatch(input);
      startedMatchId = started.matchId;

      const impact = await applyStatefulSubstitutions(
        started.matchId,
        [
          {
            playerOutId: 'lw',
            playerInId: 'bench-lwb',
            newRolePosition: 'LW',
          },
        ],
        'BALANCED',
      );

      assert.ok(impact.impactPreview.deltas.leftRiskDelta < 0);
      assert.ok(impact.impactPreview.deltas.defenseDelta >= 0);
    });
  } finally {
    if (startedMatchId) {
      await withMockedRandomAsync(0.5, async () => {
        await resumeStatefulMatch(startedMatchId);
      });
    }
  }
});
