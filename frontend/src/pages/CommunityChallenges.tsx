import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { toApiError } from '../lib/api';
import {
  fetchChallenges,
  fetchDailyChallenge,
  type Challenge,
} from '../lib/challengesApi';

const ACTIVE_CHALLENGE_KEY = 'dc_active_challenge_id';

const LEADERBOARD = [
  { rank: 1, name: 'Coach Ayan', points: 1260 },
  { rank: 2, name: 'TacticKing', points: 1185 },
  { rank: 3, name: 'PressMaster', points: 1122 },
  { rank: 4, name: 'Вы', points: 980 },
];

export default function CommunityChallenges() {
  const navigate = useNavigate();
  const [daily, setDaily] = useState<Challenge | null>(null);
  const [items, setItems] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [dailyChallenge, list] = await Promise.all([fetchDailyChallenge(), fetchChallenges()]);
        if (!active) {
          return;
        }
        setDaily(dailyChallenge);
        setItems(list);
      } catch (reason) {
        if (!active) {
          return;
        }
        setError(toApiError(reason).message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const challengeOfDay = useMemo(() => daily ?? items.find((item) => item.isDaily) ?? items[0] ?? null, [daily, items]);

  const onStartChallenge = (challenge: Challenge) => {
    localStorage.setItem(ACTIVE_CHALLENGE_KEY, challenge.id);
    setMessage(`Испытание выбрано: ${challenge.title}`);
    navigate('/match-setup');
  };

  return (
    <AppShell title="Сообщество" activeTab="more" hideHeader>
      <header className="w-full z-40 bg-[var(--color-surface)] border-b border-white/5 pt-safe sticky top-0">
        <div className="flex items-center px-5 py-4">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="w-10 h-10 flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-white transition-colors bg-white/5 rounded-full mr-3"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-['Lexend'] text-lg text-white">Сообщество</h1>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-warning)] font-bold">Ежедневные испытания</p>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 space-y-6">

        <section className="relative overflow-hidden rounded-2xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-5 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-[80px]">emoji_events</span>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[var(--color-warning)] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              <h3 className="font-['Lexend'] text-sm tracking-wide text-[var(--color-warning)] uppercase">Испытание дня</h3>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-white">{challengeOfDay?.title ?? 'Сегодня испытания нет'}</h2>
            <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">{challengeOfDay?.description ?? 'Проверь позже.'}</p>
            {challengeOfDay && (
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => onStartChallenge(challengeOfDay)}
                  className="flex-1 bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90 text-[var(--color-surface)] text-sm font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-colors text-center"
                >
                  Начать матч
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold mb-4">Список испытаний</p>
          {loading ? <p className="text-sm text-[var(--color-on-surface-variant)]">Загрузка испытаний...</p> : null}
          {!loading && !items.length ? <p className="text-sm text-[var(--color-on-surface-variant)]">Пока нет испытаний.</p> : null}

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/5 bg-[var(--color-surface-container-high)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-white">{item.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${item.difficulty === 'HARD' ? 'text-[var(--color-danger)] bg-[var(--color-danger)]/10' : 'text-[var(--color-warning)] bg-[var(--color-warning)]/10'}`}>{item.difficulty}</span>
                </div>
                <p className="text-sm text-[var(--color-on-surface-variant)] mt-2">{item.description}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => onStartChallenge(item)}
                    className="rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-4 py-2 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors"
                  >
                    Играть
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-5 mb-6">
          <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold mb-4">Таблица лидеров</p>
          <div className="space-y-2">
            {LEADERBOARD.map((row) => (
              <div key={row.rank} className="rounded-xl border border-white/5 bg-[var(--color-surface-container-high)] p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-6 text-center font-bold ${row.rank === 1 ? 'text-[var(--color-warning)]' : 'text-[var(--color-on-surface-variant)]'}`}>{row.rank}</span>
                  <p className="text-sm font-medium text-white">{row.name}</p>
                </div>
                <p className="text-sm text-[var(--color-primary)] font-bold">{row.points} очк.</p>
              </div>
            ))}
          </div>
        </section>

        {error ? <p className="text-xs text-[var(--color-danger)] text-center pb-4">Предупреждение API: {error}</p> : null}
        {message ? <p className="text-xs text-[var(--color-primary)] text-center pb-4">{message}</p> : null}
      </main>
    </AppShell>
  );
}

