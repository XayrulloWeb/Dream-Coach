# Football Dream Coach - Product & MVP Spec (v1)

## 1) Product Positioning
AI-powered football coach simulator where fans build dream squads, make tactical decisions, simulate realistic matches, and challenge friends.

Not positioning as:
- classic Fantasy Football
- FIFA/PES-style gameplay

## 2) MVP Scope Strategy

### MVP v0.1 (first release, mandatory)
- Guest Mode
- Squad Builder
- Formation + Tactics
- Match Setup
- Live Match (simulated presentation)
- Tactical Pause (60-75)
- Substitution Modal
- Match Report
- Share Card
- Saved Squads (local)

### MVP v0.2 (after core-loop validation)
- Auth
- Daily Challenge Lite
- Profile
- Leaderboard Lite
- Pro logic (limits/unlocks)

Decision: `Guest first, Auth later`.

## 3) Core Loop
Build -> Tactics -> Simulate to pause -> Substitute -> Finish -> Report -> Share

## 4) Match Lifecycle (stateful, non-realtime)
No true 90-minute realtime and no required WebSocket for MVP.

Backend flow:
1. `POST /api/match/start`
- Simulate until pause checkpoint.
- Return `eventsUntilPause`, `pauseState`, partial stats.
2. `POST /api/match/:id/substitutions`
- Apply substitutions and tactical changes.
- Return updated state + impact confirmation.
3. `POST /api/match/:id/resume`
- Simulate to full-time.
- Return final report.

Frontend flow:
- Animate timeline/minute progression locally with delay.
- Server remains source of truth for outcomes.

## 5) Explainability Contract (mandatory)
Every warning, insight, and report conclusion must be based on engine-generated evidence.
AI receives structured facts only and cannot invent:
- causes
- events
- scores
- player performance

Example:

```json
{
  "issue": "LEFT_FLANK_EXPOSED",
  "severity": "HIGH",
  "evidence": {
    "zone": "left",
    "opponentAttacksFromZone": 7,
    "successfulOpponentAttacks": 4,
    "playerStamina": {
      "Alba": 34,
      "Neymar": 58
    },
    "workRateMismatch": true
  },
  "suggestedActions": [
    "Replace Neymar with Di Maria",
    "Lower defensive line",
    "Switch to 4-1-4-1"
  ]
}
```

## 5.1) Engine Naming & Math Rules
- Use `ChanceCreation` / `AttackingThreat` (not `AttackRisk`).
- Keep `TransitionDefense` as a first-class rating.
- Apply zonal penalties first, global penalties second.
- Use smooth penalties (no hard fixed drop as single constant).
- Use probabilistic rolls via rating-diff mapping (logistic), not raw 50/50 random.

## 6) Player Rating Logic (MVP)
Base:
- `baseRating = 6.5`

Additions:
- goal: `+0.7`
- assist: `+0.4`
- key pass: `+0.15`
- big chance created: `+0.25`
- save (GK): `+0.15`
- big save (GK): `+0.45`
- defensive action: `+0.08`

Penalties:
- error leading to chance: `-0.3`
- error leading to goal: `-0.8`
- stamina below 35: `-0.2`
- poor position fit: `-0.2` to `-0.5`

Clamp recommended:
- `min 3.0`, `max 10.0`

## 6.1) Position Fit & Stamina Curves
- `position_fit` must affect attack/control/defense contribution.
- Stamina impact is smooth:
- 100-70: near full output
- 70-50: mild degradation
- 50-35: medium degradation
- <35: heavy degradation

## 7) Assist/Event Attribution (MVP)
Goal event fields:

```ts
{
  goalScorerId: string;
  assistPlayerId?: string;
  preAssistPlayerId?: string;
  zone: "LEFT" | "CENTER" | "RIGHT";
  chanceQuality: number;
}
```

Rules:
- Assist exists for pass/cross/through-ball chains.
- Assist may be absent for rebound/solo/penalty outcomes.

## 8) Core Domain Entities
- User
- Squad
- Player
- Formation
- Tactics
- Match
- MatchState
- MatchEvent
- Substitution
- PlayerMatchRating
- TacticalInsight
- ShareCard

## 9) Match State Model

