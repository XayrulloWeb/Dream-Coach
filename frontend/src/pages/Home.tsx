import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { loadMatchHistory } from '../lib/matchHistory';
import { loadSavedSquads } from '../lib/savedSquads';
import { loadSquadPayload } from '../lib/squad';
import { api } from '../lib/api';

interface MatchHistoryItem {
  id: string;
  status: string;
  userScore: number;
  opponentScore: number;
  opponentName: string;
  createdAt: string;
  venue: string;
}



export default function Home() {
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState('');

  const [recentMatches, setRecentMatches] = useState<MatchHistoryItem[]>([]);
  const savedSquads = useMemo(() => loadSavedSquads(), []);
  const currentSquad = useMemo(() => loadSquadPayload(), []);

  useEffect(() => {
    let active = true;
    api.get<{ items: MatchHistoryItem[] }>('/api/matches/history')
      .then(res => {
        if (active) setRecentMatches(res.data.items.slice(0, 5));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const wins = recentMatches.filter((match) => match.userScore > match.opponentScore).length;
  const winRate = recentMatches.length ? Math.round((wins / recentMatches.length) * 100) : 0;



  const matchesToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return recentMatches.filter((match) => match.createdAt.startsWith(today)).length;
  }, [recentMatches]);

  const freeMatchesPerDay = 5;
  const matchesLeft = Math.max(0, freeMatchesPerDay - matchesToday);
  const energy = Math.max(10, 100 - matchesToday * 15);
  const formLevel = Math.max(1, Math.min(5, Math.round((winRate / 100) * 5)));

  // Calculate real OVR and Form from current squad
  const currentOvr = currentSquad?.team.players 
    ? Math.round(currentSquad.team.players.reduce((sum, p) => sum + p.rating, 0) / currentSquad.team.players.length) 
    : 0;

  return (
    <AppShell title="Dream Coach" activeTab="home" hideHeader>
      {/* Custom Header for Home */}
      <header className="w-full z-40 bg-transparent pt-safe mb-2 animate-fade-in-down">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border border-[var(--color-primary)]/50 bg-[var(--color-surface-container)] flex items-center justify-center neon-glow">
              <span className="material-symbols-outlined text-[var(--color-primary)] text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>sports_soccer</span>
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-primary)] tracking-[0.18em] uppercase font-bold">Dream Coach</p>
              <p className="text-sm text-[var(--color-on-surface-variant)] font-medium mt-0.5">Elite Division</p>
            </div>
          </div>

          <button type="button" onClick={() => navigate('/profile')} className="h-11 w-11 rounded-full overflow-hidden border-2 border-[var(--color-primary)]/40 hover:border-[var(--color-primary)] transition-colors shadow-[0_0_15px_rgba(34,197,94,0.15)]">
            <img
              alt="Coach profile"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuADD6abTEPgXscS6PNdp5KldcuYittHdY8udopx6Tbqw5-z-5OSrNkVQ-uhS4cNzoewoKJig5_Tx-ets-UDwO9zk26aVF9mmm3CgVAvfI3wme_OvlnPmZt0xrXFluxORdvA0xzZpdVkzaxECw_ZgdKDAdsDNTqToo_f99DUNAW2Qkw2PSlePCgJHSBOmA_X_tO2ltz_7wfVLv-TJm-Q3HoOlFeeCTDKj6t-6HdfdRNHo2VT9yR50TMPX3YnkrjxxvYzrbmop4GIi4s"
            />
          </button>
        </div>
      </header>

      <div className="px-5 space-y-6">
        {/* Hero Section */}
        <section className="glass-panel-solid rounded-3xl p-6 relative overflow-hidden animate-slide-up animate-delay-1">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <p className="text-[var(--color-on-surface-variant)] text-sm font-medium mb-1">Welcome back,</p>
            <h1 className="font-['Lexend'] text-4xl leading-tight mb-4 tracking-tight">
              Coach <span className="text-[var(--color-primary)]">Dream</span>
            </h1>
            
            <button 
              onClick={() => navigate('/match-setup')}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)] text-[var(--color-on-primary)] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all neon-glow shadow-lg active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              QUICK MATCH
            </button>
          </div>
        </section>

        {/* Team Snapshot & Stats */}
        <div className="grid grid-cols-2 gap-3 animate-slide-up animate-delay-2">
          <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] text-xl">shield</span>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)] font-semibold">Form {formLevel}/5</span>
              </div>
              <p className="font-semibold text-white truncate">{currentSquad?.team.name || 'Dream FC'}</p>
              <p className="text-xs text-[var(--color-primary)] mt-0.5">{currentSquad?.team.formation || '4-3-3'} • {currentSquad?.team.tacticalStyle || 'BALANCED'}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <div className="bg-[var(--color-surface-container)] rounded border border-white/5 px-2 py-1">
                <p className="text-[9px] uppercase text-[var(--color-on-surface-variant)]">OVR</p>
                <p className="font-bold text-white text-sm">{currentOvr || '--'}</p>
              </div>
              <div className="bg-[var(--color-surface-container)] rounded border border-white/5 px-2 py-1">
                <p className="text-[9px] uppercase text-[var(--color-on-surface-variant)]">Win</p>
                <p className="font-bold text-white text-sm">{winRate}%</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="glass-panel rounded-2xl p-3 flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-[var(--color-on-surface-variant)] uppercase font-semibold">Energy</span>
                <span className="text-xs font-bold text-[var(--color-lime)]">{energy}%</span>
              </div>
              <div className="stat-bar bg-black/40">
                <div className="stat-bar-fill bg-[var(--color-lime)]" style={{ width: `${energy}%` }} />
              </div>
            </div>
            
            <div className="glass-panel rounded-2xl p-3 flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-[var(--color-on-surface-variant)] uppercase font-semibold">Matches</span>
                <span className="text-xs font-bold text-[var(--color-primary)]">{matchesLeft}/{freeMatchesPerDay}</span>
              </div>
              <div className="stat-bar bg-black/40">
                <div className="stat-bar-fill bg-[var(--color-primary)]" style={{ width: `${(matchesLeft/freeMatchesPerDay)*100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <section className="grid grid-cols-2 gap-3 animate-slide-up animate-delay-3">
          <ActionCard title="Squad" subtitle="Build Team" onClick={() => navigate('/squad-builder')} icon="groups" />
          <ActionCard title="Tactics" subtitle="Setup Plan" onClick={() => navigate('/squad-builder')} icon="strategy" />
          <ActionCard title="Players" subtitle="Catalog" onClick={() => navigate('/player-selection')} icon="badge" />
          <ActionCard title="History" subtitle="Past Matches" onClick={() => navigate('/match-history')} icon="history" />
        </section>



        {/* Recent Matches Timeline */}
        <section className="animate-slide-up animate-delay-5 mb-6">
          <div className="flex justify-between items-end mb-4">
            <h3 className="font-['Lexend'] text-lg text-white">Recent Matches</h3>
            <button onClick={() => navigate('/match-history')} className="text-xs text-[var(--color-primary)] font-medium">View All</button>
          </div>
          
          <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-white/5">
            {recentMatches.length ? (
              recentMatches.map((match) => (
                <div key={match.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer" onClick={() => navigate('/match-history')}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${match.userScore > match.opponentScore ? 'bg-[var(--color-primary)]' : match.userScore < match.opponentScore ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-warning)]'}`} />
                      <span className="text-[10px] uppercase tracking-wider text-[var(--color-on-surface-variant)]">{match.userScore > match.opponentScore ? 'Win' : match.userScore < match.opponentScore ? 'Loss' : 'Draw'}</span>
                      <span className="text-[10px] text-[var(--color-on-surface-variant)] ml-auto">{new Date(match.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center pr-2">
                      <span className={`font-medium text-sm ${match.userScore > match.opponentScore ? 'text-white' : 'text-[var(--color-on-surface-variant)]'}`}>Dream FC</span>
                      <span className="font-bold text-white bg-black/30 px-2 rounded">{match.userScore} - {match.opponentScore}</span>
                      <span className={`font-medium text-sm ${match.opponentScore > match.userScore ? 'text-white' : 'text-[var(--color-on-surface-variant)]'}`}>{match.opponentName}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-[var(--color-outline-variant)] mb-2">history</span>
                <p className="text-sm text-[var(--color-on-surface-variant)]">No matches played yet.</p>
                <p className="text-xs text-[var(--color-on-surface-variant)]/70 mt-1">Play a match to see your history here.</p>
              </div>
            )}
          </div>
        </section>
        
        {/* Safe area padding block is handled by AppShell pb-24 */}
      </div>
    </AppShell>
  );
}

function ActionCard({ title, subtitle, icon, onClick }: { title: string; subtitle: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass-panel hover:bg-[var(--color-surface-container-high)] rounded-2xl p-4 text-left transition-all group border border-white/5 hover:border-[var(--color-primary)]/30 active:scale-[0.97]"
    >
      <div className="w-10 h-10 rounded-full bg-[var(--color-surface-container-lowest)] border border-white/5 flex items-center justify-center mb-3 group-hover:bg-[var(--color-primary)]/10 group-hover:border-[var(--color-primary)]/30 transition-colors">
        <span className="material-symbols-outlined text-[var(--color-primary)] text-[20px] transition-transform group-hover:scale-110">{icon}</span>
      </div>
      <p className="font-semibold text-white text-sm">{title}</p>
      <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-0.5">{subtitle}</p>
    </button>
  );
}

function Metric({
  title,
  value,
  valueClass,
}: {
  title: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-[#334155] bg-[#0f172a] p-3">
      <p className="text-xs text-[#9CA3AF] uppercase tracking-[0.12em]">{title}</p>
      <p className={`text-lg font-bold mt-1 ${valueClass ?? 'text-[#E5E7EB]'}`}>{value}</p>
    </div>
  );
}
