/**
 * Core Engine 3.0 — Player Roles (Столп 6)
 *
 * Роли делают Ronaldo/Suárez/Messi/Özil реально разными, а не просто числами.
 * Каждая роль влияет на вероятность событий и модификаторы характеристик.
 */

import type { PlayerRole } from '../types/simulation';

// ===== Role Modifiers =====

export type RoleModifiers = {
  // Chance creation & finishing
  finishingBonus: number;       // % bonus to being selected as shooter
  chanceCreationBonus: number;  // % bonus to creating chances
  throughBallBonus: number;     // % bonus to key passes / assists

  // Team contributions
  controlBonus: number;         // flat bonus to team control rating
  pressingBonus: number;        // flat bonus to team pressing power
  opponentControlPenalty: number; // reduces opponent's control

  // Stamina & risk
  staminaDrainMultiplier: number; // 1.0 = normal, 1.15 = drains faster
  cardRiskMultiplier: number;     // 1.0 = normal, 1.3 = more cards

  // Special event probabilities
  turnoverCreation: number;     // % chance to win ball back in midfield
  longShotBonus: number;        // % bonus for shots outside the box
};

const DEFAULT_MODIFIERS: RoleModifiers = {
  finishingBonus: 0,
  chanceCreationBonus: 0,
  throughBallBonus: 0,
  controlBonus: 0,
  pressingBonus: 0,
  opponentControlPenalty: 0,
  staminaDrainMultiplier: 1.0,
  cardRiskMultiplier: 1.0,
  turnoverCreation: 0,
  longShotBonus: 0,
};

// ===== Role Definitions =====

const ROLE_MAP: Record<PlayerRole, Partial<RoleModifiers>> = {
  // === Forwards ===
  POACHER: {
    finishingBonus: 15,       // Always in the right place
    chanceCreationBonus: -5,  // Doesn't create, just finishes
    staminaDrainMultiplier: 0.9, // Conserves energy, lurks in the box
  },
  PRESSING_FORWARD: {
    finishingBonus: 5,
    pressingBonus: 8,
    turnoverCreation: 12,     // Wins ball high up the pitch
    staminaDrainMultiplier: 1.2, // Burns energy pressing
    cardRiskMultiplier: 1.15,
  },
  COMPLETE_FORWARD: {
    finishingBonus: 8,
    chanceCreationBonus: 5,
    throughBallBonus: 5,
    controlBonus: 3,
  },
  FALSE_NINE: {
    finishingBonus: -5,       // Drops deep, less on the end of things
    chanceCreationBonus: 12,  // Creates for others
    throughBallBonus: 10,
    controlBonus: 8,          // Adds to midfield control
  },
  TARGET_MAN: {
    finishingBonus: 10,
    chanceCreationBonus: 3,   // Knock-downs for others
    staminaDrainMultiplier: 0.85, // Stays central, doesn't run much
  },

  // === Wingers ===
  INSIDE_FORWARD: {
    finishingBonus: 12,       // Cuts inside to shoot
    longShotBonus: 8,
    chanceCreationBonus: 3,
  },
  WIDE_PLAYMAKER: {
    finishingBonus: -3,
    chanceCreationBonus: 10,  // Key passes and crosses
    throughBallBonus: 12,
    controlBonus: 4,
  },
  TRADITIONAL_WINGER: {
    chanceCreationBonus: 8,
    throughBallBonus: 8,      // Crosses
    staminaDrainMultiplier: 1.1, // Lots of up-and-down the flank
  },

  // === Midfielders ===
  DEEP_PLAYMAKER: {
    controlBonus: 12,         // Dictates tempo
    throughBallBonus: 10,
    chanceCreationBonus: 5,
    pressingBonus: -4,        // Doesn't press high
    staminaDrainMultiplier: 0.9, // Conserves energy
  },
  BOX_TO_BOX: {
    controlBonus: 4,
    pressingBonus: 6,
    turnoverCreation: 6,
    finishingBonus: 3,
    staminaDrainMultiplier: 1.15, // Covers lots of ground
  },
  BALL_WINNER: {
    opponentControlPenalty: 8, // Disrupts opponent
    turnoverCreation: 15,
    pressingBonus: 8,
    controlBonus: -3,         // Not great on the ball
    cardRiskMultiplier: 1.3,  // Aggressive tackles
    staminaDrainMultiplier: 1.1,
  },
  ADVANCED_PLAYMAKER: {
    chanceCreationBonus: 12,
    throughBallBonus: 15,
    controlBonus: 6,
    finishingBonus: 3,
    pressingBonus: -6,        // Doesn't defend
  },
  ANCHOR: {
    controlBonus: 6,
    opponentControlPenalty: 5,
    pressingBonus: -2,        // Holds position
    turnoverCreation: 8,
    staminaDrainMultiplier: 0.85,
  },
  MEZZALA: {
    controlBonus: 5,
    chanceCreationBonus: 6,
    finishingBonus: 4,
    staminaDrainMultiplier: 1.1,
  },

  // === Defenders ===
  INVERTED_FULLBACK: {
    controlBonus: 5,          // Tucks into midfield
    chanceCreationBonus: 2,
    throughBallBonus: 3,
  },
  OVERLAPPING_FULLBACK: {
    chanceCreationBonus: 6,   // Crosses from deep
    throughBallBonus: 5,
    staminaDrainMultiplier: 1.15, // Sprints up and down
  },
  DEFENSIVE_FULLBACK: {
    pressingBonus: 2,
    staminaDrainMultiplier: 0.9,
  },
  BALL_PLAYING_CB: {
    controlBonus: 5,
    throughBallBonus: 4,      // Long balls forward
  },
  STOPPER: {
    opponentControlPenalty: 3,
    turnoverCreation: 5,
    cardRiskMultiplier: 1.2,
  },

  // === Goalkeepers ===
  SWEEPER_KEEPER: {
    controlBonus: 3,          // Plays out from the back
  },
  SHOT_STOPPER: {
    // Pure reflexes — no team contributions
  },

  // === Default ===
  DEFAULT: {},
};