```ts
type MatchState = {
  matchId: string;
  seed: string;
  minute: number;
  score: { home: number; away: number };
  lineups: { home: LineupState; away: LineupState };
  teamVectors: { home: TeamVectors; away: TeamVectors };
  stamina: Record<string, number>;
  morale: Record<string, number>;
  momentum: MomentumPoint[];
  events: MatchEvent[];
  insights: TacticalInsight[];
  status: "PRE_MATCH" | "LIVE" | "PAUSED_FOR_COACH" | "FINISHED";
};
```

## 10) Substitution as Domain Entity

```ts
type Substitution = {
  id: string;
  matchId: string;
  minute: number;
  teamId: string;
  playerOutId: string;
  playerInId: string;
  oldPosition?: string;
  newPosition?: string;
  formationBefore: string;
  formationAfter: string;
  impactPreview: {
    controlDelta: number;
    attackDelta: number;
    defenseDelta: number;
    leftRiskDelta: number;
    rightRiskDelta: number;
    staminaDelta: number;
  };
};
```

## 11) Tactical Impact Preview (UX requirement)
Before confirm:
- Control delta
- Chance creation delta
- Defense wall delta
- Flank risk deltas
- Pressing delta

Example:

```json
{
  "before": {
    "control": 72,
    "chanceCreation": 78,
    "defenseWall": 69,
    "leftFlankRisk": 82
  },
  "after": {
    "control": 75,
    "chanceCreation": 74,
    "defenseWall": 77,
    "leftFlankRisk": 48
  }
}
```

## 12) Tactics Controls (MVP)
Manual sliders:
- Pressing
- Defensive Line
- Tempo
- Width

`Risk level` is preset-derived for MVP (not separate slider).

## 13) Missing Pieces for "Real Coach Feeling"
1. Stateful lifecycle: `pre_match -> simulated_to_pause -> paused_for_coach -> resumed -> finished`.
2. Substitution system recalculating formation, position fit, stamina, chemistry, and team vectors.
3. Live player rating model.
4. Goal/chance attribution with zone/source/chance quality.
5. Explainability contract enforcement.
6. Tactical impact preview before confirmation.

## 14) MVP Constraints
Out of first release:
- real player database at scale
- official club logos/photos and licensed branding
- full league ecosystem

Reason: speed, legal safety, and core-loop validation first.

## 15) Immediate Build Order
1. Introduce `MatchState` and stateful endpoints (`start/substitutions/resume`).
2. Add substitution domain model + impact preview calculation.
3. Add player match rating and assist attribution in engine output.
4. Add explainability payload from engine and keep AI layer read-only to facts.

## 16) Data Strategy (MVP -> v2)
We need two independent data layers:
1. `Player attributes` dataset for engine input.
2. `Match/events` dataset for probability calibration.

### 16.1) MVP v1 player source
Primary source:
- FIFA-style dataset (`FIFA 22 complete` or `FIFA 2025` style structure).

Required fields:
- `name`, `full_name`, `age`
- `player_positions`, `best_position`
- `overall`, `potential`
- `pac`, `sho`, `pas`, `dri`, `def`, `physic`
- `stamina`, `strength`, `vision`, `crossing`, `finishing`, `interceptions`, `positioning`
- `attacking_work_rate`, `defensive_work_rate`
- `preferred_foot`, `weak_foot`, `skill_moves`

Usage:
- squad builder cards
- zonal team vectors
- work-rate penalties
- position-fit logic
- stamina curves

### 16.2) MVP v1.5 calibration source
Secondary source:
- football events dataset (large event-level history from top leagues).

Usage:
- tune `attacks/minute`, `shots/chance`, `goals/shot`, card frequency
- tune zone attack distribution
- reduce fake/random feel

Important:
- event dataset calibrates probabilities, not player cards.

### 16.3) MVP v2 season-form source
Optional source:
- current season player stats (for form updates).

Usage:
- temporary form modifiers
- freshness/recency boosts or drops
- dynamic challenges

### 16.4) Import pipeline rules
1. Import player CSV into `Player`.
2. Track each import in `DatasetImportRun`.
3. Store calibrated probability packs in `MatchCalibrationProfile`.
4. Keep engine deterministic per match `seed`; calibration only changes base coefficients.
