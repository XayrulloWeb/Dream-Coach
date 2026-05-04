import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';

// Mock data for MVP
const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Alex T.', teamName: 'FC Invincibles', winRate: 85, points: 2450 },
  { rank: 2, name: 'S. Rashford', teamName: 'Red Devils', winRate: 82, points: 2310 },
  { rank: 3, name: 'Coach M.', teamName: 'City Blues', winRate: 78, points: 2180 },
  { rank: 4, name: 'K. De Bruyne', teamName: 'Royal FC', winRate: 75, points: 2050 },
  { rank: 5, name: 'J. Klopp', teamName: 'Heavy Metal', winRate: 71, points: 1980 },
  { rank: 6, name: 'V. Junior', teamName: 'Galacticos', winRate: 69, points: 1850 },
  { rank: 7, name: 'P. Guardiola', teamName: 'Tiki Taka', winRate: 68, points: 1820 },
  { rank: 8, name: 'C. Ancelotti', teamName: 'Kings', winRate: 65, points: 1750 },
];

export default function LeaderboardPage() {
  const navigate = useNavigate();

  return (
    <AppShell title="ТАБЛИЦА ЛИДЕРОВ" showBackButton backTo="/dashboard" activeTab="more">
      <div className="px-5 space-y-6 animate-slide-up pb-8 pt-2">
        <section className="glass-panel-solid rounded-3xl p-6 relative overflow-hidden shadow-lg border border-white/10 text-center">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--color-warning)]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <span className="material-symbols-outlined text-5xl text-[var(--color-warning)] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
            <h2 className="font-['Lexend'] text-xl font-bold text-white uppercase tracking-wider">Глобальный рейтинг</h2>
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">Лучшие тренеры мира по очкам рейтинга</p>
          </div>
        </section>

        <section className="space-y-3">
          {MOCK_LEADERBOARD.map((user) => (
            <div key={user.rank} className="flex items-center gap-4 glass-panel p-4 rounded-xl border border-white/5">
              <div className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-sm ${
                user.rank === 1 ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border border-[var(--color-warning)]/50' :
                user.rank === 2 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/50' :
                user.rank === 3 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/50' :
                'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]'
              }`}>
                {user.rank}
              </div>
              
              <div className="flex-1">
                <p className="font-bold text-sm text-white">{user.name}</p>
                <p className="text-xs text-[var(--color-on-surface-variant)]">{user.teamName}</p>
              </div>

              <div className="text-right">
                <p className="font-black text-emerald-400">{user.points}</p>
                <p className="text-[10px] uppercase tracking-widest text-[var(--color-on-surface-variant)]">{user.winRate}% WR</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
