import type { CatalogPlayer } from '../lib/players';
import { calculatePositionFit } from '../lib/players';

type PlayerCardProps = {
  player: CatalogPlayer;
  slotRole?: string;
  fitScore?: number;
  compact?: boolean;
  disabled?: boolean;
  assignedLabel?: string;
  className?: string;
  showTags?: boolean;
};

export default function PlayerCard({
  player,
  slotRole,
  fitScore,
  compact = false,
  disabled = false,
  assignedLabel,
  className = '',
  showTags = true,
}: PlayerCardProps) {
  const actualFit = fitScore ?? (slotRole ? calculatePositionFit(player, slotRole) : undefined);
  const fitTone = getFitTone(actualFit);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-2 text-left transition ${
        disabled
          ? 'border-[#475569] bg-[#090f1b] opacity-65'
          : 'border-[#1f2e4d] bg-gradient-to-b from-[#0d1b37] via-[#08142b] to-[#061026]'
      } ${className}`}
    >
      <div className="absolute -top-8 -right-6 h-20 w-20 rounded-full bg-[#4be2771a]" />

      <div className="relative flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <PlayerPortrait name={player.name} faceUrl={player.faceUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#e5efff]">{player.name}</p>
            <p className="mt-0.5 text-[11px] text-[#8fa5c8]">
              {player.realPosition}
              {player.playerType !== 'CURRENT' ? ` • ${player.playerType}` : ''}
            </p>
          </div>
        </div>
        <div className="rounded-md border border-[#4be27766] bg-[#0d2c1d] px-2 py-0.5 text-sm font-bold text-[#4be277]">
          {player.rating}
        </div>
      </div>

      {actualFit !== undefined ? (
        <div className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${fitTone}`}>
          <span>Fit {actualFit}%</span>
          <span>{actualFit >= 90 ? 'OK' : actualFit >= 75 ? 'WARN' : 'RISK'}</span>
        </div>
      ) : null}

      <p className="mt-2 text-[11px] text-[#9fb0cb]">
        WR {player.attackWorkRate}/{player.defenseWorkRate} • WF {player.weakFoot} • SKI {player.skillMoves}
      </p>

      {!compact ? (
        <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
          <StatChip label="PAC" value={player.pac} />
          <StatChip label="SHO" value={player.sho} />
          <StatChip label="PAS" value={player.pas} />
          <StatChip label="DRI" value={player.dri} />
          <StatChip label="DEF" value={player.def} />
          <StatChip label="PHY" value={player.phy} />
        </div>
      ) : null}

      {showTags && player.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {player.tags.slice(0, compact ? 2 : 3).map((tag) => (
            <span key={tag} className="rounded border border-[#2d4368] bg-[#0a1831] px-1.5 py-0.5 text-[10px] text-[#b9cae8]">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {assignedLabel ? <p className="mt-2 text-[11px] text-[#F59E0B]">{assignedLabel}</p> : null}
    </div>
  );
}

function getFitTone(fit?: number): string {
  if (fit === undefined) {
    return 'border-[#2d4368] bg-[#0a1831] text-[#b9cae8]';
  }
  if (fit >= 90) {
    return 'border-[#2e8f56] bg-[#143724] text-[#84e3a9]';
  }
  if (fit >= 75) {
    return 'border-[#7b6a2d] bg-[#3b3317] text-[#f5d67b]';
  }
  return 'border-[#7e3b3b] bg-[#381b1b] text-[#f8adad]';
}

function PlayerPortrait({ name, faceUrl }: { name: string; faceUrl?: string | null }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[#345083] bg-[#091123]">
      {faceUrl ? (
        <img
          src={faceUrl}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-[#9cb2da]">
        {initials || 'P'}
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-[#21355f] bg-[#0a1831] px-1.5 py-1 text-center">
      <span className="text-[#6f86b0]">{label}</span>{' '}
      <span className="font-semibold text-[#d7e5ff]">{value}</span>
    </div>
  );
}
