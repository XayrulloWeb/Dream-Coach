/**
 * Core Engine 3.0 — Tactical Rule Engine (Столп 5)
 *
 * Каждое правило — это отдельная проверка "Камень-Ножницы-Бумага".
 * Правила прогоняются ПЕРЕД основным циклом и на каждом пересчёте рейтингов.
 * AI Coach использует `explanation` для объяснения юзеру.
 */

import type { TacticalRuleEffect, TacticalStyle, WorkRate, Zone } from '../types/simulation';

// ===== Runtime types used by rules =====

export type RuleTeamContext = {
  tacticalStyle: TacticalStyle;
  players: Array<{
    rolePosition: string;
    naturalPosition: string;
    pac: number;
    sho: number;
    pas: number;
    dri: number;
    def: number;
    phy: number;
    currentStamina: number;
    attackWorkRate: WorkRate;
    defenseWorkRate: WorkRate;
  }>;
  ratings: {
    control: number;
    chanceCreation: number;
    defensiveWall: number;
    transitionDefense: number;
    pressingPower: number;
    flankSecurity: Record<Zone, number>;
    attackingThreat: Record<Zone, number>;
    vulnerabilities: string[];
  };
};

export type TacticalRule = {
  id: string;
  condition: (team: RuleTeamContext, opponent: RuleTeamContext) => boolean;
  effect: TacticalRuleEffect;
  explanation: string;
};

// ===== Helper functions =====

const CB_ROLES = new Set(['CB', 'LCB', 'RCB']);
const MID_ROLES = new Set(['CDM', 'CM', 'LCM', 'RCM', 'CAM', 'LAM', 'RAM', 'LM', 'RM']);
const ATK_ROLES = new Set(['LW', 'RW', 'ST', 'CF', 'CAM', 'LAM', 'RAM']);
const LEFT_ROLES = new Set(['LB', 'LWB', 'LM', 'LW', 'LAM', 'LCM', 'LCB']);
const RIGHT_ROLES = new Set(['RB', 'RWB', 'RM', 'RW', 'RAM', 'RCM', 'RCB']);

function avgStat(
  players: RuleTeamContext['players'],
  filter: (p: RuleTeamContext['players'][0]) => boolean,
  stat: (p: RuleTeamContext['players'][0]) => number,
): number {
  const filtered = players.filter(filter);
  if (!filtered.length) return 50;
  return filtered.reduce((sum, p) => sum + stat(p), 0) / filtered.length;
}

// ===== RULES =====

