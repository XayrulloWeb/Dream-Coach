import type { MatchFinalReport } from '../../types/simulation';

export default function PlayerRatingsList({ report }: { report: MatchFinalReport }) {
  return (
    <section className="glass-panel rounded-2xl p-4">
      <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm">group</span> Оценки игроков
      </p>
      
      <div className="space-y-2">
        {report.playerRatings.slice(0, 11).map((entry) => (
          <div key={`${entry.playerId}`} className="flex items-center justify-between rounded-xl border border-white/5 bg-[var(--color-surface-container-highest)] p-3">
            <div>
              <p className="text-sm font-bold">{entry.name} <span className="text-xs font-normal text-[var(--color-on-surface-variant)]">({entry.position})</span></p>
              <div className="flex gap-3 mt-0.5">
                {entry.stats.goals > 0 && <span className="text-[10px] text-[var(--color-primary)] font-semibold">{entry.stats.goals} гол(а)</span>}
                {entry.stats.assists > 0 && <span className="text-[10px] text-[var(--color-blue-accent)] font-semibold">{entry.stats.assists} ассист(а)</span>}
                {entry.ratingReasons.length > 0 && <span className="text-[10px] text-[var(--color-on-surface-variant)] italic">{entry.ratingReasons[0]}</span>}
              </div>
            </div>
            <div className={`px-2.5 py-1 rounded-lg border font-bold text-sm ${
              entry.rating >= 8.5 ? 'border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 text-[var(--color-warning)]' :
              entry.rating >= 7.0 ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]' :
              'border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
            }`}>
              {entry.rating.toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
