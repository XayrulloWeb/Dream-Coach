import type { MatchFinalReport, TeamInput } from '../types/simulation';

type GeminiSummary = MatchFinalReport['tacticalSummary'];
type GeminiCoachCard = NonNullable<MatchFinalReport['coachCard']>;

type GeminiExplanation = {
  tacticalSummary: GeminiSummary;
  coachCard?: Partial<GeminiCoachCard>;
  mvpReason?: string;
};

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export async function generateGeminiMatchExplanation(input: {
  report: Omit<MatchFinalReport, 'tacticalSummary' | 'coachCard'>;
  hasSubstitutions: boolean;
  team: TeamInput;
}): Promise<GeminiExplanation | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
  const baseUrl =
    process.env.GEMINI_API_URL?.trim() ||
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const url = baseUrl.includes('?') ? `${baseUrl}&key=${encodeURIComponent(apiKey)}` : `${baseUrl}?key=${encodeURIComponent(apiKey)}`;

  const compactFacts = {
    score: input.report.score,
    stats: input.report.stats,
    tacticalStyle: input.team.tacticalStyle,
    formation: input.team.formation,
    hasSubstitutions: input.hasSubstitutions,
    vulnerabilities: input.report.ratings.home.vulnerabilities ?? [],
    insights: input.report.insights.map((insight) => ({
      minute: insight.minute,
      issues: insight.issues.map((issue) => ({
        type: issue.type,
        severity: issue.severity,
        message: issue.message,
      })),
    })),
    goals: input.report.goals,
    topRatings: input.report.playerRatings.slice(0, 3).map((item) => ({
      name: item.name,
      rating: item.rating,
      goals: item.stats.goals,
      assists: item.stats.assists,
    })),
    mvp: input.report.mvp,
  };

  const prompt = [
    'You are a football tactical analyst for Dream Coach.',
    'Use ONLY the facts provided below. Do not invent players, scores, events, or causes.',
    'Return strictly valid JSON with this shape:',
    '{',
    '  "tacticalSummary": {',
    '    "whatWorked": ["..."],',
    '    "whatFailed": ["..."],',
    '    "keyDecision": "...",',
    '    "nextMatchAdvice": ["..."]',
    '  },',
    '  "coachCard": {',
    '    "keyDecision": "...",',
    '    "tacticalTag": "BALANCED|HIGH_PRESS|COUNTER|POSSESSION|LOW_BLOCK"',
    '  },',
    '  "mvpReason": "..."',
    '}',
    'Constraints:',
    '- 1 to 3 items in each list.',
    '- Keep each sentence short and concrete.',
    '- If data is missing, stay conservative and generic.',
    '',
    `Facts: ${JSON.stringify(compactFacts)}`,
  ].join('\n');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as GeminiApiResponse;
    const text = payload.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text;

    if (!text) {
      return null;
    }

    const parsed = safeJsonParse(stripCodeFence(text));
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return sanitizeGeminiOutput(parsed as Record<string, unknown>, input.team.tacticalStyle);
  } catch {
    return null;
  }
}

function sanitizeGeminiOutput(raw: Record<string, unknown>, defaultStyle: TeamInput['tacticalStyle']): GeminiExplanation | null {
  const summaryRaw = raw.tacticalSummary;
  if (!summaryRaw || typeof summaryRaw !== 'object') {
    return null;
  }

  const summaryObj = summaryRaw as Record<string, unknown>;
  const whatWorked = sanitizeList(summaryObj.whatWorked);
  const whatFailed = sanitizeList(summaryObj.whatFailed);
  const nextMatchAdvice = sanitizeList(summaryObj.nextMatchAdvice);
  const keyDecision = sanitizeOptionalString(summaryObj.keyDecision);

  if (!whatWorked.length || !whatFailed.length || !nextMatchAdvice.length) {
    return null;
  }

  const coachCardRaw = raw.coachCard && typeof raw.coachCard === 'object'
    ? (raw.coachCard as Record<string, unknown>)
    : null;

  let coachCard: Partial<GeminiCoachCard> | undefined;
  if (coachCardRaw) {
    const keyDecision = sanitizeOptionalString(coachCardRaw.keyDecision);
    coachCard = {
      tacticalTag: sanitizeTacticalTag(coachCardRaw.tacticalTag, defaultStyle),
      ...(keyDecision ? { keyDecision } : {}),
    };
  }

  const mvpReason = sanitizeOptionalString(raw.mvpReason);

  return {
    tacticalSummary: {
      whatWorked,
      whatFailed,
      ...(keyDecision ? { keyDecision } : {}),
      nextMatchAdvice,
    },
    ...(coachCard ? { coachCard } : {}),
    ...(mvpReason ? { mvpReason } : {}),
  };
}

function sanitizeList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const cleaned = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
    .slice(0, 3);

  return cleaned;
}

function sanitizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function sanitizeTacticalTag(value: unknown, fallback: TeamInput['tacticalStyle']): TeamInput['tacticalStyle'] {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();
  if (
    normalized === 'BALANCED' ||
    normalized === 'HIGH_PRESS' ||
    normalized === 'COUNTER' ||
    normalized === 'POSSESSION' ||
    normalized === 'LOW_BLOCK'
  ) {
    return normalized;
  }

  return fallback;
}

function stripCodeFence(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed.replace(/^```[a-zA-Z]*\s*/, '').replace(/```$/, '').trim();
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
