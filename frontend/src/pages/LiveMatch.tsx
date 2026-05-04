import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import SubstitutionModal from '../components/SubstitutionModal';
import { api, toApiError } from '../lib/api';
import {
  loadSquadPayload,
  saveSquadPayload,
} from '../lib/squad';
import { saveMatchToHistory } from '../lib/matchHistory';
import type {
  MatchStateResponse,
  MatchEvent,
  MatchFinalReport,
  PlayerPauseState,
  ResumeMatchResponse,
  SimulationPayload,
  StartMatchResponse,
  SubstitutionAction,
  SubstitutionResponse,
  TacticalStyle,
} from '../types/simulation';

const ACTIVE_MATCH_KEY = 'dc_active_match_id';
const LAST_MATCH_REPORT_KEY = 'dc_last_match_report';

function getInitialPayload(): SimulationPayload | null {
  return loadSquadPayload();
}

export default function LiveMatch() {
  const navigate = useNavigate();
  const [payload, setPayload] = useState<SimulationPayload | null>(() => getInitialPayload());
  const [matchId, setMatchId] = useState<string>('');
  const [pauseState, setPauseState] = useState<StartMatchResponse | null>(null);
  const [finalReport, setFinalReport] = useState<MatchFinalReport | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [lastAdjustment, setLastAdjustment] = useState('');
  const [impactSummary, setImpactSummary] = useState('');
  const [pausePanelCollapsed, setPausePanelCollapsed] = useState(false);

  // Animated Timeline State
  const [currentMinute, setCurrentMinute] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const eventScrollRef = useRef<HTMLDivElement>(null);

  const targetMinute = finalReport ? 90 : (pauseState ? 60 : 0);

  const startMatch = async (nextPayload?: SimulationPayload) => {
    const requestPayload = nextPayload ?? payload;
    if (!requestPayload) {
      setError('Сначала собери состав и настрой матч.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setFinalReport(null);
    setLastAdjustment('');
    setImpactSummary('');
    setCurrentMinute(0);
    setIsSimulating(false);

    try {
      const response = await api.post<StartMatchResponse>('/api/matches/start', requestPayload);
      setMatchId(response.data.matchId);
      setPauseState(response.data);
      localStorage.setItem(ACTIVE_MATCH_KEY, response.data.matchId);
      if (nextPayload) {
        setPayload(nextPayload);
        saveSquadPayload(nextPayload);
      }
      setIsSimulating(true);
    } catch (err) {
      const apiError = toApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const resumeMatch = async () => {
    if (!matchId) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post<ResumeMatchResponse>(`/api/matches/${matchId}/resume`);
      setFinalReport(response.data.report);
      saveMatchToHistory(payload?.team.name ?? 'Dream Coach XI', payload?.opponent?.name ?? 'Rival FC', response.data.report);
      localStorage.setItem(LAST_MATCH_REPORT_KEY, JSON.stringify(response.data.report));
      localStorage.removeItem(ACTIVE_MATCH_KEY);
      setIsSimulating(true);
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
      if (!active) return;

      if (!initialPayload) {
        setLoading(false);
        setError('Сначала собери состав, затем настрой матч.');
        return;
      }

      setPayload(initialPayload);
      const savedMatchId = localStorage.getItem(ACTIVE_MATCH_KEY);
      if (savedMatchId) {
        try {
          const restored = await api.get<MatchStateResponse>(`/api/matches/${savedMatchId}/state`);
          if (!active) return;

          if (restored.data.status === 'PAUSED_FOR_COACH') {
            setMatchId(savedMatchId);
            setPauseState(restored.data.pauseState);
            setFinalReport(null);
            setLoading(false);
            setCurrentMinute(60);
            return;
          }

          setMatchId(savedMatchId);
          setFinalReport(restored.data.report);
          localStorage.setItem(LAST_MATCH_REPORT_KEY, JSON.stringify(restored.data.report));
          setLoading(false);
          setCurrentMinute(90);
          localStorage.removeItem(ACTIVE_MATCH_KEY);
          return;
        } catch {
          localStorage.removeItem(ACTIVE_MATCH_KEY);
        }
      }

      await startMatch(initialPayload);
    };

    void bootstrap();
    return () => { active = false; };
  }, []);

  // Timeline Animation Loop
  useEffect(() => {
    if (isSimulating && currentMinute < targetMinute) {
      const timer = setTimeout(() => {
        setCurrentMinute((prev) => {
          const next = Math.min(targetMinute, prev + 1);
          // Auto-scroll to bottom of events
          if (eventScrollRef.current) {
            eventScrollRef.current.scrollTop = eventScrollRef.current.scrollHeight;
          }
          return next;
        });
      }, 150); // Fast simulation: 150ms per minute (13s for 90m)
      return () => clearTimeout(timer);
    } else if (isSimulating && currentMinute === targetMinute) {
      setIsSimulating(false);
      // Wait a moment then navigate to report if at full time
      if (targetMinute === 90) {
        setTimeout(() => navigate('/match-report'), 1500);
      }
    }
  }, [currentMinute, isSimulating, targetMinute, navigate]);

  const handleSkip = () => {
    setCurrentMinute(targetMinute);
    setIsSimulating(false);
    if (targetMinute === 90) {
      navigate('/match-report');
    }
  };

  const displayed = finalReport ?? pauseState;
  
  // Filter events by current animated minute
  const allEvents = displayed?.events ?? [];
  const animatedEvents = useMemo(() => allEvents.filter(e => e.minute <= currentMinute), [allEvents, currentMinute]);
  const recentEvents = useMemo(() => [...animatedEvents].reverse().slice(0, 12), [animatedEvents]);

  // Calculate animated score
  const homeTeamName = payload?.team.name ?? 'Dream Coach XI';
  const awayTeamName = payload?.opponent?.name ?? 'Rival FC';

  const homeScore = useMemo(() => animatedEvents.filter(e => e.type === 'GOAL' && e.team === homeTeamName).length, [animatedEvents, homeTeamName]);
  const awayScore = useMemo(() => animatedEvents.filter(e => e.type === 'GOAL' && e.team !== homeTeamName).length, [animatedEvents, homeTeamName]);

  const issues = pauseState?.insights?.[0]?.issues ?? [];
  const criticalIssue = issues[0];
  const starters = useMemo(() => payload?.team.players.filter((player) => !player.isSubstitute) ?? [], [payload]);
  const bench = useMemo(() => payload?.team.players.filter((player) => player.isSubstitute) ?? [], [payload]);

  const momentumHome = useMemo(() => {
    const pos = displayed?.stats.home.possession ?? 50;
    return Math.max(35, Math.min(75, pos));
  }, [displayed?.stats.home.possession]);

  const applySubstitutionRequest = async (
    substitutions: SubstitutionAction[],
    tacticalStyle: TacticalStyle | undefined,
    description: string,
  ) => {
    if (!matchId || !payload) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post<SubstitutionResponse>(`/api/matches/${matchId}/substitutions`, {
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

      setPauseState((current) => {
        if (!current) return current;
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

  if (!payload) {
    return (
      <AppShell title="МАТЧ" activeTab="match">
        <div className="flex flex-col items-center justify-center h-[60vh] px-5 text-center">
          <span className="material-symbols-outlined text-6xl text-[var(--color-outline-variant)] mb-4">sports_soccer</span>
          <h1 className="font-['Lexend'] text-2xl font-bold mb-2">Состав Не Настроен</h1>
          <p className="text-[var(--color-on-surface-variant)] mb-6 text-sm">
            Собери состав и заверши настройку матча перед запуском симуляции.
          </p>
          <button
            onClick={() => navigate('/player-selection')}
            className="rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-6 py-3 text-[var(--color-primary)] font-bold transition-colors hover:bg-[var(--color-primary)]/20"
          >
            Собрать Состав
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="МАТЧ" activeTab="match" hideHeader>
      {/* Custom Header */}
      <header className="w-full z-40 bg-transparent pt-safe mb-2">
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-white transition-colors bg-white/5 rounded-full">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          
          <h1 className="font-['Lexend'] text-[16px] font-black italic text-[var(--color-primary)] tracking-[0.15em] neon-text">DREAM COACH</h1>
          
          <div className="w-10 h-10" />
        </div>
      </header>

      <div className="space-y-4 px-4 pb-4">
        {error ? (
          <section className="rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-error-container)] animate-fade-in-down">{error}</section>
        ) : null}

        {/* Scoreboard */}
        <section className="glass-panel-solid rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <div className={`px-3 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase transition-colors ${
              isSimulating ? 'border-[var(--color-danger)]/50 bg-[var(--color-danger)]/10 text-[var(--color-danger)] animate-pulse' :
              currentMinute === 60 && !finalReport ? 'border-[var(--color-warning)]/50 bg-[var(--color-warning)]/10 text-[var(--color-warning)]' :
              'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            }`}>
              {isSimulating ? 'ИДЕТ' : currentMinute === 60 && !finalReport ? 'ПАУЗА' : 'ЗАВЕРШЕН'}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className={`text-sm font-bold tracking-[0.2em] mb-4 ${isSimulating ? 'text-white' : 'text-[var(--color-on-surface-variant)]'}`}>
              <span className="inline-block min-w-[2ch] text-center animate-tick-pulse">{currentMinute}</span>
              <span className="text-[var(--color-primary)] animate-pulse">'</span>
            </div>

            <div className="w-full grid grid-cols-3 items-center mt-2">
              <TeamSide name={homeTeamName} formation={payload.team.formation} color="text-[var(--color-primary)]" />
              <div className="text-center flex justify-center items-center gap-4">
                <span className="text-5xl sm:text-6xl font-black tabular-nums">{homeScore}</span>
                <span className="text-2xl text-[var(--color-on-surface-variant)]">-</span>
                <span className="text-5xl sm:text-6xl font-black tabular-nums">{awayScore}</span>
              </div>
              <TeamSide name={awayTeamName} formation={payload.opponent?.formation ?? '4-2-3-1'} alignRight color="text-[var(--color-blue-accent)]" />
            </div>
          </div>

          <div className="mt-4 px-2">
            <div className="flex justify-between text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1.5 font-bold">
              <span>Импульс</span>
              <span>{Math.round(momentumHome)}% - {100 - Math.round(momentumHome)}%</span>
            </div>
            <div className="w-full h-1.5 flex rounded-full overflow-hidden opacity-90 border border-white/5">
              <div className="bg-[var(--color-primary)] transition-all duration-500 ease-out" style={{ width: `${momentumHome}%` }} />
              <div className="bg-[var(--color-blue-accent)] transition-all duration-500 ease-out" style={{ width: `${100 - momentumHome}%` }} />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-4 gap-2">
            <StatMini label="Влад" home={`${displayed?.stats.home.possession ?? 50}%`} away={`${displayed?.stats.away.possession ?? 50}%`} animate={isSimulating} />
            <StatMini label="Удары" home={`${displayed?.stats.home.shots ?? 0}`} away={`${displayed?.stats.away.shots ?? 0}`} animate={isSimulating} />
            <StatMini label="xG" home={`${displayed?.stats.home.xg ?? 0}`} away={`${displayed?.stats.away.xg ?? 0}`} animate={isSimulating} />
            <StatMini label="В Створ" home={`${displayed?.stats.home.shotsOnTarget ?? 0}`} away={`${displayed?.stats.away.shotsOnTarget ?? 0}`} animate={isSimulating} />
          </div>
        </section>

                {/* Плавающая панель тренерской паузы */}
        {!isSimulating && currentMinute === 60 && !finalReport && (
          <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+76px)] z-[100] flex justify-center px-3 pointer-events-none animate-fade-in">
            {pausePanelCollapsed ? (
              <button
                type="button"
                onClick={() => setPausePanelCollapsed(false)}
                className="pointer-events-auto rounded-full border border-[var(--color-warning)]/40 bg-[var(--color-surface)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-warning)] shadow-lg"
              >
                Пауза матча
              </button>
            ) : (
              <div className="pointer-events-auto w-full max-w-[520px] rounded-2xl border border-[var(--color-warning)]/30 bg-[var(--color-surface)] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-warning)]/20 flex items-center justify-center border border-[var(--color-warning)]/40">
                      <span className="material-symbols-outlined text-[var(--color-warning)] text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>sports</span>
                    </div>
                    <div>
                      <h2 className="font-['Lexend'] text-lg text-white">Пауза тренера</h2>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-warning)] font-bold">Нужно тактическое решение</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPausePanelCollapsed(true)}
                    className="rounded-lg border border-white/10 px-2 py-1 text-[10px] uppercase text-[var(--color-on-surface-variant)] hover:text-white"
                  >
                    Скрыть
                  </button>
                </div>

                <div className="max-h-[38vh] overflow-y-auto pr-1 space-y-3">
                  {criticalIssue ? (
                    <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-[var(--color-warning)]">warning</span>
                        <div>
                          <p className="font-semibold text-white text-sm">{criticalIssue.message}</p>
                          {criticalIssue.evidence && (
                            <div className="mt-2 space-y-1">
                              <p className="text-[11px] text-[var(--color-on-surface-variant)] font-medium">
                                Зона: {criticalIssue.zone?.toUpperCase()} | Атаки: {criticalIssue.evidence.opponentAttacksFromZone}
                                {(criticalIssue.evidence?.successfulOpponentAttacks ?? 0) > 0 && ` (голы: ${criticalIssue.evidence?.successfulOpponentAttacks})`}
                              </p>
                              {criticalIssue.evidence.playerStamina && Object.keys(criticalIssue.evidence.playerStamina).length > 0 && (
                                <p className="text-[11px] text-[var(--color-on-surface-variant)] font-medium">
                                  Выносливость: {Object.entries(criticalIssue.evidence.playerStamina as Record<string, number>).map(([name, stam]) => `${name} ${Math.round(stam)}%`).join(', ')}
                                </p>
                              )}
                              {criticalIssue.evidence.workRateMismatch && (
                                <p className="text-[11px] text-[var(--color-warning)] font-bold">
                                  Обнаружен конфликт work-rate
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl p-3 flex items-start gap-3">
                      <span className="material-symbols-outlined text-[var(--color-primary)]">check_circle</span>
                      <div>
                        <p className="font-semibold text-white text-sm">Критических проблем не найдено</p>
                        <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-1">Можно продолжать матч без замен.</p>
                      </div>
                    </div>
                  )}

                  {lastAdjustment ? <p className="text-xs text-[var(--color-primary)] bg-[var(--color-primary)]/10 p-3 rounded-xl border border-[var(--color-primary)]/20">{lastAdjustment}</p> : null}
                  {impactSummary ? <p className="text-xs text-[var(--color-blue-accent)] bg-[var(--color-blue-accent)]/10 p-3 rounded-xl border border-[var(--color-blue-accent)]/20">{impactSummary}</p> : null}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => setSubModalOpen(true)}
                    disabled={loading}
                    className="rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 py-3 text-[var(--color-primary)] font-bold uppercase tracking-wider hover:bg-[var(--color-primary)]/20 transition-colors"
                  >
                    Сделать замены
                  </button>
                  <button
                    onClick={() => void resumeMatch()}
                    disabled={loading}
                    className="rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)] text-[var(--color-on-primary)] py-3 font-bold uppercase tracking-wider transition-colors neon-glow"
                  >
                    Продолжить матч
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left Column: Tactical Field & Fatigue */}
          <div className="space-y-4">
          {/* Tactical Field */}
          <section className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold">Поле</p>
              {criticalIssue && currentMinute === 60 && !finalReport && (
                <span className="rounded bg-[var(--color-warning)]/20 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-[var(--color-warning)] animate-pulse">
                  {criticalIssue.zone === 'left' ? 'Риск слева' : criticalIssue.zone === 'right' ? 'Риск справа' : 'Риск в центре'}
                </span>
              )}
            </div>

            <div className="relative h-[200px] sm:h-[240px] rounded-xl border border-white/10 pitch-bg overflow-hidden shadow-inner">
              <div className="absolute inset-3 border border-white/20 rounded-sm" />
              <div className="absolute left-1/2 top-3 bottom-3 w-px bg-white/20 -translate-x-1/2" />
              <div className="absolute left-1/2 top-1/2 w-20 h-20 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute left-3 top-1/2 w-12 h-24 border border-white/20 border-l-0 -translate-y-1/2" />
              <div className="absolute right-3 top-1/2 w-12 h-24 border border-white/20 border-r-0 -translate-y-1/2" />

              {/* Danger Zone Highlights */}
              {criticalIssue?.zone === 'left' && !isSimulating && currentMinute === 60 && (
                <div className="absolute left-3 top-[10%] bottom-[10%] w-[35%] bg-[var(--color-warning)]/20 border border-[var(--color-warning)]/40 rounded-sm animate-pulse" />
              )}
              {criticalIssue?.zone === 'right' && !isSimulating && currentMinute === 60 && (
                <div className="absolute right-3 top-[10%] bottom-[10%] w-[35%] bg-[var(--color-warning)]/20 border border-[var(--color-warning)]/40 rounded-sm animate-pulse" />
              )}

              {/* Dots */}
              {renderFormationDots('left')}
              {renderFormationDots('right')}
            </div>
          </section>

          {/* Squad Fatigue */}
          <FatiguePanel players={starters} currentMinute={currentMinute} playerStates={pauseState?.playerStates} />
        </div>

          {/* Events Timeline */}
          <section className="glass-panel rounded-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold">События Матча</p>
              {isSimulating && (
                <button onClick={handleSkip} className="text-[10px] text-[var(--color-primary)] font-bold uppercase tracking-wider bg-[var(--color-primary)]/10 px-2 py-1 rounded">Пропуск</button>
              )}
            </div>
            
            <div ref={eventScrollRef} className="flex-1 max-h-[200px] sm:max-h-[240px] overflow-y-auto pr-2 space-y-2 custom-scrollbar scroll-smooth">
              {recentEvents.length ? (
                recentEvents.map((event) => (
                  <div key={`${event.minute}-${event.message}`} className={`rounded-xl border bg-[var(--color-surface-container-high)] p-3 animate-fade-in-down ${
                    event.type === 'GOAL' ? 'border-[var(--color-primary)] shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'border-white/5'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white bg-black/40 px-1.5 py-0.5 rounded">{event.minute}'</span>
                        <span className="text-[10px] text-[var(--color-on-surface-variant)] font-semibold uppercase">{event.team}</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${eventTone(event.type)}`}>
                        {labelForEvent(event.type)}
                      </span>
                    </div>
                    <p className={`text-sm leading-snug ${event.type === 'GOAL' ? 'text-white font-semibold' : 'text-[var(--color-on-surface)]'}`}>
                      {event.message}
                    </p>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-[var(--color-on-surface-variant)] text-sm">
                  {isSimulating ? 'Ожидание стартового свистка...' : 'Пока событий нет.'}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <SubstitutionModal 
        matchId={matchId}
        isOpen={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        starters={starters}
        bench={bench}
        currentStyle={payload.team.tacticalStyle}
        onApply={applySubstitutionRequest}
        loading={loading}
      />
    </AppShell>
  );
}

function TeamSide({ name, formation, color, alignRight = false }: { name: string; formation: string; color: string; alignRight?: boolean }) {
  return (
    <div className={alignRight ? 'text-right' : ''}>
      <p className={`text-sm sm:text-base font-semibold truncate ${color}`}>{name}</p>
      <p className="text-[10px] sm:text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider font-semibold mt-0.5">{formation}</p>
    </div>
  );
}

function StatMini({ label, home, away, animate }: { label: string; home: string; away: string; animate: boolean }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[var(--color-surface-container-high)] p-2 text-center relative overflow-hidden">
      {animate && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
      <p className="text-[9px] uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold mb-1 relative z-10">{label}</p>
      <div className="flex justify-between items-end px-1 relative z-10">
        <span className="text-xs sm:text-sm font-bold text-white">{home}</span>
        <span className="text-[10px] text-[var(--color-on-surface-variant)] font-medium mb-0.5">на</span>
        <span className="text-xs sm:text-sm font-bold text-white">{away}</span>
      </div>
    </div>
  );
}

function renderFormationDots(side: 'left' | 'right') {
  const base = side === 'left' ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-blue-accent)]';
  const shadow = side === 'left' ? 'shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'shadow-[0_0_8px_rgba(59,130,246,0.6)]';
  const points =
    side === 'left'
      ? ['left-[12%] top-[20%]', 'left-[22%] top-[35%]', 'left-[32%] top-[50%]', 'left-[40%] top-[32%]', 'left-[50%] top-[55%]', 'left-[28%] top-[72%]', 'left-[42%] top-[75%]']
      : ['right-[12%] top-[24%]', 'right-[22%] top-[39%]', 'right-[32%] top-[54%]', 'right-[40%] top-[36%]', 'right-[50%] top-[59%]', 'right-[28%] top-[76%]', 'right-[42%] top-[79%]'];

  return points.map((point, idx) => (
    <div key={`${side}-${idx}`} className={`absolute w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full ${base} ${point} ${shadow} opacity-90`} />
  ));
}

function labelForEvent(type: MatchEvent['type']) {
  switch (type) {
    case 'GOAL': return 'ГОЛ';
    case 'CARD': return 'КАРТА';
    case 'INJURY': return 'ТРАВМА';
    case 'TACTICAL_WARNING': return 'ТРЕВОГА';
    case 'INSIGHT': return 'ИНСАЙТ';
    default: return 'СОБЫТИЕ';
  }
}

function eventTone(type: MatchEvent['type']) {
  switch (type) {
    case 'GOAL': return 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]';
    case 'CARD': return 'border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 text-[var(--color-warning)]';
    case 'INJURY': return 'border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 text-[var(--color-danger)]';
    case 'TACTICAL_WARNING': return 'border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 text-[var(--color-warning)]';
    case 'INSIGHT': return 'border-[var(--color-blue-accent)]/40 bg-[var(--color-blue-accent)]/10 text-[var(--color-blue-accent)]';
    default: return 'border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface-variant)]';
  }
}

function formatImpact(response: SubstitutionResponse): string {
  const deltas = response.impactPreview.deltas;
  return `Влияние: контроль ${signed(deltas.controlDelta)}, моменты ${signed(deltas.chanceCreationDelta)}, оборона ${signed(deltas.defenseDelta)}, риск слева ${signed(deltas.leftRiskDelta)}, риск справа ${signed(deltas.rightRiskDelta)}, прессинг ${signed(deltas.pressingDelta)}.`;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function FatiguePanel({ players, currentMinute, playerStates }: { players: any[], currentMinute: number, playerStates?: PlayerPauseState[] }) {
  const stateMap = new Map(playerStates?.map((s) => [s.playerId, s]) ?? []);

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold">Усталость Состава</p>
        {playerStates && playerStates.length > 0 && (
          <span className="text-[9px] uppercase tracking-wider text-[var(--color-primary)] font-bold">Live Engine</span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] sm:max-h-none overflow-y-auto custom-scrollbar pr-1">
        {players.map(p => {
          const realState = stateMap.get(p.id);
          // Use real engine data if available, otherwise fallback to estimate
          const currentStamina = realState
            ? realState.stamina
            : Math.max(0, Math.round(p.stamina - (currentMinute / 90) * 35));
          const rating = realState?.rating;
          const status = realState?.status;
          const reasons = realState?.reasons ?? [];

          const color = currentStamina < 35 ? 'text-[var(--color-danger)]' : currentStamina < 50 ? 'text-[var(--color-warning)]' : currentStamina < 70 ? 'text-[var(--color-on-surface-variant)]' : 'text-[var(--color-primary)]';
          const bgColor = currentStamina < 35 ? 'bg-[var(--color-danger)]' : currentStamina < 50 ? 'bg-[var(--color-warning)]' : currentStamina < 70 ? 'bg-yellow-500/70' : 'bg-[var(--color-primary)]';
          const statusLabel = status === 'CRITICAL' ? '🔴' : status === 'TIRED' ? '🟡' : status === 'OK' ? '🟢' : '💚';

          return (
            <div key={p.id} className="flex flex-col justify-center bg-[var(--color-surface-container-high)] border border-white/5 p-2 rounded" title={reasons.join(' | ')}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-white font-bold truncate">{statusLabel} {p.name}</span>
                <span className={`text-[10px] font-bold ${color}`}>{currentStamina}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${bgColor} transition-all duration-300`} style={{ width: `${currentStamina}%` }} />
              </div>
              {rating !== undefined && (
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-[var(--color-on-surface-variant)]">{p.rolePosition ?? p.id?.toUpperCase()}</span>
                  <span className={`text-[9px] font-bold ${rating >= 7 ? 'text-[var(--color-primary)]' : rating < 6 ? 'text-[var(--color-danger)]' : 'text-white'}`}>{rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

