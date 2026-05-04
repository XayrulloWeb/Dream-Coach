import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { api, toApiError } from '../lib/api';

interface MatchHistoryItem {
  id: string;
  status: string;
  userScore: number;
  opponentScore: number;
  opponentName: string;
  createdAt: string;
  venue: string;
}

export default function MatchHistory() {
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function fetchHistory() {
      try {
        setLoading(true);
        const response = await api.get<{ items: MatchHistoryItem[] }>('/api/matches/history');
        if (active) {
          setMatches(response.data.items);
        }
      } catch (err) {
        if (active) {
          setError(toApiError(err).message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchHistory();

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell
      title="История матчей"
      headerSubtitle="Прошлые результаты"
      showBackButton
      activeTab="home"
      contentClassName="px-5 py-6"
    >
        {loading ? (
          <div className="flex justify-center p-10">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 p-4 rounded-xl text-center">
            <p className="text-[var(--color-danger)] text-sm">{error}</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center p-10 glass-panel rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-[var(--color-outline-variant)] mb-2">history</span>
            <p className="text-sm text-[var(--color-on-surface-variant)]">Пока не сыграно ни одного матча.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => {
              const isWin = match.userScore > match.opponentScore;
              const isLoss = match.userScore < match.opponentScore;
              const resultText = isWin ? 'ПОБЕДА' : isLoss ? 'ПОРАЖЕНИЕ' : 'НИЧЬЯ';
              const resultColor = isWin ? 'text-[var(--color-primary)]' : isLoss ? 'text-[var(--color-danger)]' : 'text-[var(--color-warning)]';
              const resultBg = isWin ? 'bg-[var(--color-primary)]' : isLoss ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-warning)]';

              return (
                <div key={match.id} className="glass-panel rounded-2xl p-4 flex items-center justify-between hover:bg-[var(--color-surface-container-high)] transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${resultBg}`} />
                      <span className={`text-[10px] uppercase tracking-wider font-bold ${resultColor}`}>{resultText}</span>
                      <span className="text-[10px] text-[var(--color-on-surface-variant)] ml-auto">
                        {new Date(match.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center pr-2">
                      <span className={`font-semibold text-sm ${isWin ? 'text-white' : 'text-[var(--color-on-surface-variant)]'}`}>Dream FC</span>
                      <span className="font-bold text-white bg-black/30 px-3 py-1 rounded text-lg mx-3">
                        {match.userScore} - {match.opponentScore}
                      </span>
                      <span className={`font-semibold text-sm ${isLoss ? 'text-white' : 'text-[var(--color-on-surface-variant)]'}`}>{match.opponentName}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </AppShell>
  );
}

