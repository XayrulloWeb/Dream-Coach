import type { MatchFinalReport } from '../../types/simulation';

function TopStat({ title, home, away }: { title: string; home: string; away: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold mb-1">{title}</p>
      <div className="flex justify-between items-center bg-black/20 rounded border border-white/5 px-1 py-0.5">
        <span className="text-xs font-bold text-white">{home}</span>
        <span className="text-[10px] text-[var(--color-on-surface-variant)]">-</span>
        <span className="text-xs font-bold text-[var(--color-on-surface-variant)]">{away}</span>
      </div>
    </div>
  );
}

export default function TeamStatsGrid({ report }: { report: MatchFinalReport }) {
  return (
    <section className="glass-panel rounded-2xl p-4">
      <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm">bar_chart</span> Team Stats
      </p>
      <div className="grid grid-cols-4 gap-2">
        <TopStat title="Poss" home={`${report.stats.home.possession}%`} away={`${report.stats.away.possession}%`} />
        <TopStat title="Shots" home={`${report.stats.home.shots}`} away={`${report.stats.away.shots}`} />
        <TopStat title="On Tgt" home={`${report.stats.home.shotsOnTarget}`} away={`${report.stats.away.shotsOnTarget}`} />
        <TopStat title="xG" home={`${report.stats.home.xg}`} away={`${report.stats.away.xg}`} />
        <TopStat title="Big Ch" home={`${report.stats.home.bigChances}`} away={`${report.stats.away.bigChances}`} />
      </div>
    </section>
  );
}
