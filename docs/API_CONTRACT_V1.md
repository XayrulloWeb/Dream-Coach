# Dream Coach - API Contract v1

Status: implementation-aligned
Last updated: 2026-05-02
Base URL: /api

## 1. Conventions
Content-Type: application/json

Headers:
- x-request-id (optional from client, always returned by backend)

Error shape:
{
  "code": "STRING_CODE",
  "message": "Human readable message"
}

## 2. Health
GET /health

Response 200:
{
  "status": "ok",
  "service": "dream-coach-backend",
  "time": "2026-05-02T12:00:00.000Z"
}

## 3. Auth
### POST /auth/register
Body:
{
  "username": "coach1",
  "email": "coach1@example.com",
  "password": "secret123"
}

Response 201:
{
  "token": "jwt",
  "user": {
    "id": "uuid",
    "username": "coach1",
    "email": "coach1@example.com"
  }
}

Errors:
- 400 AUTH_VALIDATION_ERROR
- 409 AUTH_USER_EXISTS
- 503 AUTH_SERVER_UNAVAILABLE

### POST /auth/login
Body:
{
  "emailOrUsername": "coach1",
  "password": "secret123"
}

Response 200:
{
  "token": "jwt",
  "user": {
    "id": "uuid",
    "username": "coach1",
    "email": "coach1@example.com"
  }
}

Errors:
- 400 AUTH_VALIDATION_ERROR
- 401 AUTH_INVALID_CREDENTIALS
- 503 AUTH_SERVER_UNAVAILABLE

### POST /auth/guest
Body: {}

Response 200:
{
  "token": "jwt",
  "user": {
    "id": "guest_...",
    "username": "Guest-1234",
    "email": null,
    "isGuest": true
  }
}

## 4. Players Catalog
### GET /players
Query params:
- q: string (optional)
- position: string (optional)
- page: number (optional, default 1)
- limit: number (optional, default 24, max 100)

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "name": "L. Messi",
      "fullName": "Lionel Messi",
      "faceUrl": "https://...",
      "age": 35,
      "realPosition": "RW",
      "preferredPositions": ["RW", "ST", "CF"],
      "rating": 91,
      "potential": 91,
      "pac": 85,
      "sho": 92,
      "pas": 91,
      "dri": 95,
      "def": 34,
      "phy": 65,
      "stamina": 72,
      "attackWorkRate": "LOW",
      "defenseWorkRate": "LOW",
      "preferredFoot": "LEFT",
      "weakFoot": 4,
      "skillMoves": 4
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 24,
    "total": 19630,
    "totalPages": 818
  }
}

Errors:
- 503 DB_UNAVAILABLE
- 500 INTERNAL_ERROR

## 5. Match Simulation
Note: this API is currently stateful with pause-at-60 flow.

### POST /match/simulate
Stateless one-shot simulation.

Body:
{
  "team": { ...TeamInput },
  "opponent": { ...TeamInput },
  "venue": "HOME"
}

Response 200:
- SimulationResult (score, stats, ratings, insights, events)

### POST /match/start
Starts stateful simulation and returns pause state.

Body:
{
  "team": { ...TeamInput },
  "opponent": { ...TeamInput },
  "venue": "HOME"
}

Response 200 (MatchStartResponse):
{
  "matchId": "uuid",
  "minute": 60,
  "status": "PAUSED_FOR_COACH",
  "score": { "home": 1, "away": 1 },
  "stats": { "home": { ... }, "away": { ... } },
  "ratings": { "home": { ... }, "away": { ... } },
  "events": [ ... ],
  "insights": [ ... ],
  "suggestedActions": [
    {
      "playerOutId": "uuid",
      "playerInId": "uuid",
      "newRolePosition": "CDM"
    }
  ]
}

Errors:
- 400 SIM_VALIDATION_ERROR
- 500 INTERNAL_ERROR

### POST /match/:matchId/substitutions
Body:
{
  "substitutions": [
    {
      "playerOutId": "uuid",
      "playerInId": "uuid",
      "newRolePosition": "CDM"
    }
  ],
  "tacticalStyle": "BALANCED"
}

Response 200 (MatchSubstitutionResponse):
{
  "matchId": "uuid",
  "minute": 60,
  "status": "PAUSED_FOR_COACH",
  "impactPreview": {
    "before": {
      "control": 72,
      "chanceCreation": 78,
      "defensiveWall": 64,
      "leftFlankRisk": 71,
      "rightFlankRisk": 53,
      "pressingPower": 82
    },
    "after": {
      "control": 76,
      "chanceCreation": 74,
      "defensiveWall": 70,
      "leftFlankRisk": 63,
      "rightFlankRisk": 50,
      "pressingPower": 77
    },
    "deltas": {
      "controlDelta": 4,
      "chanceCreationDelta": -4,
      "defenseDelta": 6,
      "leftRiskDelta": -8,
      "rightRiskDelta": -3,
      "pressingDelta": -5
    }
  },
  "team": { ...TeamInput }
}

Errors:
- 400 SIM_VALIDATION_ERROR
- 404 SIM_VALIDATION_ERROR with not found message
- 500 INTERNAL_ERROR

### POST /match/:matchId/resume
Body: {}

Response 200 (MatchResumeResponse):
{
  "matchId": "uuid",
  "minute": 90,
  "status": "FINISHED",
  "report": {
    "status": "FINISHED",
    "score": { "home": 2, "away": 1 },
    "stats": { "home": { ... }, "away": { ... } },
    "ratings": { "home": { ... }, "away": { ... } },
    "insights": [ ... ],
    "events": [ ... ],
    "playerRatings": [ ... ],
    "goals": [ ... ],
    "mvp": { ... } | null
  }
}

### GET /match/:matchId/state
Response 200:
- MatchPausedStateResponse or MatchFinishedStateResponse

Response 404:
{
  "code": "SIM_NOT_FOUND",
  "message": "Match state was not found"
}

## 6. Canonical Domain Types
WorkRate:
- LOW
- MEDIUM
- HIGH

TacticalStyle:
- BALANCED
- HIGH_PRESS
- COUNTER
- POSSESSION
- LOW_BLOCK

Zone:
- left
- center
- right

## 7. Planned v1.1 Endpoints (Not Implemented Yet)
- GET /me
- CRUD /squads
- GET /matches/history
- GET /challenges/daily
- POST /challenges/:id/run
- GET /leaderboard

These remain outside strict MVP v1 delivery gate.
