# Dream Coach - Sprint Board (MVP v1)

Status: active
Last updated: 2026-05-02
Planning horizon: 3 sprints (2 weeks each)

## Sprint 1 - Core Loop Stability
Goal: make one complete coach loop smooth and trustworthy.

Product:
- [ ] Finalize MVP flow copy and microcopy for all core screens
- [ ] Define realism acceptance checklist (10 scenario cases)

Frontend:
- [ ] Unify app shell (top bar + bottom nav) on all private pages
- [ ] Add Player Profile screen route and placeholder content
- [ ] Add Pre-Match Setup screen route and state handoff
- [ ] Fix all blocking click/overlay issues on mobile viewport

Backend:
- [ ] Lock API response shapes used by frontend in v1
- [ ] Add squad CRUD (minimal, auth user scope)
- [ ] Add match history endpoint (list + detail)

Simulation:
- [ ] Ensure deterministic replay plan (seed capture in match record)
- [ ] Calibrate first-half event density to target range

QA:
- [ ] Add smoke test script for full flow: login -> squad -> match -> report

Exit criteria:
- Core loop works end-to-end without dead ends
- No broken navigation on mobile

## Sprint 2 - Realism and Tactical Depth
Goal: make decisions feel meaningful and consequences clear.

Product:
- [ ] Define tactical warning taxonomy (left flank, right flank, midfield, transition)
- [ ] Define substitution recommendation quality rubric

Frontend:
- [ ] Improve Live Match readability hierarchy
- [ ] Add impact preview UI (before/after vectors and deltas)
- [ ] Add richer Match Report sections (worked/failed/recommendation)

Backend:
- [ ] Persist and return structured insight evidence per issue
- [ ] Add calibration profile switching support by key

Simulation:
- [ ] Tune role-fit penalties and stamina curves
- [ ] Tune tactical style modifiers (risk/reward)
- [ ] Validate vulnerability triggers against sample scenarios

Data:
- [ ] Run events calibration seed from `footbal events.zip`
- [ ] Store calibration metadata in MatchCalibrationProfile

QA:
- [ ] Add simulation tests: role fit, stamina decay, flank exposure, substitution delta
- [ ] Capture baseline golden snapshots for 5 seeded scenarios

Exit criteria:
- Tactical choices visibly change vectors and outcomes
- Warnings are actionable and consistent with events

## Sprint 3 - Beta Readiness and Retention Hooks
Goal: prepare closed beta and early retention loop.

Product:
- [ ] Define closed-beta onboarding and feedback funnel
- [ ] Prepare in-app feedback prompt after first report

Frontend:
- [ ] Community Challenges screen (daily challenge MVP)
- [ ] Saved Squads management polish
- [ ] Share result card polish (visual variants)

Backend:
- [ ] Daily challenge API (read-only v1)
- [ ] Telemetry event ingestion endpoint (minimal)

Analytics:
- [ ] Track funnel events:
- auth_completed
- squad_completed
- match_started
- coach_pause_opened
- substitution_applied
- match_finished
- report_shared

Legal/ops:
- [ ] Add internal note for licensing-safe production mode
- [ ] Add feature flags for real-name/photo usage per environment

QA:
- [ ] Performance pass on low-end Android targets
- [ ] Closed-beta bug bash checklist

Exit criteria:
- Closed beta candidate build ready
- Metrics pipeline captures core loop completion

## Risks to Monitor Every Sprint
- Simulation perceived as random/fake
- UI inconsistency or blocked controls
- Scope creep from non-MVP features
- Licensing exposure from real identities/assets

## Weekly Rituals
- Monday: scope gate and sprint commitment
- Wednesday: realism review on seeded scenarios
- Friday: demo + metrics + bug triage
