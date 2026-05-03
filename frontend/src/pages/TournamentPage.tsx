import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { toApiError } from '../lib/api';
import {
  fetchTournamentState,
  submitTournamentResult,
  type UpcomingFixture,
  type TournamentMatch,
  type TournamentProgress,
} from '../lib/tournamentApi';

type MatchReportScore = {
  home: number;
  away: number;
};

const LAST_MATCH_REPORT_KEY = 'dc_last_match_report';
const TOURNAMENT_NEXT_FIXTURE_KEY = 'dc_tournament_next_fixture';

function loadLastMatchScore(): MatchReportScore | null {
  const raw = localStorage.getItem(LAST_MATCH_REPORT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { score?: MatchReportScore };
    if (typeof parsed?.score?.home !== 'number' || typeof parsed?.score?.away !== 'number') {
      return null;
    }

    return parsed.score;
  } catch {
    return null;
  }
}

export default function TournamentPage() {
  const navigate = useNavigate();
  const [season, setSeason] = useState<TournamentProgress | null>(null);
  const [fixtures, setFixtures] = useState<UpcomingFixture[]>([]);
  const [recentMatches, setRecentMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const reload = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetchTournamentState();
      setSeason(response.season);
      setFixtures(response.upcomingFixtures ?? []);
      setRecentMatches(response.recentMatches ?? []);
    } catch (reason) {
      setError(toApiError(reason).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const nextFixture = useMemo(() => fixtures.find((fixture) => !fixture.played) ?? fixtures[0] ?? null, [fixtures]);
  const lastMatchScore = useMemo(() => loadLastMatchScore(), []);

  const onPlayNextRound = () => {
    if (!nextFixture) {
      setMessage('No upcoming fixture found.');
      return;
    }

    localStorage.setItem(
      TOURNAMENT_NEXT_FIXTURE_KEY,
      JSON.stringify({ round: nextFixture.round, opponentName: nextFixture.opponentName }),
    );

    navigate('/match-setup');
  };

  const onApplyLastMatchResult = async () => {
    if (!nextFixture || !lastMatchScore) {
      setMessage('No next fixture or no last match report found.');
      return;
    }

    try {
      await submitTournamentResult({
        round: nextFixture.round,
        opponentName: nextFixture.opponentName,
        homeScore: lastMatchScore.home,
        awayScore: lastMatchScore.away,
      });
      setMessage(`Round ${nextFixture.round} saved: ${lastMatchScore.home}-${lastMatchScore.away}`);
      localStorage.removeItem(TOURNAMENT_NEXT_FIXTURE_KEY);
      await reload();
    } catch (reason) {
      setMessage(toApiError(reason).message);
    }
  };

  const position = useMemo(() => {
    if (!season) {
      return '-';
    }

    const baseline = 11 - Math.floor(season.points / 5);
    return String(Math.max(1, Math.min(10, baseline)));
  }, [season]);

  return (
    <AppShell title="Tournament" activeTab="tournament" hideHeader>
      <header className="w-full z-40 bg-[var(--color-surface)] border-b border-white/5 pt-safe sticky top-0">
        <div className="flex items-center px-5 py-4">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="w-10 h-10 flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-white transition-colors bg-white/5 rounded-full mr-3"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div className="flex-1">
            <h1 className="font-['Lexend'] text-lg text-white">Season Mode</h1>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-primary)] font-bold">League campaign</p>
          </div>
          <button 
            onClick={() => void reload()} 
            className="w-10 h-10 flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-white transition-colors bg-white/5 rounded-full"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>
      </header>

      <main className="px-5 py-6 space-y-6">

        <section className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold mb-4">League Progress</p>
          {loading ? <p className="text-sm text-[var(--color-on-surface-variant)]">Loading tournament...</p> : null}

          <div className="grid grid-cols-3 gap-3 mb-3">
            <Stat label="Played" value={season ? String(season.played) : '-'} />
            <Stat label="Points" value={season ? String(season.points) : '-'} />
            <Stat label="Position" value={position} />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <MiniStat label="W" value={season ? String(season.wins) : '-'} color="text-[var(--color-primary)]" />
            <MiniStat label="D" value={season ? String(season.draws) : '-'} color="text-[var(--color-warning)]" />
            <MiniStat label="L" value={season ? String(season.losses) : '-'} color="text-[var(--color-danger)]" />
            <MiniStat
              label="GD"
              value={season ? String(season.goalsFor - season.goalsAgainst) : '-'}
              color="text-[var(--color-blue-accent)]"
            />
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold mb-4">Upcoming Fixtures</p>
          <div className="space-y-3">
            {fixtures.length ? (
              fixtures.map((fixture) => (
                <div
                  key={fixture.round}
                  className="rounded-xl border border-white/5 bg-[var(--color-surface-container-high)] px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-white">Round {fixture.round}: <span className="font-normal text-[var(--color-on-surface-variant)]">vs {fixture.opponentName}</span></p>
                    {fixture.played ? (
                      <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">Played • {fixture.homeScore}-{fixture.awayScore}</p>
                    ) : (
                      <p className="text-xs text-[var(--color-primary)] font-bold mt-1 tracking-wide uppercase">Next Target Fixture</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${fixture.result === 'WIN' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : fixture.result === 'LOSS' ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]' : fixture.result === 'DRAW' ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' : 'bg-black/20 text-[var(--color-on-surface-variant)]'}`}>
                    {fixture.result ?? '-'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-on-surface-variant)]">No fixtures yet.</p>
            )}
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold">Recent Results</p>
            <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded">{recentMatches.length} matches</span>
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {recentMatches.length ? (
              recentMatches
                .slice()
                .reverse()
                .map((match) => (
                  <div key={match.id} className="rounded-xl border border-white/5 bg-[var(--color-surface-container-high)] px-4 py-3">
                    <p className="font-semibold text-white">R{match.round} <span className="font-normal text-[var(--color-on-surface-variant)]">vs {match.opponentName}</span></p>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-1 font-bold"><span className={`${match.result === 'WIN' ? 'text-[var(--color-primary)]' : match.result === 'LOSS' ? 'text-[var(--color-danger)]' : 'text-[var(--color-warning)]'}`}>{match.result ?? '-'}</span> • {match.homeScore ?? '-'}-{match.awayScore ?? '-'}</p>
                  </div>
                ))
            ) : (
              <p className="text-sm text-[var(--color-on-surface-variant)]">No results recorded.</p>
            )}
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 pb-6">
          <button
            onClick={onPlayNextRound}
            disabled={!nextFixture}
            className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)] text-[var(--color-on-primary)] py-4 rounded-xl font-bold transition-all disabled:opacity-50 neon-glow"
          >
            PLAY NEXT ROUND
          </button>

          <button
            onClick={() => void onApplyLastMatchResult()}
            disabled={!nextFixture || !lastMatchScore}
            className="w-full rounded-xl border border-[var(--color-blue-accent)]/60 bg-[var(--color-blue-accent)]/10 py-4 font-bold text-[var(--color-blue-accent)] disabled:opacity-40 transition-colors hover:bg-[var(--color-blue-accent)]/20"
          >
            APPLY LAST MATCH RESULT
          </button>
        </div>

        {error ? <p className="text-xs text-[var(--color-danger)] text-center pb-4">API warning: {error}</p> : null}
        {message ? <p className="text-xs text-[var(--color-primary)] text-center pb-4">{message}</p> : null}
      </main>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[var(--color-surface-container-high)] p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[var(--color-surface-container-high)] p-2 text-center flex flex-col justify-center">
      <p className="text-[10px] uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

