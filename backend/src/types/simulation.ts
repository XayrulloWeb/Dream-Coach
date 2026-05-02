export type WorkRate = 'LOW' | 'MEDIUM' | 'HIGH';

export type TacticalStyle =
  | 'BALANCED'
  | 'HIGH_PRESS'
  | 'COUNTER'
  | 'POSSESSION'
  | 'LOW_BLOCK';

export type Zone = 'left' | 'center' | 'right';

export type PlayerInput = {
  id: string;
  name: string;
  naturalPosition: string;
  rolePosition: string;
  preferredPositions?: string[];
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

export type TeamInput = {
  name: string;
  formation: string;
  tacticalStyle: TacticalStyle;
  players: PlayerInput[];
};

export type TeamRatings = {
  control: number;
  chanceCreation: number;
  defensiveWall: number;
  transitionDefense: number;
  pressingPower: number;
  flankSecurity: Record<Zone, number>;
  attackingThreat: Record<Zone, number>;
  vulnerabilities: string[];
};

export type MatchIssue = {
  type: 'STAMINA_CRITICAL' | 'TACTICAL_VULNERABILITY' | 'MIDFIELD_LOSS' | 'TRANSITION_ALERT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  player?: string;
  zone?: Zone | 'MIDFIELD';
  message: string;
  suggestedActions: string[];
};

export type MidMatchInsight = {
  minute: number;
  score: string;
  issues: MatchIssue[];
};

export type MatchEvent = {
  minute: number;
  team: 'HOME' | 'AWAY' | 'SYSTEM';
  type: 'GOAL' | 'SHOT' | 'CARD' | 'INJURY' | 'TACTICAL_WARNING' | 'INSIGHT';
  message: string;
  zone?: Zone;
  player?: string;
};

export type TeamMatchStats = {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  bigChances: number;
};

export type SimulationInput = {
  team: TeamInput;
  opponent?: TeamInput;
  venue?: 'HOME' | 'AWAY' | 'NEUTRAL';
};

export type SimulationCalibration = {
  attackFrequencyMultiplier: number;
  goalProbabilityMultiplier: number;
  bigChanceMultiplier: number;
  cardRateMultiplier: number;
  injuryRateMultiplier: number;
  zoneBias: Record<Zone, number>;
};

export type SimulationResult = {
  score: {
    home: number;
    away: number;
  };
  stats: {
    home: TeamMatchStats;
    away: TeamMatchStats;
  };
  ratings: {
    home: TeamRatings;
    away: TeamRatings;
  };
  insights: MidMatchInsight[];
  events: MatchEvent[];
};

export type MatchStatus = 'PRE_MATCH' | 'PAUSED_FOR_COACH' | 'FINISHED';

export type Evidence = {
  zone?: Zone | 'MIDFIELD';
  opponentAttacksFromZone?: number;
  successfulOpponentAttacks?: number;
  playerStamina?: Record<string, number>;
  workRateMismatch?: boolean;
};

export type ExplainableIssue = MatchIssue & {
  evidence?: Evidence;
};

export type ExplainableInsight = Omit<MidMatchInsight, 'issues'> & {
  issues: ExplainableIssue[];
};

export type TeamVectors = {
  control: number;
  chanceCreation: number;
  defensiveWall: number;
  leftFlankRisk: number;
  rightFlankRisk: number;
  pressingPower: number;
};

export type SubstitutionAction = {
  playerOutId: string;
  playerInId: string;
  newRolePosition?: string;
};

export type MatchStateSnapshot = {
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
  ratings: {
    home: TeamRatings;
    away: TeamRatings;
  };
  events: MatchEvent[];
  insights: ExplainableInsight[];
};

export type MatchStartResponse = MatchStateSnapshot & {
  suggestedActions: SubstitutionAction[];
};

export type TacticalImpactPreview = {
  before: TeamVectors;
  after: TeamVectors;
  deltas: {
    controlDelta: number;
    chanceCreationDelta: number;
    defenseDelta: number;
    leftRiskDelta: number;
    rightRiskDelta: number;
    pressingDelta: number;
  };
};

export type MatchSubstitutionResponse = {
  matchId: string;
  minute: number;
  status: MatchStatus;
  impactPreview: TacticalImpactPreview;
  team: TeamInput;
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

export type MatchFinalReport = SimulationResult & {
  status: MatchStatus;
  playerRatings: PlayerMatchRating[];
  goals: MatchGoalSummary[];
  mvp: PlayerMatchRating | null;
};

export type MatchResumeResponse = {
  matchId: string;
  minute: number;
  status: MatchStatus;
  report: MatchFinalReport;
};

export type MatchPausedStateResponse = {
  matchId: string;
  minute: number;
  status: 'PAUSED_FOR_COACH';
  pauseState: MatchStartResponse;
};

export type MatchFinishedStateResponse = {
  matchId: string;
  minute: number;
  status: 'FINISHED';
  report: MatchFinalReport;
};

export type MatchStateResponse = MatchPausedStateResponse | MatchFinishedStateResponse;