const RULES: TacticalRule[] = [
  // 1. High Line + Slow CBs = death by counter-attacks
  {
    id: 'HIGH_LINE_SLOW_CB_COUNTER_RISK',
    condition: (team, opponent) => {
      if (team.tacticalStyle !== 'HIGH_PRESS') return false;
      const cbAvgPace = avgStat(team.players, (p) => CB_ROLES.has(p.rolePosition), (p) => p.pac);
      const fwdAvgPace = avgStat(opponent.players, (p) => ATK_ROLES.has(p.rolePosition), (p) => p.pac);
      return cbAvgPace < 70 && fwdAvgPace > 75;
    },
    effect: {
      transitionDefenseDelta: -18,
      opponentChanceBoost: 12,
      vulnerability: 'HIGH_LINE_SLOW_CBS',
    },
    explanation: 'Высокая линия с медленными ЦЗ — быстрые форварды соперника ловят забросами за спину.',
  },

  // 2. Narrow formation = exposed flanks
  {
    id: 'NARROW_FORMATION_EXPOSED_FLANKS',
    condition: (team, opponent) => {
      const leftCount = team.players.filter((p) => LEFT_ROLES.has(p.rolePosition)).length;
      const rightCount = team.players.filter((p) => RIGHT_ROLES.has(p.rolePosition)).length;
      const oppHasWingers =
        opponent.players.filter((p) => p.rolePosition === 'LW' || p.rolePosition === 'RW').length >= 2;
      return (leftCount < 2 || rightCount < 2) && oppHasWingers;
    },
    effect: {
      flankSecurityLeftDelta: -12,
      flankSecurityRightDelta: -12,
      vulnerability: 'NARROW_VS_WIDE',
    },
    explanation: 'Узкая схема без фланговых — вингеры соперника получают свободу на краях.',
  },

  // 3. Possession + bad passers = turnovers
  {
    id: 'POSSESSION_BAD_PASSERS_TURNOVERS',
    condition: (team) => {
      if (team.tacticalStyle !== 'POSSESSION') return false;
      const midAvgPas = avgStat(team.players, (p) => MID_ROLES.has(p.rolePosition), (p) => p.pas);
      return midAvgPas < 75;
    },
    effect: {
      controlDelta: -10,
      transitionDefenseDelta: -12,
      opponentChanceBoost: 8,
      vulnerability: 'POSSESSION_BAD_PASSERS',
    },
    explanation: 'Тики-така с плохо пасующими полузащитниками — регулярные обрезки создают контратаки.',
  },

  // 4. Counter vs Low Block = neutralized
  {
    id: 'COUNTER_VS_LOW_BLOCK_NEUTRALIZED',
    condition: (team, opponent) => {
      return team.tacticalStyle === 'COUNTER' && opponent.tacticalStyle === 'LOW_BLOCK';
    },
    effect: {
      chanceCreationDelta: -10,
      controlDelta: -6,
      vulnerability: 'COUNTER_NEUTRALIZED',
    },
    explanation: 'Контратака нейтрализована — соперник в автобусе, нет пространства для рывков.',
  },

  // 5. High Press stamina burnout (late game)
  {
    id: 'HIGH_PRESS_STAMINA_BURNOUT',
    condition: (team) => {
      if (team.tacticalStyle !== 'HIGH_PRESS') return false;
      const avgStamina = avgStat(team.players, () => true, (p) => p.currentStamina);
      return avgStamina < 45;
    },
    effect: {
      pressingPowerDelta: -15,
      defensiveWallDelta: -10,
      transitionDefenseDelta: -8,
      vulnerability: 'PRESS_EXHAUSTED',
    },
    explanation: 'Прессинг выдохся — у команды нет сил поддерживать давление, соперник легко проходит центр.',
  },

  // 6. 3+ lazy attackers = defensive collapse
  {
    id: 'LAZY_ATTACKERS_DEFENSIVE_COLLAPSE',
    condition: (team) => {
      const lazyCount = team.players.filter(
        (p) => ATK_ROLES.has(p.rolePosition) && p.defenseWorkRate === 'LOW',
      ).length;
      return lazyCount >= 3;
    },
    effect: {
      defensiveWallDelta: -12,
      transitionDefenseDelta: -15,
      vulnerability: 'DEFENSIVE_COLLAPSE_LAZY',
    },
    explanation: '3 лентяя в атаке — полузащитники бегают за семерых, оборона рассыпается.',
  },
];

// ===== Public API =====

export type AppliedRule = {
  id: string;
  explanation: string;
  effect: TacticalRuleEffect;
};

/**
 * Evaluate all tactical rules for a given team/opponent pair.
 * Returns the list of rules that fired and their effects.
 */
export function evaluateTacticalRules(
  team: RuleTeamContext,
  opponent: RuleTeamContext,
): AppliedRule[] {
  const applied: AppliedRule[] = [];

  for (const rule of RULES) {
    try {
      if (rule.condition(team, opponent)) {
        applied.push({
          id: rule.id,
          explanation: rule.explanation,
          effect: rule.effect,
        });
      }
    } catch {
      // Rule evaluation failed — skip silently
    }
  }

  return applied;
}

/**
 * Merge all applied rule effects into aggregate deltas.
 */
export function mergeRuleEffects(rules: AppliedRule[]): Required<TacticalRuleEffect> {
  const merged: Required<TacticalRuleEffect> = {
    controlDelta: 0,
    chanceCreationDelta: 0,
    defensiveWallDelta: 0,
    transitionDefenseDelta: 0,
    pressingPowerDelta: 0,
    flankSecurityLeftDelta: 0,
    flankSecurityRightDelta: 0,
    opponentChanceBoost: 0,
    vulnerability: '',
  };

  const vulnerabilities: string[] = [];

  for (const rule of rules) {
    const e = rule.effect;
    merged.controlDelta += e.controlDelta ?? 0;
    merged.chanceCreationDelta += e.chanceCreationDelta ?? 0;
    merged.defensiveWallDelta += e.defensiveWallDelta ?? 0;
    merged.transitionDefenseDelta += e.transitionDefenseDelta ?? 0;
    merged.pressingPowerDelta += e.pressingPowerDelta ?? 0;
    merged.flankSecurityLeftDelta += e.flankSecurityLeftDelta ?? 0;
    merged.flankSecurityRightDelta += e.flankSecurityRightDelta ?? 0;
    merged.opponentChanceBoost += e.opponentChanceBoost ?? 0;
    if (e.vulnerability) {
      vulnerabilities.push(e.vulnerability);
    }
  }

  merged.vulnerability = vulnerabilities.join(',');
  return merged;
}
