import { type ReactNode, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { loadSquadPayload, saveSquadPayload } from '../lib/squad';
import type { SimulationPlayer, SimulationTeam, TacticalStyle } from '../types/simulation';

const TOURNAMENT_NEXT_FIXTURE_KEY = 'dc_tournament_next_fixture';

type TournamentFixtureHint = {
  round: number;
  opponentName: string;
};

function loadTournamentFixtureHint(): TournamentFixtureHint | null {
  const raw = localStorage.getItem(TOURNAMENT_NEXT_FIXTURE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as TournamentFixtureHint;
    if (typeof parsed?.round !== 'number' || typeof parsed?.opponentName !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function clonePlayer(player: SimulationPlayer, idSuffix: string): SimulationPlayer {
  return {
    ...player,
    id: `${player.id}-${idSuffix}`,
    name: `Rival ${player.rolePosition}`,
    isSubstitute: player.isSubstitute,
  };
}

function createOpponentFromTeam(team: SimulationTeam, style: TacticalStyle): SimulationTeam {
  return {
    name: 'Riverdale FC',
    formation: team.formation,
    tacticalStyle: style,
    players: team.players.map((player) => {
      const cloned = clonePlayer(player, 'opp');
      return {
        ...cloned,
        pac: Math.max(35, Math.min(95, player.pac - 2)),
        sho: Math.max(35, Math.min(95, player.sho - 2)),
        pas: Math.max(35, Math.min(95, player.pas - 2)),
        dri: Math.max(35, Math.min(95, player.dri - 2)),
        def: Math.max(35, Math.min(95, player.def - 2)),
        phy: Math.max(35, Math.min(95, player.phy - 2)),
      };
    }),
  };
}

export default function MatchSetup() {
  const navigate = useNavigate();
  const payload = useMemo(() => loadSquadPayload(), []);
  const tournamentFixture = useMemo(() => loadTournamentFixtureHint(), []);

  const [opponentName, setOpponentName] = useState(
    tournamentFixture?.opponentName ?? payload?.opponent?.name ?? 'Riverdale FC',
  );
  const [venue, setVenue] = useState<'HOME' | 'AWAY' | 'NEUTRAL'>(payload?.venue ?? 'HOME');
  const [opponentStyle, setOpponentStyle] = useState<TacticalStyle>(payload?.opponent?.tacticalStyle ?? 'BALANCED');
  const [opponentFormation, setOpponentFormation] = useState(payload?.opponent?.formation ?? '4-2-3-1');

  if (!payload) {
    return (
      <AppShell title="MATCH SETUP" activeTab="match" showBackButton>
        <div className="flex flex-col items-center justify-center h-[60vh] px-5 text-center">
          <span className="material-symbols-outlined text-6xl text-[var(--color-outline-variant)] mb-4">sports_soccer</span>
          <h1 className="font-['Lexend'] text-2xl font-bold mb-2">No Squad Found</h1>
          <p className="text-[var(--color-on-surface-variant)] mb-6 text-sm">You need to build your squad before starting a match.</p>
          <button
            onClick={() => navigate('/squad-builder')}
            className="rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-6 py-3 text-[var(--color-primary)] font-bold transition-colors hover:bg-[var(--color-primary)]/20"
          >
            Build Squad
          </button>
        </div>
      </AppShell>
    );
  }

  const onContinue = () => {
    const opponent = createOpponentFromTeam(payload.team, opponentStyle);
    opponent.name = opponentName.trim() || 'Riverdale FC';
    opponent.formation = opponentFormation;

    const next = {
      ...payload,
      venue,
      opponent,
    };

    saveSquadPayload(next);
    navigate('/live-match');
  };

  const currentOvr = payload.team.players 
    ? Math.round(payload.team.players.reduce((sum, p) => sum + p.rating, 0) / payload.team.players.length) 
    : 0;

  return (
    <AppShell title="MATCH SETUP" activeTab="match" showBackButton>
      <div className="px-5 space-y-6 animate-slide-up pb-8 pt-2">
        
        {/* VS Card */}
        <section className="glass-panel-solid rounded-3xl p-6 relative overflow-hidden shadow-lg border border-white/10">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[var(--color-primary)]/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[var(--color-blue-accent)]/10 rounded-full blur-2xl" />
          
          <div className="flex items-center justify-between relative z-10">
            {/* Home Team */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/20 border-2 border-[var(--color-primary)]/50 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl">shield</span>
              </div>
              <p className="font-['Lexend'] font-bold text-center text-white leading-tight">{payload.team.name}</p>
              <span className="text-[10px] uppercase font-bold text-[var(--color-on-surface-variant)] mt-1">{payload.team.formation}</span>
              <span className="text-xs font-bold text-[var(--color-primary)] mt-1">{currentOvr} OVR</span>
            </div>

            {/* VS Badge */}
            <div className="px-4 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center backdrop-blur-md">
                <span className="font-['Lexend'] font-black italic text-sm text-[var(--color-on-surface-variant)]">VS</span>
              </div>
              {tournamentFixture && (
                <span className="mt-2 text-[9px] uppercase tracking-widest text-[var(--color-warning)] font-bold bg-[var(--color-warning)]/10 px-2 py-0.5 rounded border border-[var(--color-warning)]/30">Round {tournamentFixture.round}</span>
              )}
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-16 h-16 rounded-full bg-[var(--color-blue-accent)]/20 border-2 border-[var(--color-blue-accent)]/50 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <span className="material-symbols-outlined text-[var(--color-blue-accent)] text-3xl">security</span>
              </div>
              <p className="font-['Lexend'] font-bold text-center text-white leading-tight">{opponentName}</p>
              <span className="text-[10px] uppercase font-bold text-[var(--color-on-surface-variant)] mt-1">{opponentFormation}</span>
              <span className="text-xs font-bold text-[var(--color-blue-accent)] mt-1">~{currentOvr - 2} OVR</span>
            </div>
          </div>
        </section>

        {/* Configuration */}
        <section className="glass-panel rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[var(--color-primary)]">tune</span>
            <h3 className="font-['Lexend'] text-sm uppercase tracking-wider text-white">Match Parameters</h3>
          </div>

          <Field label="Opponent Name" icon="edit">
            <input
              value={opponentName}
              onChange={(event) => setOpponentName(event.target.value)}
              className="w-full bg-[var(--color-surface-container-high)] rounded-xl border border-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors"
              placeholder="Enter opponent name"
            />
          </Field>

          <Field label="Match Venue" icon="stadium">
            <div className="grid grid-cols-3 gap-2">
              {(['HOME', 'NEUTRAL', 'AWAY'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVenue(v)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    venue === v 
                      ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]/50 text-[var(--color-primary)]' 
                      : 'bg-[var(--color-surface-container-high)] border-white/5 text-[var(--color-on-surface-variant)]'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Rival Formation" icon="schema">
              <select
                value={opponentFormation}
                onChange={(event) => setOpponentFormation(event.target.value)}
                className="w-full bg-[var(--color-surface-container-high)] rounded-xl border border-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors appearance-none"
              >
                <option>4-2-3-1</option>
                <option>4-3-3</option>
                <option>4-4-2</option>
                <option>4-1-4-1</option>
                <option>5-3-2</option>
              </select>
            </Field>

            <Field label="Rival Style" icon="strategy">
              <select
                value={opponentStyle}
                onChange={(event) => setOpponentStyle(event.target.value as TacticalStyle)}
                className="w-full bg-[var(--color-surface-container-high)] rounded-xl border border-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors appearance-none"
              >
                <option value="BALANCED">Balanced</option>
                <option value="HIGH_PRESS">High Press</option>
                <option value="COUNTER">Counter</option>
                <option value="POSSESSION">Possession</option>
                <option value="LOW_BLOCK">Low Block</option>
              </select>
            </Field>
          </div>
        </section>

        {/* Start Button */}
        <button
          onClick={onContinue}
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)] text-[var(--color-on-primary)] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all neon-glow shadow-lg active:scale-[0.98] mt-4"
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
          KICK OFF
        </button>
      </div>
    </AppShell>
  );
}

function Field({ label, icon, children }: { label: string; icon: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-center gap-1.5 mb-2 text-[var(--color-on-surface-variant)]">
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
        <p className="text-[10px] uppercase tracking-[0.15em] font-semibold">{label}</p>
      </div>
      {children}
    </label>
  );
}
