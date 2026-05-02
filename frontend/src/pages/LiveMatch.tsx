import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, toApiError } from '../lib/api';
import {
  loadSquadPayload,
  saveSquadPayload,
  DEFAULT_STARTERS,
  buildSimulationPayloadFromStarters,
} from '../lib/squad';
import { saveMatchToHistory } from '../lib/matchHistory';
import type {
  MatchStateResponse,
  MatchEvent,
  MatchFinalReport,
  MatchIssue,
  ResumeMatchResponse,
  SimulationPayload,
  StartMatchResponse,
  SubstitutionAction,
  SubstitutionResponse,
  TacticalStyle,
} from '../types/simulation';

const ACTIVE_MATCH_KEY = 'dc_active_match_id';
const LAST_MATCH_REPORT_KEY = 'dc_last_match_report';

function getInitialPayload(): SimulationPayload {
  return (
    loadSquadPayload() ??
    buildSimulationPayloadFromStarters(
      DEFAULT_STARTERS.map((player) => ({ id: player.id, name: player.name, rating: player.rating })),
      'HIGH_PRESS',
    )
  );
}

export default function LiveMatch() {
  const navigate = useNavigate();
  const [payload, setPayload] = useState<SimulationPayload>(() => getInitialPayload());
  const [matchId, setMatchId] = useState<string>('');
  const [pauseState, setPauseState] = useState<StartMatchResponse | null>(null);
  const [finalReport, setFinalReport] = useState<MatchFinalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastAdjustment, setLastAdjustment] = useState('');
  const [impactSummary, setImpactSummary] = useState('');
  const [manualOutId, setManualOutId] = useState('');
  const [manualInId, setManualInId] = useState('');
  const [manualRolePosition, setManualRolePosition] = useState('');
  const [manualStyle, setManualStyle] = useState<TacticalStyle | ''>('');

  const startMatch = async (nextPayload?: SimulationPayload) => {
    const requestPayload = nextPayload ?? payload;

    setLoading(true);
    setError('');
    setFinalReport(null);
    setLastAdjustment('');
    setImpactSummary('');

    try {
      const response = await api.post<StartMatchResponse>('/api/match/start', requestPayload);
      setMatchId(response.data.matchId);
      setPauseState(response.data);
      localStorage.setItem(ACTIVE_MATCH_KEY, response.data.matchId);
      if (nextPayload) {
        setPayload(nextPayload);
        saveSquadPayload(nextPayload);
      }
    } catch (err) {
      const apiError = toApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const resumeMatch = async () => {
    if (!matchId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post<ResumeMatchResponse>(`/api/match/${matchId}/resume`);
      setFinalReport(response.data.report);
      saveMatchToHistory(payload.team.name, payload.opponent?.name ?? 'Riverdale FC', response.data.report);
      localStorage.setItem(LAST_MATCH_REPORT_KEY, JSON.stringify(response.data.report));
      localStorage.removeItem(ACTIVE_MATCH_KEY);
    } catch (err) {
      const apiError = toApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const initialPayload = getInitialPayload();
      if (!active) {
        return;
      }

      setPayload(initialPayload);
      const savedMatchId = localStorage.getItem(ACTIVE_MATCH_KEY);
      if (savedMatchId) {
        try {
          const restored = await api.get<MatchStateResponse>(`/api/match/${savedMatchId}/state`);
          if (!active) {
            return;
          }

          if (restored.data.status === 'PAUSED_FOR_COACH') {
            setMatchId(savedMatchId);
            setPauseState(restored.data.pauseState);
            setFinalReport(null);
            setLoading(false);
            return;
          }

          setMatchId(savedMatchId);
          setFinalReport(restored.data.report);
          localStorage.setItem(LAST_MATCH_REPORT_KEY, JSON.stringify(restored.data.report));
          setLoading(false);
          localStorage.removeItem(ACTIVE_MATCH_KEY);
          return;
        } catch {
          localStorage.removeItem(ACTIVE_MATCH_KEY);
        }
      }

      await startMatch(initialPayload);
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const issues = pauseState?.insights?.[0]?.issues ?? [];
  const criticalIssue = issues[0];
  const displayed = finalReport ?? pauseState;
  const recentEvents = useMemo(() => (displayed?.events ?? []).slice(-10).reverse(), [displayed]);

  const starters = useMemo(() => payload.team.players.filter((player) => !player.isSubstitute), [payload]);
  const bench = useMemo(() => payload.team.players.filter((player) => player.isSubstitute), [payload]);

  const applySubstitutionRequest = async (
    substitutions: SubstitutionAction[],
    tacticalStyle: TacticalStyle | undefined,
    description: string,
  ) => {
    if (!matchId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post<SubstitutionResponse>(`/api/match/${matchId}/substitutions`, {
        substitutions,
        tacticalStyle,
      });

      const nextPayload: SimulationPayload = {
        ...payload,
        team: response.data.team,
      };

      setPayload(nextPayload);
      saveSquadPayload(nextPayload);
      setLastAdjustment(description);
      setImpactSummary(formatImpact(response.data));
      setManualOutId('');
      setManualInId('');
      setManualRolePosition('');
      setManualStyle('');

      setPauseState((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          suggestedActions: substitutions,
        };
      });
    } catch (err) {
      const apiError = toApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAiFix = async () => {
    if (!criticalIssue) {
      return;
    }

    const action = buildSubstitutionAction(payload, criticalIssue);
    if (!action) {
      setError('No valid substitution available for this suggestion.');
      return;
    }

    await applySubstitutionRequest(action.substitutions, action.tacticalStyle, action.description);
  };

  const handleApplyManualSub = async () => {
    if (!manualOutId || !manualInId) {
      setError('Select player out and player in first.');
      return;
    }

    if (manualOutId === manualInId) {
      setError('Player out and player in cannot be the same.');
      return;
    }

    const substitutions: SubstitutionAction[] = [
      {
        playerOutId: manualOutId,
        playerInId: manualInId,
        newRolePosition: manualRolePosition ? manualRolePosition.toUpperCase() : undefined,
      },
    ];

    const style = manualStyle || undefined;
    await applySubstitutionRequest(substitutions, style, 'Applied manual substitution and tactical tweak.');
  };

  return (
    <div className="bg-[#0b0f10] text-[#e0e3e5] min-h-screen pb-24 md:pb-0">
      <header className="fixed top-0 w-full z-50 bg-slate-950/60 backdrop-blur-xl border-b border-slate-800 flex justify-between items-center px-5 h-16">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1d2022]">
            <img
              alt="User Avatar"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnLSHADChhYGrMXbOQ94ISRgrOLgm7u75ezCahZ7BcmMRUxfNHtuceo2zIRyynWaDt_F6mab32uPZ2jEdgh_4T7HBxMsA_NryrjJzxywL7ILsSDzFwpZJVU7KcXAUvNVruUHLEoKegsAJVN6LNsJ4DzIaohsXJn9e8OHe0aYT-Z20qIAwxdFK8OdvXSXg8ay7tSOZ4GytkPkCF8-i-5a9K1N8EK5JevrfvkS_2Gg98UQvmkdPKpGmQcEtu4wa-_eXVMT8BT5ZHrmI"
            />
          </div>
          <h1 className="font-['Lexend'] font-black tracking-wider text-xl text-emerald-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
            DREAM COACH
          </h1>
        </div>

        <button
          onClick={() => void startMatch()}
          className="text-slate-400 hover:bg-slate-800/40 hover:text-emerald-400 transition-colors active:scale-95 duration-200 p-2 rounded-full"
          title="Re-simulate"
        >
          <span className="material-symbols-outlined">refresh</span>
        </button>
      </header>

      <main className="pt-20 px-5 md:px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        <section className="md:col-span-12 bg-[#10141599] backdrop-blur-xl border border-[#3d4a3d] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#22c55e1f] via-transparent to-[#93000a26] pointer-events-none" />

          <div className="flex items-center justify-center gap-8 w-full md:w-auto z-10">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-[#1d2022] rounded-full mb-2 flex items-center justify-center border border-[#4be27755] shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                <span className="material-symbols-outlined text-[#4be277] text-3xl">sports_soccer</span>
              </div>
              <span className="font-['Lexend'] text-lg">{payload.team.name}</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-xs tracking-widest text-[#4be277] mb-1">{finalReport ? "FULL TIME" : "PAUSE 60'"}</span>
              <div className="flex items-center gap-1 font-['Lexend'] text-3xl font-black">
                <span className="text-[#4be277] drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">{displayed?.score.home ?? '-'}</span>
                <span className="text-[#bccbb9]">-</span>
                <span className="text-[#e0e3e5]">{displayed?.score.away ?? '-'}</span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-[#1d2022] rounded-full mb-2 flex items-center justify-center border border-[#ef444455]">
                <span className="material-symbols-outlined text-[#ef4444] text-3xl">shield</span>
              </div>
              <span className="font-['Lexend'] text-lg">{payload.opponent?.name ?? 'Riverdale FC'}</span>
            </div>
          </div>

          <div className="flex gap-6 w-full md:w-auto justify-around md:justify-end z-10 border-t md:border-t-0 md:border-l border-[#3d4a3d] pt-4 md:pt-0 md:pl-4">
            <StatCompact
              label="Possession"
              primary={`${displayed?.stats.home.possession ?? '-'}%`}
              secondary={`vs ${displayed?.stats.away.possession ?? '-'}%`}
              primaryClass="text-[#4be277]"
            />
            <StatCompact
              label="Shots (OT)"
              primary={`${displayed?.stats.home.shots ?? '-'} (${displayed?.stats.home.shotsOnTarget ?? '-'})`}
              secondary={`vs ${displayed?.stats.away.shots ?? '-'} (${displayed?.stats.away.shotsOnTarget ?? '-'})`}
            />
            <StatCompact
              label="xG"
              primary={`${displayed?.stats.home.xg ?? '-'}`}
              secondary={`vs ${displayed?.stats.away.xg ?? '-'}`}
              primaryClass="text-[#4be277]"
            />
          </div>
        </section>

        <div className="md:col-span-8 flex flex-col gap-4">
          <section className="bg-[#10141599] backdrop-blur-xl border border-[#3d4a3d] rounded-xl p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="font-['Lexend'] text-2xl text-[#e0e3e5] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4be277]">strategy</span>
                Tactical View
              </h2>
              <div className="bg-[#4be2771a] text-[#4be277] border border-[#4be27733] px-3 py-1 rounded-full text-xs tracking-wider">
                {loading ? 'Simulating...' : finalReport ? 'Simulation Complete' : 'Coach Pause'}
              </div>
            </div>

            <div className="relative w-full aspect-[16/9] bg-[#1a2e22] rounded-lg border border-[#4be27733] overflow-hidden shadow-inner p-4">
              {criticalIssue && !finalReport ? (
                <div className="max-w-[85%] rounded-lg border border-[#ef4444] bg-[#ef444422] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-[#ef4444]">Tactical Warning</p>
                  <p className="text-xs text-[#e0e3e5] mt-1">{criticalIssue.message}</p>
                  {criticalIssue.evidence ? (
                    <p className="text-[11px] text-[#bccbb9] mt-2">
                      Evidence: attacks {criticalIssue.evidence.opponentAttacksFromZone ?? 0}, successful {criticalIssue.evidence.successfulOpponentAttacks ?? 0}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="max-w-[80%] rounded-lg border border-[#4be27755] bg-[#4be27714] px-3 py-2">
                  <p className="text-xs text-[#e0e3e5]">
                    {finalReport ? 'Match finished. Review report and ratings.' : 'No critical warning at minute 60.'}
                  </p>
                </div>
              )}

              {!!displayed?.ratings.home.vulnerabilities?.length && (
                <div className="mt-3 rounded-lg border border-[#f59e0b] bg-[#f59e0b22] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-[#f59e0b]">Detected vulnerabilities</p>
                  <p className="text-xs text-[#e0e3e5] mt-1">{displayed.ratings.home.vulnerabilities.join(', ')}</p>
                </div>
              )}
            </div>
          </section>

          {error && (
            <section className="bg-[#93000a33] border border-[#ef4444] rounded-xl p-4 text-[#ffdad6] text-sm">
              {error}
            </section>
          )}

          {!finalReport ? (
            <section className="bg-[#10141599] backdrop-blur-xl border border-[#3d4a3d] rounded-xl p-4 flex flex-col gap-4">
              <h2 className="font-['Lexend'] text-xl text-[#e0e3e5]">Mid-Match Insight (60')</h2>

              {pauseState?.insights?.[0]?.issues?.length ? (
                <div className="space-y-3">
                  {pauseState.insights[0].issues.map((issue) => (
                    <div key={`${issue.type}-${issue.message}`} className="bg-[#1d2022] border border-[#3d4a3d] rounded-lg p-3">
                      <p className="text-xs tracking-wider text-[#4be277]">{issue.severity}</p>
                      <p className="text-sm text-[#e0e3e5] mt-1">{issue.message}</p>
                      {!!issue.suggestedActions.length && (
                        <p className="text-xs text-[#bccbb9] mt-1">Fix: {issue.suggestedActions[0]}</p>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => void handleApplyAiFix()}
                    className="w-full rounded-lg border border-[#4be277] bg-[#4be27722] py-2 text-sm text-[#4be277] hover:bg-[#4be27733] transition-colors"
                  >
                    Apply Suggested Substitution
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[#bccbb9]">No issues generated for this simulation.</p>
              )}

              <div className="bg-[#1d2022] border border-[#3d4a3d] rounded-lg p-3 space-y-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[#4be277]">Manual Substitution</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={manualOutId}
                    onChange={(e) => setManualOutId(e.target.value)}
                    className="bg-[#101415] border border-[#3d4a3d] rounded px-3 py-2 text-sm"
                  >
                    <option value="">Player Out</option>
                    {starters.map((player) => (
                      <option key={player.id} value={player.id}>{player.name} ({player.rolePosition})</option>
                    ))}
                  </select>

                  <select
                    value={manualInId}
                    onChange={(e) => setManualInId(e.target.value)}
                    className="bg-[#101415] border border-[#3d4a3d] rounded px-3 py-2 text-sm"
                  >
                    <option value="">Player In</option>
                    {bench.map((player) => (
                      <option key={player.id} value={player.id}>{player.name} ({player.rolePosition})</option>
                    ))}
                  </select>

                  <input
                    value={manualRolePosition}
                    onChange={(e) => setManualRolePosition(e.target.value.toUpperCase())}
                    placeholder="New role (optional, e.g. CDM)"
                    className="bg-[#101415] border border-[#3d4a3d] rounded px-3 py-2 text-sm"
                  />

                  <select
                    value={manualStyle}
                    onChange={(e) => setManualStyle(e.target.value as TacticalStyle | '')}
                    className="bg-[#101415] border border-[#3d4a3d] rounded px-3 py-2 text-sm"
                  >
                    <option value="">Keep tactical style</option>
                    <option value="BALANCED">BALANCED</option>
                    <option value="HIGH_PRESS">HIGH_PRESS</option>
                    <option value="COUNTER">COUNTER</option>
                    <option value="POSSESSION">POSSESSION</option>
                    <option value="LOW_BLOCK">LOW_BLOCK</option>
                  </select>
                </div>

                <button
                  onClick={() => void handleApplyManualSub()}
                  className="w-full rounded-lg border border-[#60a5fa] bg-[#60a5fa22] py-2 text-sm text-[#bfdbfe] hover:bg-[#60a5fa33] transition-colors"
                >
                  Apply Manual Substitution
                </button>
              </div>

              <button
                onClick={() => void resumeMatch()}
                className="w-full rounded-lg border border-[#22c55e] bg-[#22c55e33] py-2 text-sm text-[#d1fae5] hover:bg-[#22c55e44] transition-colors"
              >
                Resume Match to Full Time
              </button>

              {lastAdjustment ? <p className="text-xs text-[#bccbb9]">{lastAdjustment}</p> : null}
              {impactSummary ? <p className="text-xs text-[#9ee6b2]">{impactSummary}</p> : null}
            </section>
          ) : (
            <section className="bg-[#10141599] backdrop-blur-xl border border-[#3d4a3d] rounded-xl p-4 flex flex-col gap-4">
              <h2 className="font-['Lexend'] text-xl text-[#e0e3e5]">Match Report</h2>

              <div className="bg-[#1d2022] border border-[#3d4a3d] rounded-lg p-3">
                <p className="text-xs text-[#4be277]">MVP</p>
                <p className="text-sm mt-1">{finalReport.mvp ? `${finalReport.mvp.playerName} (${finalReport.mvp.rating})` : 'No MVP'}</p>
              </div>

              <div className="bg-[#1d2022] border border-[#3d4a3d] rounded-lg p-3">
                <p className="text-xs text-[#4be277]">Goals & Assists</p>
                <div className="mt-2 space-y-1">
                  {finalReport.goals.length ? (
                    finalReport.goals.slice(0, 4).map((goal) => (
                      <p key={`${goal.minute}-${goal.scorer}`} className="text-xs text-[#e0e3e5]">
                        {goal.minute}' {goal.scorer}{goal.assist ? ` (A: ${goal.assist})` : ''}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-[#bccbb9]">No goals recorded.</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => navigate('/match-report')}
                className="w-full rounded-lg border border-[#4be277] bg-[#4be27722] py-2 text-sm text-[#4be277] hover:bg-[#4be27733] transition-colors"
              >
                Open Full Match Report
              </button>

              <button
                onClick={() => void startMatch()}
                className="w-full rounded-lg border border-[#4be277] bg-[#4be27722] py-2 text-sm text-[#4be277] hover:bg-[#4be27733] transition-colors"
              >
                Start New Match Simulation
              </button>
            </section>
          )}
        </div>

        <div className="md:col-span-4 flex flex-col gap-4">
          <section className="bg-[#10141599] backdrop-blur-xl border border-[#3d4a3d] rounded-xl p-4 flex flex-col flex-1 min-h-[250px]">
            <h2 className="font-['Lexend'] text-xl text-[#e0e3e5] mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">history</span>
              Match Events
            </h2>

            <div className="flex flex-col gap-3 overflow-y-auto pr-2" style={{ maxHeight: 360 }}>
              {recentEvents.map((event) => (
                <div key={`${event.minute}-${event.message}`} className="flex gap-3 items-start">
                  <div className="w-8 text-right text-xs pt-1 text-[#bccbb9]">{event.minute}&apos;</div>
                  <div className="w-6 h-6 rounded-full bg-[#1d2022] border border-[#3d4a3d] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[14px] text-[#4be277]">{iconForEvent(event.type)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-[#e0e3e5]">{event.message}</span>
                    <span className="text-[11px] text-[#bccbb9]">{event.team}</span>
                  </div>
                </div>
              ))}
              {!recentEvents.length && !loading && <p className="text-sm text-[#bccbb9]">No events returned.</p>}
            </div>
          </section>
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-slate-950/80 backdrop-blur-lg rounded-t-xl border-t border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <BottomNavItem icon="home" label="Home" />
        <BottomNavItem icon="groups" label="Squad" />
        <BottomNavItem icon="sports_soccer" label="Live" active />
        <BottomNavItem icon="strategy" label="Tactics" />
        <BottomNavItem icon="storefront" label="Market" />
      </nav>
    </div>
  );
}

function iconForEvent(type: MatchEvent['type']) {
  switch (type) {
    case 'GOAL':
      return 'sports_soccer';
    case 'CARD':
      return 'style';
    case 'INJURY':
      return 'health_and_safety';
    case 'TACTICAL_WARNING':
      return 'warning';
    case 'INSIGHT':
      return 'lightbulb';
    default:
      return 'stars';
  }
}

function buildSubstitutionAction(
  payload: SimulationPayload,
  issue: MatchIssue,
): {
  substitutions: SubstitutionAction[];
  tacticalStyle?: TacticalStyle;
  description: string;
} | null {
  const players = payload.team.players;

  if (issue.zone === 'left') {
    const outPlayer = players.find((player) => player.rolePosition === 'LW');
    const inPlayer = players.find((player) => player.isSubstitute && roleToZone(player.rolePosition) === 'left');

    if (!outPlayer || !inPlayer) {
      return null;
    }

    return {
      substitutions: [{ playerOutId: outPlayer.id, playerInId: inPlayer.id }],
      tacticalStyle: 'BALANCED',
      description: 'Applied fix: replaced left winger and switched to BALANCED.',
    };
  }

  if (issue.zone === 'right') {
    const outPlayer = players.find((player) => player.rolePosition === 'RW');
    const inPlayer = players.find((player) => player.isSubstitute && roleToZone(player.rolePosition) === 'right');

    if (!outPlayer || !inPlayer) {
      return null;
    }

    return {
      substitutions: [{ playerOutId: outPlayer.id, playerInId: inPlayer.id }],
      tacticalStyle: 'BALANCED',
      description: 'Applied fix: reinforced right flank and switched to BALANCED.',
    };
  }

  const outMid = players.find((player) => player.rolePosition === 'RCM' || player.rolePosition === 'LCM');
  const inMid = players.find((player) => player.isSubstitute && (player.naturalPosition === 'CDM' || player.rolePosition === 'CDM'));

  if (!outMid || !inMid) {
    return null;
  }

  return {
    substitutions: [{ playerOutId: outMid.id, playerInId: inMid.id, newRolePosition: 'CDM' }],
    tacticalStyle: 'BALANCED',
    description: 'Applied fix: added extra defensive midfielder and switched to BALANCED.',
  };
}

function roleToZone(rolePosition: string): 'left' | 'center' | 'right' {
  const role = rolePosition.toUpperCase();
  if (role.startsWith('L')) {
    return 'left';
  }

  if (role.startsWith('R')) {
    return 'right';
  }

  return 'center';
}

function formatImpact(response: SubstitutionResponse): string {
  const deltas = response.impactPreview.deltas;
  return `Impact: Control ${signed(deltas.controlDelta)}, Chance ${signed(deltas.chanceCreationDelta)}, Defense ${signed(
    deltas.defenseDelta,
  )}, Left Risk ${signed(deltas.leftRiskDelta)}, Right Risk ${signed(deltas.rightRiskDelta)}, Pressing ${signed(deltas.pressingDelta)}.`;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function StatCompact({
  label,
  primary,
  secondary,
  primaryClass = 'text-[#e0e3e5]',
}: {
  label: string;
  primary: string;
  secondary: string;
  primaryClass?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-[#bccbb9] mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-['Lexend'] text-lg ${primaryClass}`}>{primary}</span>
        <span className="text-xs text-[#bccbb9]">{secondary}</span>
      </div>
    </div>
  );
}

function BottomNavItem({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) {
  return (
    <button
      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-transform duration-150 active:scale-90 ${
        active ? 'text-emerald-500 bg-emerald-500/10 px-3 py-1' : 'text-slate-500 hover:bg-slate-800/60'
      }`}
    >
      <span className="material-symbols-outlined text-2xl">{icon}</span>
      <span className="font-['Lexend'] text-[10px] font-medium uppercase tracking-tight mt-1">{label}</span>
    </button>
  );
}
