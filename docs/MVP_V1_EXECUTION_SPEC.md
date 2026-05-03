# Dream Coach - MVP v1 Execution Spec

Status: execution-ready
Last updated: 2026-05-02
Owner: Product + Engineering
Related: ../PRODUCT_MVP_SPEC.md

## 1. Product Positioning
Dream Coach is an AI-powered football coach simulator.
It is not fantasy points tracking and not a 3D football gameplay app.
The user plays as coach, makes tactical decisions, and gets consequences from a deterministic simulation engine.

Core promise:
- Build a dream squad
- Pick formation and tactical style
- Run realistic match simulation
- Receive mid-match tactical pause and substitution choices
- Finish with honest post-match analysis

## 2. MVP v1 Goal and Success Criteria
Primary goal: validate core coaching loop quality.

Success criteria for closed beta:
- 60%+ of new users complete one full match loop
- 35%+ run 2nd simulation within same day
- 20%+ share at least one match result card
- User feedback on realism: avg >= 4/5

Anti-goal:
- Do not ship wide social graph, tournament system, or heavy monetization before loop retention is proven.

## 3. MVP v1 Scope
In scope:
- Auth: register, login, guest
- Home dashboard
- Squad builder
- Player selection with search, role filter, and fallback
- Formation and tactical style selection
- Live match simulation with minute, scoreboard, stats, timeline
- Coach pause at ~60'
- Manual and AI-suggested substitutions
- Match report with ratings, MVP, what worked/failed
- Save squad locally and match history locally
- Share result card

Out of scope for v1:
- Real-time multiplayer
- Full community feed
- Tournament ladders
- Marketplace or card economy
- Payment integration

## 4. Core User Flow (v1)
1. Open app
2. Login or continue as guest
3. Build squad
4. Pick formation and tactical style
5. Start match
6. Observe live events and tactical warnings
7. Receive coach pause
8. Apply substitution/tactical tweak
9. Resume to full time
10. Review report and share result

## 5. UX and Interaction Rules
Global UX rules:
- One visual language across all private screens
- One unified bottom navigation for mobile
- Critical actions always visible and never blocked by overlays
- Tactical warning must be specific and actionable
- Never show more than 3 primary options in coach pause

Live Match UX rules:
- Sticky high-priority info: score, minute, possession split
- Event timeline sorted by latest first in feed
- Warnings must include zone and impact
- Substitution UI must show out/in and projected vector delta

Report UX rules:
- Show objective stats first
- Show narrative analysis second
- Separate what worked and what failed
- Include one tactical recommendation for next match

## 6. Data Model Baseline (Current + v1 Needs)
Already in backend Prisma:
- User
- Player
- Squad
- SquadPlayer
- Match
- MatchStateSnapshot
- MatchEvent
- Substitution
- PlayerMatchRating
- MatchCalibrationProfile
- DatasetImportRun

v1 data policy:
- Persist match state and final report server-side
- Keep saved squads client-side for now (fast MVP)
- Add server-side squads in v1.1 after loop validation

## 7. Frontend Component System (v1)
Create/reuse these shared components:
- AppTopBar
- MobileBottomNav
- PlayerAvatar
- PlayerCardMini
- TacticalStyleChip
- StatMetricCard
- EventTimelineRow
- InsightWarningCard
- CoachActionButton
- ReportSummaryCard

Quality bar:
- No page-specific custom bottom navs
- No duplicated action buttons with conflicting behavior
- Touch targets >= 44px
- Safe-area aware layout on mobile

## 8. Simulation Principles
Non-negotiables:
- Numeric engine decides outcomes
- AI text explains outcomes, does not override scores
- Losses must happen naturally
- Tactical imbalance must produce explicit risk

Examples expected from engine:
- Too many low-def attackers -> transition risk up
- Weak flank protection -> flank exposure warnings
- Poor position fit -> player rating penalties
- High press -> more chance creation but higher stamina drain and defensive risk

## 9. Monetization Strategy (post-v1 validation)
Free:
- Daily simulation cap
- Limited saved squads
- Basic analysis

Pro:
- Unlimited simulations
- Advanced coach analysis
- Unlimited squads
- Challenge mode and deeper analytics
- Premium share-card templates

Monetization rule:
- Do not lock core realism loop behind paywall.

## 10. Risks and Mitigations
Risk: simulation feels fake.
Mitigation: deterministic seed, explicit formulas, transparent warnings, calibration profiles.

Risk: feature bloat kills delivery.
Mitigation: strict v1 scope gate and weekly acceptance review.

Risk: licensing issues with player images/names/logos.
Mitigation: production-safe mode with generic assets and legal review before public launch.

Risk: low retention after novelty.
Mitigation: daily challenges, smarter tactical variety, stronger post-match feedback loop.

## 11. Delivery Roadmap (8 weeks)
Week 1:
- Freeze scope and contracts
- Finish UI shell consistency

Week 2:
- Player flow quality pass (selection, role fit, cards, photos fallback)

Week 3:
- Simulation calibration pass (events, xG, warnings)

Week 4:
- Coach pause quality and substitution impact preview

Week 5:
- Match report polish and share card quality

Week 6:
- Daily challenge loop and telemetry events

Week 7:
- Closed beta prep, bug bash, performance pass

Week 8:
- Closed beta launch and iteration

## 12. Launch Strategy
Phase A: private alpha (20-50 users)
- Goal: verify realism and UX clarity

Phase B: closed beta (100-300 users)
- Goal: retention and share behavior

Phase C: public beta
- Goal: acquisition loops and monetization discovery

Mandatory instrumentation before beta:
- auth_completed
- squad_completed
- match_started
- coach_pause_opened
- substitution_applied
- match_finished
- report_shared

## 13. Immediate Build Backlog (next sprint)
- Add Player Profile screen and route
- Add Match Setup screen (pre-match context)
- Unify top navigation header component
- Add backend squads CRUD (minimal)
- Add simulation unit tests for:
- role fit penalty
- stamina decay by style
- flank exposure detection
- substitution impact deltas
