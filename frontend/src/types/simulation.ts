export type TacticalStyle = 'BALANCED' | 'HIGH_PRESS' | 'COUNTER' | 'POSSESSION' | 'LOW_BLOCK';
export type WorkRate = 'LOW' | 'MEDIUM' | 'HIGH';
export type Zone = 'left' | 'center' | 'right';

export type SimulationPlayer = {
  id: string;
  name: string;
  naturalPosition: string;
  rolePosition: string;
  preferredPositions: string[];
  isSubstitute?: boolean;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  stamina: number;
  attackWorkRate: WorkRate;
  defenseWorkRate: WorkRate;
};

export type SimulationTeam = {
  name: string;
  formation: string;
  tacticalStyle: TacticalStyle;
  players: SimulationPlayer[];
};

export type SimulationPayload = {
  team: SimulationTeam;
  opponent?: SimulationTeam;
  venue?: 'HOME' | 'AWAY' | 'NEUTRAL';
};

export type MatchEvent = {
  minute: number;
  team: 'HOME' | 'AWAY' | 'SYSTEM';
  type: 'GOAL' | 'SHOT' | 'CARD' | 'INJURY' | 'TACTICAL_WARNING' | 'INSIGHT';
  message: string;
  player?: string;
  zone?: Zone;
};

export type TeamMatchStats = {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  bigChances: number;
};

export type MatchIssue = {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  zone?: string;
  player?: string;
  message: string;
  suggestedActions: string[];
  evidence?: {
    zone?: string;
    opponentAttacksFromZone?: number;
    successfulOpponentAttacks?: number;
    playerStamina?: Record<string, number>;
    workRateMismatch?: boolean;
  };
};

export type MatchInsight = {
  minute: number;
  score: string;
  issues: MatchIssue[];
};

export type SimulationResponse = {
  score: {
    home: number;
    away: number;
  };
  stats: {
    home: TeamMatchStats;
    away: TeamMatchStats;
  };
  ratings: {
    home: {
      vulnerabilities: string[];
    };
    away?: {
      vulnerabilities: string[];
    };
  };
  insights: MatchInsight[];
  events: MatchEvent[];
};

export type MatchStatus = 'PRE_MATCH' | 'PAUSED_FOR_COACH' | 'FINISHED';

export type SubstitutionAction = {
  playerOutId: string;
  playerInId: string;
  newRolePosition?: string;
};

export type StartMatchResponse = {
  matchId: string;
  minute: number;
  status: MatchStatus;
  score: {
    home: number;
    away: number;
  };
  stats: {
    home: TeamMatchStats;
    away: TeamMatchStats;
  };
  ratings: SimulationResponse['ratings'];
  events: MatchEvent[];
  insights: MatchInsight[];
  suggestedActions: SubstitutionAction[];
};

export type SubstitutionResponse = {
  matchId: string;
  minute: number;
  status: MatchStatus;
  impactPreview: {
    before: {
      control: number;
      chanceCreation: number;
      defensiveWall: number;
      leftFlankRisk: number;
      rightFlankRisk: number;
      pressingPower: number;
    };
    after: {
      control: number;
      chanceCreation: number;
      defensiveWall: number;
      leftFlankRisk: number;
      rightFlankRisk: number;
      pressingPower: number;
    };
    deltas: {
      controlDelta: number;
      chanceCreationDelta: number;
      defenseDelta: number;
      leftRiskDelta: number;
      rightRiskDelta: number;
      pressingDelta: number;
    };
  };
  team: SimulationTeam;
};

export type PlayerMatchRating = {
  playerId: string;
  playerName: string;
  team: 'HOME' | 'AWAY';
  rating: number;
  goals: number;
  assists: number;
};

export type MatchGoalSummary = {
  minute: number;
  team: 'HOME' | 'AWAY';
  scorer: string;
  assist?: string;
  zone?: Zone;
  chanceQuality: number;
};

export type MatchFinalReport = SimulationResponse & {
  status: MatchStatus;
  playerRatings: PlayerMatchRating[];
  goals: MatchGoalSummary[];
  mvp: PlayerMatchRating | null;
};

export type ResumeMatchResponse = {
  matchId: string;
  minute: number;
  status: MatchStatus;
  report: MatchFinalReport;
};

export type MatchPausedStateResponse = {
  matchId: string;
  minute: number;
  status: 'PAUSED_FOR_COACH';
  pauseState: StartMatchResponse;
};

export type MatchFinishedStateResponse = {
  matchId: string;
  minute: number;
  status: 'FINISHED';
  report: MatchFinalReport;
};

export type MatchStateResponse = MatchPausedStateResponse | MatchFinishedStateResponse;
