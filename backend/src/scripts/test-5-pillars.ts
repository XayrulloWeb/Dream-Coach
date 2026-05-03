/**
 * Sprint 4 Verification Script — 5 Pillars Stress Test
 * 
 * Tests 3 edge cases:
 * 1. 3 lazy attackers → midfield stamina collapse by minute 60
 * 2. ST at CB → massive goal concession
 * 3. Slow CBs + HIGH_PRESS vs fast wingers → counter-attack destruction
 */

import { simulateMatch } from '../services/simulation.engine';
import type { PlayerInput, SimulationInput, TacticalStyle, WorkRate } from '../types/simulation';

function makePlayer(
  id: string, name: string, nat: string, role: string,
  pac: number, sho: number, pas: number, dri: number, def: number, phy: number,
  atkWR: WorkRate = 'MEDIUM', defWR: WorkRate = 'MEDIUM',
): PlayerInput {
  return {
    id, name, naturalPosition: nat, rolePosition: role,
    preferredPositions: [nat],
    pac, sho, pas, dri, def, phy,
    stamina: 100, attackWorkRate: atkWR, defenseWorkRate: defWR,
  };
}

function runTest(label: string, input: SimulationInput, expectedBehavior: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`TEST: ${label}`);
  console.log(`Expected: ${expectedBehavior}`);
  console.log('='.repeat(70));

  const result = simulateMatch(input);
  console.log(`Score: HOME ${result.score.home} - ${result.score.away} AWAY`);
  console.log(`xG: ${result.stats.home.xg} vs ${result.stats.away.xg}`);
  console.log(`Possession: ${result.stats.home.possession}% vs ${result.stats.away.possession}%`);
  console.log(`Shots: ${result.stats.home.shots} vs ${result.stats.away.shots}`);
  console.log(`Big Chances: ${result.stats.home.bigChances} vs ${result.stats.away.bigChances}`);

  if (result.insights.length > 0 && result.insights[0]) {
    console.log(`\nAI Insights (minute ${result.insights[0].minute}):`);
    for (const issue of result.insights[0].issues) {
      console.log(`  [${issue.severity}] ${issue.message}`);
    }
  }

  console.log(`\nVulnerabilities: ${result.ratings.home.vulnerabilities.join(', ') || 'None'}`);
  return result;
}

// ======= TEST 1: 3 Lazy Attackers =======
// Neymar, Mbappe, Ronaldo — all with LOW defense work rate
// HIGH_PRESS to maximize stamina burn
const lazyTeam: SimulationInput = {
  team: {
    name: 'Lazy Stars FC',
    formation: '4-3-3',
    tacticalStyle: 'HIGH_PRESS',
    players: [
      makePlayer('gk', 'GK Player', 'GK', 'GK', 40, 20, 50, 30, 85, 80, 'LOW', 'HIGH'),
      makePlayer('lb', 'LB Player', 'LB', 'LB', 78, 40, 72, 70, 76, 74, 'MEDIUM', 'HIGH'),
      makePlayer('lcb', 'LCB Player', 'CB', 'LCB', 68, 35, 65, 55, 82, 83, 'LOW', 'HIGH'),
      makePlayer('rcb', 'RCB Player', 'CB', 'RCB', 66, 33, 63, 53, 84, 85, 'LOW', 'HIGH'),
      makePlayer('rb', 'RB Player', 'RB', 'RB', 80, 42, 74, 72, 75, 73, 'MEDIUM', 'HIGH'),
      makePlayer('cdm', 'CDM Player', 'CDM', 'CDM', 70, 55, 80, 68, 80, 78, 'MEDIUM', 'HIGH'),
      makePlayer('lcm', 'LCM Player', 'CM', 'LCM', 74, 65, 82, 78, 72, 75, 'MEDIUM', 'MEDIUM'),
      makePlayer('rcm', 'RCM Player', 'CM', 'RCM', 73, 63, 81, 77, 71, 74, 'HIGH', 'MEDIUM'),
      // 3 LAZY ATTACKERS — defenseWorkRate: LOW
      makePlayer('lw', 'Neymar', 'LW', 'LW', 87, 80, 82, 93, 35, 60, 'HIGH', 'LOW'),
      makePlayer('st', 'Mbappe', 'ST', 'ST', 97, 89, 78, 92, 32, 68, 'HIGH', 'LOW'),
      makePlayer('rw', 'Ronaldo', 'RW', 'RW', 85, 93, 78, 88, 30, 74, 'HIGH', 'LOW'),
    ],
  },
};

