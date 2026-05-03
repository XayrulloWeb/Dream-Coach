import { SubstitutionAction, TacticalStyle } from '../types/simulation';

type DeltaMap = {
  controlDelta: number;
  chanceCreationDelta: number;
  defenseDelta: number;
  leftRiskDelta: number;
  rightRiskDelta: number;
  pressingDelta: number;
};

export function explainSubstitutionImpact(
  deltas: DeltaMap,
  tacticalStyle?: TacticalStyle
): { summary: string; warningsResolved: string[]; newWarnings: string[] } {
  const warningsResolved: string[] = [];
  const newWarnings: string[] = [];
  const points: string[] = [];

  if (deltas.controlDelta > 5) points.push('increases midfield control');
  else if (deltas.controlDelta < -5) points.push('sacrifices some midfield control');

  if (deltas.chanceCreationDelta > 5) points.push('adds attacking threat');
  else if (deltas.chanceCreationDelta < -5) points.push('reduces chance creation');

  if (deltas.defenseDelta > 5) points.push('bolsters the defensive line');
  else if (deltas.defenseDelta < -5) points.push('weakens the defensive wall');

  if (deltas.leftRiskDelta < -5) {
    points.push('secures the left flank');
    warningsResolved.push('LEFT_FLANK_EXPOSED');
  } else if (deltas.leftRiskDelta > 10) {
    points.push('exposes the left flank');
    newWarnings.push('LEFT_FLANK_EXPOSED');
  }

  if (deltas.rightRiskDelta < -5) {
    points.push('secures the right flank');
    warningsResolved.push('RIGHT_FLANK_EXPOSED');
  } else if (deltas.rightRiskDelta > 10) {
    points.push('exposes the right flank');
    newWarnings.push('RIGHT_FLANK_EXPOSED');
  }

  let summary = 'This change ';
  if (points.length === 0) {
    summary += 'maintains the current tactical balance.';
  } else if (points.length === 1) {
    summary += points[0] + '.';
  } else if (points.length === 2) {
    summary += points[0] + ' and ' + points[1] + '.';
  } else {
    summary += points.slice(0, -1).join(', ') + ', and ' + points[points.length - 1] + '.';
  }

  if (tacticalStyle) {
    summary += ` Shifting to a ${tacticalStyle.replace('_', ' ')} approach will also adjust the team's mentality.`;
  }

  return { summary, warningsResolved, newWarnings };
}

export function explainMatchReport(
  simulation: any,
  mvp: any,
  hasSubstitutions: boolean,
  team: any
) {
  const whatWorked: string[] = [];
  const whatFailed: string[] = [];
  const nextMatchAdvice: string[] = [];
  let keyDecision = undefined;

  const isWin = simulation.score.home > simulation.score.away;
  const isLoss = simulation.score.home < simulation.score.away;

  // MVP impact
  if (mvp) {
    if (mvp.stats.goals > 0) {
      whatWorked.push(`${mvp.name}'s performance was decisive, securing ${mvp.stats.goals} goals.`);
      mvp.reason = 'Clinical finishing in the final third';
    } else if (mvp.stats.assists > 0) {
      whatWorked.push(`${mvp.name} orchestrated the attack perfectly with ${mvp.stats.assists} assists.`);
      mvp.reason = 'Elite chance creation and playmaking';
    } else {
      whatWorked.push(`${mvp.name} controlled the tempo and dominated their zone.`);
      mvp.reason = 'Outstanding overall contribution';
    }
  }

  // Tactical logic
  if (simulation.stats.home.possession > 55) {
    whatWorked.push('Dominating possession restricted opponent opportunities.');
  } else if (simulation.stats.home.possession < 45 && isWin) {
    whatWorked.push('Efficient counter-attacks compensated for lower possession.');
  }

  if (simulation.stats.home.shots >= 10 && simulation.score.home <= 1) {
    whatFailed.push('Poor conversion rate: created chances but failed to finish them.');
    nextMatchAdvice.push('Consider starting attackers with better finishing attributes.');
  }

  const staminaDrop = simulation.events.some((e: any) => e.type === 'INJURY' || e.type === 'TACTICAL_WARNING');
  if (staminaDrop) {
    whatFailed.push('High intensity led to severe stamina drops in the second half.');
    nextMatchAdvice.push('Rotate midfielders earlier or switch to a lower pressing style late in the game.');
  }

  if (isLoss) {
    whatFailed.push('Defensive structure broke down under sustained pressure.');
    nextMatchAdvice.push('Use a more conservative mentality or add a defensive midfielder against strong attacks.');
  }

  if (hasSubstitutions) {
    keyDecision = 'The 60th-minute coach intervention shifted the tactical balance of the remaining match.';
    whatWorked.push('Second-half tactical adjustments successfully countered opponent momentum.');
  } else {
    nextMatchAdvice.push('Don\'t forget to use the tactical pause at the 60th minute to respond to the match flow.');
  }

  if (whatWorked.length === 0) whatWorked.push('Solid overall performance with no major tactical flaws.');
  if (whatFailed.length === 0) whatFailed.push('No significant tactical failures detected.');
  if (nextMatchAdvice.length === 0) nextMatchAdvice.push('Maintain the current approach for the next match.');

  const coachCard = {
    title: 'DREAM COACH',
    score: `Dream FC ${simulation.score.home} - ${simulation.score.away} Rival`,
    formation: '4-3-3', // Placeholder for now
    mvp: mvp ? { name: mvp.name, rating: mvp.rating } : null,
    keyDecision: keyDecision || 'Maintained starting gameplan',
    tacticalTag: team.tacticalStyle,
  };

  return {
    tacticalSummary: {
      whatWorked,
      whatFailed,
      keyDecision,
      nextMatchAdvice,
    },
    coachCard,
  };
}
