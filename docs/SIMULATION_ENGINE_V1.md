# Dream Coach - Simulation Engine v1 (Formulas and Rules)

Status: implementation-aligned
Last updated: 2026-05-02
Sources: backend/src/services/simulation.engine.ts, backend/src/services/match.session.ts

## 1. Design Principles
- Numeric engine decides outcomes.
- LLM explains outcomes only.
- Same input + same random seed strategy should be replayable in future versions.
- Tactical imbalance must produce measurable risk, not only narrative text.

## 2. Input Model
Input object:
- team: TeamInput
- opponent: TeamInput (optional, fallback generated if absent)
- venue: HOME | AWAY | NEUTRAL

Player attributes used directly:
- pac, sho, pas, dri, def, phy
- stamina
- attackWorkRate, defenseWorkRate
- naturalPosition, rolePosition, preferredPositions

## 3. Runtime Transformations
Per player runtime fields:
- currentStamina initialized from stamina (clamped)
- normalized uppercase positions

Per minute stamina drain:
- base drain ~= 0.42
- multiplied by tactical style multiplier
- multiplied by role load (ATT > MID > DEF)
- extra late-game penalty at 55+ and 70+

Style stamina multipliers (current code):
- HIGH_PRESS: 1.9
- POSSESSION: 1.28
- COUNTER: 1.08
- LOW_BLOCK: 0.86
- BALANCED: 1.0

## 4. Position Fit and Work Rate Multipliers
Position fit:
- Exact role/natural/preferred match: 1.00
- Same band (DEF/MID/ATT): 0.82
- Adjacent bands (DEF<->MID, MID<->ATT): 0.68
- Far mismatch (or GK mismatch): 0.55

Work rate factors:
- HIGH: 1.08
- MEDIUM: 1.00
- LOW: 0.84

Stamina modifier (piecewise):
- 70+: 1.00
- 50-69: gently decays to ~0.90
- 35-49: drops to ~0.80
- <35: floor around 0.60-0.80 band (clamped)

## 5. Team Rating Formulas
Raw player contributions:
- attackValue = weighted(pac,dri,sho,pas,phy) * fit * staminaFactor * attackWork
- defenseValue = weighted(def,phy,pac,pas,dri,sho) * fit * staminaFactor * defenseWork
- controlValue = weighted(pas,dri,phy,pac,def,sho) * fit * staminaFactor

Team aggregate vectors:
- control
- chanceCreation
- defensiveWall
- transitionDefense
- pressingPower
- flankSecurity[left,center,right]
- attackingThreat[left,center,right]

Style modifiers (current code):
HIGH_PRESS:
- control +3
- chanceCreation +7
- defensiveWall -4
- transitionDefense -8
- pressingPower +12

COUNTER:
- control -8
- chanceCreation +6
- defensiveWall +3
- transitionDefense +10
- pressingPower -2

POSSESSION:
- control +12
- chanceCreation +2
- defensiveWall -2
- transitionDefense -4
- pressingPower +2

LOW_BLOCK:
- control -12
- chanceCreation -5
- defensiveWall +10
- transitionDefense +12
- pressingPower -10

Structural vulnerability penalties:
- Many attackers with LOW defensive work rate penalize defensiveWall and transitionDefense.
- Left/right flank exposure if side is attack-heavy + low defensive work + low zone security.
- Midfield overloaded if fewer than 3 midfield roles.

## 6. Minute-by-Minute Match Loop
For each minute 1..90:
1. Drain stamina both teams
2. Recompute team ratings
3. Resolve possession probability via control diff + venue bonus
4. Attempt attack by attackFrequency formula
5. If attack occurs:
- Pick attack zone from threat profile and calibration zone bias
- Compare attackPower vs zone defensePower
- Resolve chance created
- Resolve big chance
- Resolve shot quality vs save score
- Update xG and shot stats
- Resolve on-target and goal
- Emit GOAL or SHOT event
6. Optionally emit discipline events (card/injury)
7. At minute 60 create INSIGHT and TACTICAL_WARNING events

## 7. Key Probabilities
Possession chance:
- sigmoid(control_diff_with_venue_bonus)

Attack frequency:
- clamp((0.09 + chanceCreation/190 + pressing/560 - oppDefWall/430) * calibration.attackFrequencyMultiplier, 0.08, 0.42)

Big chance:
- clamp((0.16 + shotQualityBoost/180) * calibration.bigChanceMultiplier, 0.08, 0.72)

Goal probability:
- sigmoid((shotScore - saveScore) / 1.1)
- adjusted by big chance factor and calibration.goalProbabilityMultiplier
- clamped 0.05..0.92

Discipline risks:
- card risk grows with pressing
- injury risk grows when low stamina exists

## 8. Mid-Match Coach Insight Rules (minute 60)
Issues generated from measurable state:
- STAMINA_CRITICAL (currentStamina < 35)
- TACTICAL_VULNERABILITY (left/right exposure)
- MIDFIELD_LOSS (low possession or weaker control)
- TRANSITION_ALERT (weak transitionDefense)

Each issue includes:
- severity
- zone/player where applicable
- suggestedActions list

Evidence augmentation (match.session):
- attacks from issue zone
- successful attacks from zone
- stamina sample for players in zone
- work rate mismatch flag

## 9. Substitution Impact Logic
At pause:
- apply substitutions to team runtime
- optional tacticalStyle switch
- recompute team vectors before vs after
- return deltas:
- controlDelta
- chanceCreationDelta
- defenseDelta
- leftRiskDelta
- rightRiskDelta
- pressingDelta

Then resume uses merged simulation approach:
- First half from original pause snapshot
- Second half from adjusted simulation
- Stats reconciled into final report

## 10. Player Ratings in Report
Base starter rating around 6.5 with penalties for poor position fit and low stamina.
Event-driven modifiers:
- goal: +0.7
- assist: +0.4
- shot on target (saved): +0.15
- missed shot: -0.08
- yellow card: -0.3
- injury event: -0.2
Final rating clamped to [3.0, 10.0].
Top rating becomes MVP.

## 11. Calibration Layer
Stored in MatchCalibrationProfile payload:
- attackFrequencyMultiplier
- goalProbabilityMultiplier
- bigChanceMultiplier
- cardRateMultiplier
- injuryRateMultiplier
- zoneBias left/center/right

Use cases:
- Recalibrate realism from events dataset without rewriting engine code
- Run A/B calibration profiles

## 12. Determinism and Testing Plan
Current code uses Math.random directly.
For stricter reproducibility in v1.1:
- introduce seeded RNG abstraction
- persist seed in match start
- replay exact event stream for debugging

Minimum test suite:
- position fit multiplier cases
- stamina drain by style and minute
- flank exposure trigger thresholds
- midfield overload trigger
- substitution delta correctness
- report rating bounds and MVP selection
