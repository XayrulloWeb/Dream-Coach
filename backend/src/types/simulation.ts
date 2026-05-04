export type WorkRate = 'LOW' | 'MEDIUM' | 'HIGH';

export type TacticalStyle =
  | 'BALANCED'
  | 'HIGH_PRESS'
  | 'COUNTER'
  | 'POSSESSION'
  | 'LOW_BLOCK';

export type Zone = 'left' | 'center' | 'right';

// ===== Core Engine 3.0: Zone Vectors =====
export type ZoneVector = {
  attack: number;
  defense: number;
  control: number;
  transitionRisk: number;
};

export type ZoneGrid = {
  leftAttack: ZoneVector;
  centerAttack: ZoneVector;
  rightAttack: ZoneVector;
  leftMidfield: ZoneVector;
  centerMidfield: ZoneVector;
  rightMidfield: ZoneVector;
  leftDefense: ZoneVector;
  centerDefense: ZoneVector;
  rightDefense: ZoneVector;
};

// ===== Core Engine 3.0: Position Fit Split =====
export type PositionFitResult = {
  overallFit: number;
  attackingFit: number;
  defensiveFit: number;
};

// ===== Core Engine 3.0: Player Roles =====
export type PlayerRole =
  | 'POACHER' | 'PRESSING_FORWARD' | 'COMPLETE_FORWARD' | 'FALSE_NINE' | 'TARGET_MAN'
  | 'INSIDE_FORWARD' | 'WIDE_PLAYMAKER' | 'TRADITIONAL_WINGER'
  | 'DEEP_PLAYMAKER' | 'BOX_TO_BOX' | 'BALL_WINNER' | 'ADVANCED_PLAYMAKER'
  | 'ANCHOR' | 'MEZZALA'
  | 'INVERTED_FULLBACK' | 'OVERLAPPING_FULLBACK' | 'DEFENSIVE_FULLBACK'
  | 'BALL_PLAYING_CB' | 'STOPPER'
  | 'SWEEPER_KEEPER' | 'SHOT_STOPPER'
  | 'DEFAULT';

// ===== Core Engine 3.0: Match Momentum =====
export type MoraleLevel = 'HIGH' | 'NEUTRAL' | 'LOW';

export type MatchMomentum = {
  homeScoreDiff: number;
  minute: number;
  homeMorale: MoraleLevel;
  awayMorale: MoraleLevel;
  momentumSwing: number; // -10 to +10, positive = home momentum
};

// ===== Core Engine 3.0: Tactical Rule Engine =====
export type TacticalRuleEffect = {
  controlDelta?: number;
  chanceCreationDelta?: number;
  defensiveWallDelta?: number;
  transitionDefenseDelta?: number;
  pressingPowerDelta?: number;
  flankSecurityLeftDelta?: number;
  flankSecurityRightDelta?: number;
  opponentChanceBoost?: number;
  vulnerability?: string;
};

export type PlayerInput = {
  id: string;
  name: string;
  naturalPosition: string;
  rolePosition: string;
  preferredPositions?: string[];
  isSubstitute?: boolean;
  role?: PlayerRole;
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
  // Core Engine 3.0 additions
  zoneGrid?: ZoneGrid;
  appliedRules?: string[];
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

export type TacticsConfig = {
  pressing: number;      // 1-100
  defensiveLine: number; // 1-100
  tempo: number;         // 1-100
  width: number;         // 1-100
};

export type SimulationInput = {
  team: TeamInput;
  opponent?: TeamInput;
  venue?: 'HOME' | 'AWAY' | 'NEUTRAL';
  realismFactor?: number; // 0.0 to 1.0, default 0.85 (85% logic, 15% noise)
  tacticsConfig?: TacticsConfig;
};

export type SimulationCalibration = {
  attackFrequencyMultiplier: number;
  goalProbabilityMultiplier: number;
  bigChanceMultiplier: number;
  cardRateMultiplier: number;
  injuryRateMultiplier: number;
  zoneBias: Record<Zone, number>;
};

export type PlayerStaminaEntry = {
  playerId: string;
  name: string;
  position: string;
  stamina: number;
};

export type PlayerPauseStatus = 'FRESH' | 'OK' | 'TIRED' | 'CRITICAL';

export type PlayerPauseState = {
  playerId: string;
  name: string;
  position: string;
  rating: number;
  stamina: number;
  status: PlayerPauseStatus;
  reasons: string[];
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
  playerStaminaSnapshot?: PlayerStaminaEntry[];
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
  playerStates?: PlayerPauseState[];
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
  name: string;
  position: string;
  rating: number;
  minutesPlayed: number;
  stats: {
    goals: number;
    assists: number;
    shots: number;
    keyPasses: number;
    tackles: number;
    interceptions: number;
    saves?: number;
  };
  ratingReasons: string[];
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
  mvp: {
    playerId: string;
    name: string;
    rating: number;
    reason: string;
  } | null;
  tacticalSummary: {
    whatWorked: string[];
    whatFailed: string[];
    keyDecision?: string;
    nextMatchAdvice: string[];
  };
  coachCard?: {
    title: string;
    score: string;
    formation: string;
    mvp: { name: string; rating: number } | null;
    keyDecision: string;
    tacticalTag: string;
  };
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
