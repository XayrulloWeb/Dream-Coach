import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadMatchHistory } from '../lib/matchHistory';
import { loadSavedSquads } from '../lib/savedSquads';
import { saveSquadPayload } from '../lib/squad';

const DAILY_CHALLENGES = [
  'Beat Prime Barcelona 2011 using only Serie A players.',
  'Win with 35% possession or less. Counter only.',
  'Protect a 1-0 lead after minute 60 with tactical changes.',
  'Use 4-4-2 and create 3+ big chances through wide play.',
  'Play low block first half, switch to high press after 60\'.',
];

export default function Home() {
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState('');

  const recentMatches = useMemo(() => loadMatchHistory().slice(0, 5), []);
  const savedSquads = useMemo(() => loadSavedSquads(), []);

  const wins = recentMatches.filter((match) => match.result === 'Win').length;
  const winRate = recentMatches.length ? Math.round((wins / recentMatches.length) * 100) : 0;

  const challenge = useMemo(() => {
    const index = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % DAILY_CHALLENGES.length;
    return DAILY_CHALLENGES[index] ?? DAILY_CHALLENGES[0];
  }, []);

  const matchesToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return recentMatches.filter((match) => match.createdAt.startsWith(today)).length;
  }, [recentMatches]);

  const freeMatchesPerDay = 5;
  const matchesLeft = Math.max(0, freeMatchesPerDay - matchesToday);
  const energy = Math.max(10, 100 - matchesToday * 15);

  return (
    <div className="bg-[#0B1220] min-h-screen text-white pb-24">
      <header className="fixed top-0 w-full z-50 bg-slate-950/70 backdrop-blur-xl border-b border-white/10 h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full overflow-hidden border border-[#334155]">
            <img
              alt="Coach profile"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuADD6abTEPgXscS6PNdp5KldcuYittHdY8udopx6Tbqw5-z-5OSrNkVQ-uhS4cNzoewoKJig5_Tx-ets-UDwO9zk26aVF9mmm3CgVAvfI3wme_OvlnPmZt0xrXFluxORdvA0xzZpdVkzaxECw_ZgdKDAdsDNTqToo_f99DUNAW2Qkw2PSlePCgJHSBOmA_X_tO2ltz_7wfVLv-TJm-Q3HoOlFeeCTDKj6t-6HdfdRNHo2VT9yR50TMPX3YnkrjxxvYzrbmop4GIi4s"
            />
          </div>
          <div>
            <p className="text-xs text-[#9CA3AF]">Coach Level 1</p>
            <p className="font-semibold text-[#E5E7EB]">Amateur</p>
          </div>
        </div>

        <h1 className="font-['Lexend'] text-lg text-[#22C55E] tracking-wider">DREAM COACH</h1>
      </header>

      <main className="pt-20 px-4 max-w-5xl mx-auto space-y-4">
        <section className="rounded-xl border border-[#334155] bg-[#111827] p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Metric title="Energy" value={`${energy}%`} valueClass="text-[#A3E635]" />
            <Metric title="Matches Left" value={`${matchesLeft}/${freeMatchesPerDay}`} valueClass="text-[#22C55E]" />
            <Metric title="Win Rate" value={`${winRate}%`} valueClass="text-[#3B82F6]" />
          </div>
        </section>

        <section className="rounded-xl border border-[#3d4a3d] bg-[#111827] p-4">
          <p className="text-xs tracking-[0.14em] text-[#A3E635] uppercase">Daily Tactical Challenge</p>
          <p className="mt-2 text-sm text-[#E5E7EB] leading-relaxed">{challenge}</p>
          <button
            onClick={() => navigate('/player-selection')}
            className="mt-4 rounded-lg border border-[#22C55E] bg-[#22C55E22] px-3 py-2 text-sm text-[#A3E635]"
          >
            Start Challenge
          </button>
        </section>

        <button
          onClick={() => navigate('/player-selection')}
          className="w-full rounded-xl bg-[#22C55E] text-[#052e16] py-4 font-['Lexend'] font-semibold text-lg shadow-[0_0_20px_rgba(34,197,94,0.35)]"
        >
          Create New Match
        </button>

        <section className="rounded-xl border border-[#334155] bg-[#111827] p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-['Lexend'] text-lg text-[#E5E7EB]">My Saved Squads</h3>
            <span className="text-xs text-[#9CA3AF]">{savedSquads.length}</span>
          </div>

          {savedSquads.length ? (
            <div className="mt-3 space-y-2">
              {savedSquads.slice(0, 6).map((squad) => (
                <div key={squad.id} className="rounded-lg border border-[#334155] bg-[#0f172a] p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{squad.name}</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">
                      {squad.formation} • {squad.tacticalStyle} • OVR {squad.averageRating}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      saveSquadPayload(squad.payload);
                      setStatusMessage(`Loaded: ${squad.name}`);
                      navigate('/squad-builder');
                    }}
                    className="shrink-0 rounded-md border border-[#22C55E] px-3 py-1.5 text-xs text-[#A3E635]"
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#9CA3AF]">No saved squads yet. Build one and save.</p>
          )}

          {statusMessage ? <p className="mt-2 text-xs text-[#A3E635]">{statusMessage}</p> : null}
        </section>

        <section className="rounded-xl border border-[#334155] bg-[#111827] p-4">
          <h3 className="font-['Lexend'] text-lg text-[#E5E7EB]">Recent Matches</h3>
          {recentMatches.length ? (
            <div className="mt-3 space-y-2">
              {recentMatches.map((match) => (
                <div key={match.id} className="rounded-lg border border-[#334155] bg-[#0f172a] p-3">
                  <p className="text-sm text-[#E5E7EB]">
                    {match.homeTeam} {match.homeScore} - {match.awayScore} {match.awayTeam}
                  </p>
                  <p className="text-xs text-[#9CA3AF] mt-1">xG {match.xg.home} - {match.xg.away} • {match.result}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#9CA3AF]">No simulated matches yet.</p>
          )}
        </section>
      </main>
    </div>
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
      <p className="text-xs text-[#9CA3AF] uppercase">{title}</p>
      <p className={`text-lg font-bold mt-1 ${valueClass ?? 'text-[#E5E7EB]'}`}>{value}</p>
    </div>
  );
}