// ===== Public API =====

/**
 * Get the full modifiers for a given player role.
 * Missing values are filled with defaults.
 */
export function getRoleModifiers(role: PlayerRole | undefined): RoleModifiers {
  const partial = ROLE_MAP[role ?? 'DEFAULT'] ?? {};
  return { ...DEFAULT_MODIFIERS, ...partial };
}

/**
 * Auto-detect a player role based on their position and stats.
 * Used when no explicit role is assigned.
 */
export function inferPlayerRole(
  position: string,
  stats: { pac: number; sho: number; pas: number; dri: number; def: number; phy: number },
  attackWR: string,
  defenseWR: string,
): PlayerRole {
  const pos = position.toUpperCase();

  // Goalkeepers
  if (pos === 'GK') {
    return stats.pas > 60 ? 'SWEEPER_KEEPER' : 'SHOT_STOPPER';
  }

  // Center-backs
  if (pos === 'CB' || pos === 'LCB' || pos === 'RCB') {
    return stats.pas > 70 ? 'BALL_PLAYING_CB' : 'STOPPER';
  }

  // Fullbacks
  if (pos === 'LB' || pos === 'RB' || pos === 'LWB' || pos === 'RWB') {
    if (attackWR === 'HIGH' && stats.pac > 80) return 'OVERLAPPING_FULLBACK';
    if (stats.pas > 75) return 'INVERTED_FULLBACK';
    return 'DEFENSIVE_FULLBACK';
  }

  // CDM
  if (pos === 'CDM') {
    if (defenseWR === 'HIGH' && stats.def > 78) return 'BALL_WINNER';
    if (stats.pas > 80) return 'ANCHOR';
    return 'BALL_WINNER';
  }

  // Central midfielders
  if (pos === 'CM' || pos === 'LCM' || pos === 'RCM') {
    if (stats.pas > 82 && stats.dri > 78) return 'DEEP_PLAYMAKER';
    if (attackWR === 'HIGH' && defenseWR === 'HIGH') return 'BOX_TO_BOX';
    if (stats.def > 75) return 'BALL_WINNER';
    return 'MEZZALA';
  }

  // CAM
  if (pos === 'CAM' || pos === 'LAM' || pos === 'RAM') {
    if (stats.pas > 82) return 'ADVANCED_PLAYMAKER';
    return 'MEZZALA';
  }

  // Wingers
  if (pos === 'LW' || pos === 'RW' || pos === 'LM' || pos === 'RM') {
    if (stats.sho > 78 && stats.dri > 80) return 'INSIDE_FORWARD';
    if (stats.pas > 80) return 'WIDE_PLAYMAKER';
    return 'TRADITIONAL_WINGER';
  }

  // Strikers
  if (pos === 'ST' || pos === 'CF') {
    if (stats.sho > 85 && stats.pas < 70) return 'POACHER';
    if (stats.pas > 78 && stats.dri > 80) return 'FALSE_NINE';
    if (stats.phy > 82) return 'TARGET_MAN';
    if (defenseWR === 'HIGH') return 'PRESSING_FORWARD';
    return 'COMPLETE_FORWARD';
  }

  return 'DEFAULT';
}