// ======= TEST 2: ST at CB =======
// Put a striker in center-back position — should be catastrophic
const stAtCb: SimulationInput = {
  team: {
    name: 'Wrong Positions FC',
    formation: '4-3-3',
    tacticalStyle: 'BALANCED',
    players: [
      makePlayer('gk', 'GK Player', 'GK', 'GK', 40, 20, 50, 30, 85, 80, 'LOW', 'HIGH'),
      makePlayer('lb', 'LB Player', 'LB', 'LB', 78, 40, 72, 70, 76, 74, 'MEDIUM', 'HIGH'),
      // ST playing at CB = 10% stats. Catastrophic.
      makePlayer('lcb', 'Striker-at-CB', 'ST', 'LCB', 85, 90, 70, 85, 30, 65, 'HIGH', 'LOW'),
      makePlayer('rcb', 'RCB Player', 'CB', 'RCB', 66, 33, 63, 53, 84, 85, 'LOW', 'HIGH'),
      makePlayer('rb', 'RB Player', 'RB', 'RB', 80, 42, 74, 72, 75, 73, 'MEDIUM', 'HIGH'),
      makePlayer('cdm', 'CDM Player', 'CDM', 'CDM', 70, 55, 80, 68, 80, 78, 'MEDIUM', 'HIGH'),
      makePlayer('lcm', 'LCM Player', 'CM', 'LCM', 74, 65, 82, 78, 72, 75, 'MEDIUM', 'MEDIUM'),
      makePlayer('rcm', 'RCM Player', 'CM', 'RCM', 73, 63, 81, 77, 71, 74, 'HIGH', 'MEDIUM'),
      makePlayer('lw', 'LW Player', 'LW', 'LW', 84, 76, 74, 82, 52, 66, 'HIGH', 'MEDIUM'),
      makePlayer('st', 'ST Player', 'ST', 'ST', 82, 81, 69, 78, 45, 74, 'HIGH', 'LOW'),
      makePlayer('rw', 'RW Player', 'RW', 'RW', 83, 77, 73, 81, 50, 64, 'HIGH', 'MEDIUM'),
    ],
  },
};

