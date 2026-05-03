import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '../components/MobileBottomNav';
import { loadSquadPayload } from '../lib/squad';
import type { SimulationPlayer } from '../types/simulation';

function computeCardRating(player: SimulationPlayer): number {
  return Math.round((player.pac + player.sho + player.pas + player.dri + player.def + player.phy) / 6);
}

function fitLabel(player: SimulationPlayer): { text: string; color: string } {
  const role = player.rolePosition.toUpperCase();
  const natural = player.naturalPosition.toUpperCase();
  const preferred = (player.preferredPositions ?? []).map((value) => value.toUpperCase());

  if (role === natural || preferred.includes(role)) {
    return { text: 'Идеально подходит', color: 'text-emerald-300' };
  }

  if (roleBand(role) === roleBand(natural)) {
    return { text: 'Приемлемо', color: 'text-amber-300' };
  }

  return { text: 'Плохое соответствие', color: 'text-rose-300' };
}

function roleBand(role: string): 'GK' | 'DEF' | 'MID' | 'ATT' {
  if (role === 'GK') {
    return 'GK';
  }
  if (['CB', 'LCB', 'RCB', 'LB', 'RB', 'LWB', 'RWB'].includes(role)) {
    return 'DEF';
  }
  if (['CDM', 'CM', 'LCM', 'RCM', 'CAM', 'LM', 'RM'].includes(role)) {
    return 'MID';
  }
  return 'ATT';
}

export default function PlayerProfile() {
  const navigate = useNavigate();
  const players = useMemo(() => {
    const payload = loadSquadPayload();
    return payload?.team?.players ?? [];
  }, []);

  const [activePlayerId, setActivePlayerId] = useState<string>(players[0]?.id ?? '');
  const active = players.find((player) => player.id === activePlayerId) ?? players[0] ?? null;

  if (!active) {
    return (
      <div className="min-h-screen bg-[#050A15] text-white px-4 py-8 pb-24">
        <h1 className="font-['Lexend'] text-2xl">Профиль игрока</h1>
        <p className="mt-3 text-slate-400">Состав не найден. Сначала собери состав.</p>
        <button
          onClick={() => navigate('/player-selection')}
          className="mt-5 rounded-lg border border-emerald-500/70 bg-emerald-500/10 px-4 py-2 text-emerald-300"
        >
          Открыть выбор игроков
        </button>
        <MobileBottomNav active="squad" />
      </div>
    );
  }

  const fit = fitLabel(active);
  const rating = computeCardRating(active);

  return (
    <div className="min-h-screen bg-[#050A15] text-white pb-24">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_0%,rgba(34,197,94,0.16),transparent_40%),radial-gradient(circle_at_90%_10%,rgba(59,130,246,0.14),transparent_34%)]" />

      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-6 space-y-4">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate('/player-selection')} className="text-slate-300">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-['Lexend'] text-xl text-emerald-300 tracking-wide">ПРОФИЛЬ ИГРОКА</h1>
          <div className="w-8" />
        </header>

        <section className="rounded-2xl border border-white/10 bg-[#08162B]/90 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{active.rolePosition}</p>
              <h2 className="text-2xl font-semibold mt-1">{active.name}</h2>
              <p className={`text-sm mt-2 ${fit.color}`}>{fit.text}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-center">
              <p className="text-xs text-slate-300">OVR</p>
              <p className="text-3xl font-black text-emerald-300 leading-none mt-1">{rating}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
            <Metric label="PAC" value={active.pac} />
            <Metric label="SHO" value={active.sho} />
            <Metric label="PAS" value={active.pas} />
            <Metric label="DRI" value={active.dri} />
            <Metric label="DEF" value={active.def} />
            <Metric label="PHY" value={active.phy} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Meta label="Родная" value={active.naturalPosition} />
            <Meta label="Роль" value={active.rolePosition} />
            <Meta label="Выносливость" value={`${active.stamina}%`} />
            <Meta label="Рабочая интенсивность" value={`${active.attackWorkRate}/${active.defenseWorkRate}`} />
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#08162B]/90 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Игроки состава</p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {players.map((player) => {
              const selected = player.id === active.id;
              return (
                <button
                  key={player.id}
                  onClick={() => setActivePlayerId(player.id)}
                  className={`rounded-lg border px-3 py-2 text-left ${
                    selected ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-white/10 bg-[#0B1D38]'
                  }`}
                >
                  <p className="text-sm font-semibold truncate">{player.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{player.rolePosition}</p>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <MobileBottomNav active="squad" />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0B1D38] px-2 py-2 text-center">
      <p className="text-slate-400">{label}</p>
      <p className="text-white font-semibold mt-1">{value}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0B1D38] px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm text-slate-100 mt-1">{value}</p>
    </div>
  );
}