// ======= TEST 3: Slow CBs + HIGH_PRESS vs fast wingers =======
const slowCbHighPress: SimulationInput = {
  team: {
    name: 'Slow Defense FC',
    formation: '4-3-3',
    tacticalStyle: 'HIGH_PRESS', // High line with SLOW center-backs
    players: [
      makePlayer('gk', 'GK Player', 'GK', 'GK', 40, 20, 50, 30, 85, 80, 'LOW', 'HIGH'),
      makePlayer('lb', 'LB Player', 'LB', 'LB', 72, 40, 72, 70, 76, 74, 'MEDIUM', 'HIGH'),
      // SLOW center-backs (pac 55 and 58) with HIGH_PRESS = suicide
      makePlayer('lcb', 'Slow CB 1', 'CB', 'LCB', 55, 30, 65, 50, 86, 88, 'LOW', 'HIGH'),
      makePlayer('rcb', 'Slow CB 2', 'CB', 'RCB', 58, 28, 62, 48, 88, 90, 'LOW', 'HIGH'),
      makePlayer('rb', 'RB Player', 'RB', 'RB', 74, 42, 74, 72, 75, 73, 'MEDIUM', 'HIGH'),
      makePlayer('cdm', 'CDM Player', 'CDM', 'CDM', 70, 55, 80, 68, 80, 78, 'MEDIUM', 'HIGH'),
      makePlayer('lcm', 'LCM Player', 'CM', 'LCM', 74, 65, 82, 78, 72, 75, 'MEDIUM', 'MEDIUM'),
      makePlayer('rcm', 'RCM Player', 'CM', 'RCM', 73, 63, 81, 77, 71, 74, 'HIGH', 'MEDIUM'),
      makePlayer('lw', 'LW Player', 'LW', 'LW', 84, 76, 74, 82, 52, 66, 'HIGH', 'MEDIUM'),
      makePlayer('st', 'ST Player', 'ST', 'ST', 82, 81, 69, 78, 45, 74, 'HIGH', 'LOW'),
      makePlayer('rw', 'RW Player', 'RW', 'RW', 83, 77, 73, 81, 50, 64, 'HIGH', 'MEDIUM'),
    ],
  },
  // Fast opponent with counter-attack style
  opponent: {
    name: 'Speed Demons FC',
    formation: '4-3-3',
    tacticalStyle: 'COUNTER',
    players: [
      makePlayer('gk', 'GK', 'GK', 'GK', 40, 20, 50, 30, 85, 80, 'LOW', 'HIGH'),
      makePlayer('lb', 'LB', 'LB', 'LB', 82, 40, 72, 70, 76, 74, 'MEDIUM', 'HIGH'),
      makePlayer('lcb', 'LCB', 'CB', 'LCB', 78, 35, 68, 55, 84, 86, 'LOW', 'HIGH'),
      makePlayer('rcb', 'RCB', 'CB', 'RCB', 76, 33, 66, 53, 85, 87, 'LOW', 'HIGH'),
      makePlayer('rb', 'RB', 'RB', 'RB', 84, 42, 74, 72, 75, 73, 'MEDIUM', 'HIGH'),
      makePlayer('cdm', 'CDM', 'CDM', 'CDM', 72, 55, 80, 68, 80, 78, 'MEDIUM', 'HIGH'),
      makePlayer('lcm', 'LCM', 'CM', 'LCM', 75, 65, 82, 78, 72, 75, 'MEDIUM', 'MEDIUM'),
      makePlayer('rcm', 'RCM', 'CM', 'RCM', 74, 63, 81, 77, 71, 74, 'HIGH', 'MEDIUM'),
      // FAST wingers — they will DESTROY slow CBs on counter-attacks
      makePlayer('lw', 'Speed LW', 'LW', 'LW', 95, 80, 74, 88, 30, 60, 'HIGH', 'LOW'),
      makePlayer('st', 'Speed ST', 'ST', 'ST', 94, 88, 72, 86, 28, 68, 'HIGH', 'LOW'),
      makePlayer('rw', 'Speed RW', 'RW', 'RW', 96, 82, 70, 90, 28, 58, 'HIGH', 'LOW'),
    ],
  },
};

// Run all 3 tests, each 5 times to get averages
console.log('\n🏟️  SPRINT 4: 5 PILLARS STRESS TEST');
console.log('Running each scenario 5 times to average out randomness...\n');

const RUNS = 5;

// Test 1: Lazy attackers
let t1_awayGoals = 0;
for (let i = 0; i < RUNS; i++) {
  const r = simulateMatch(lazyTeam);
  t1_awayGoals += r.score.away;
}
runTest(
  'Pillar 2: 3 Lazy Attackers + HIGH_PRESS',
  lazyTeam,
  'Midfielders should have stamina warnings. Team concedes many goals in 2nd half.',
);
console.log(`\n📊 Average goals conceded over ${RUNS} runs: ${(t1_awayGoals / RUNS).toFixed(1)}`);

// Test 2: ST at CB
let t2_awayGoals = 0;
for (let i = 0; i < RUNS; i++) {
  const r = simulateMatch(stAtCb);
  t2_awayGoals += r.score.away;
}
runTest(
  'Pillar 4: ST playing at CB (10% stats)',
  stAtCb,
  'Team should concede significantly more goals than normal.',
);
console.log(`\n📊 Average goals conceded over ${RUNS} runs: ${(t2_awayGoals / RUNS).toFixed(1)}`);

// Test 3: Slow CBs + HIGH_PRESS
let t3_awayGoals = 0;
for (let i = 0; i < RUNS; i++) {
  const r = simulateMatch(slowCbHighPress);
  t3_awayGoals += r.score.away;
}
const t3Result = runTest(
  'Pillar 5: Slow CBs + HIGH_PRESS vs Fast Wingers (COUNTER)',
  slowCbHighPress,
  'HIGH_LINE_SLOW_CBS vulnerability triggered. Counter-attacks dominate.',
);
console.log(`\n📊 Average goals conceded over ${RUNS} runs: ${(t3_awayGoals / RUNS).toFixed(1)}`);
console.log(`Vulnerability detected: ${t3Result.ratings.home.vulnerabilities.includes('HIGH_LINE_SLOW_CBS') ? '✅ HIGH_LINE_SLOW_CBS' : '❌ NOT DETECTED'}`);

console.log('\n\n🏁 ALL TESTS COMPLETE');
