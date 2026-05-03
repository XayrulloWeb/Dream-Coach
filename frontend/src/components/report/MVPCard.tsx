import type { MatchFinalReport } from '../../types/simulation';

export default function MVPCard({ report }: { report: MatchFinalReport }) {
  if (!report.mvp) return null;
  
  return (
    <section className="glass-panel rounded-2xl p-4 border-[var(--color-warning)]/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <span className="material-symbols-outlined text-8xl text-[var(--color-warning)]">workspace_premium</span>
      </div>
      
      <p className="text-[10px] uppercase tracking-widest text-[var(--color-warning)] font-bold mb-2 flex items-center gap-2 relative z-10">
        <span className="material-symbols-outlined text-sm">star</span> Match MVP
      </p>
      
      <div className="relative z-10">
        <p className="text-2xl font-black text-white">{report.mvp.name}</p>
        <p className="text-sm font-semibold text-[var(--color-on-surface-variant)]">{report.mvp.reason}</p>
        <div className="mt-4 inline-block px-3 py-1 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 text-[var(--color-warning)] font-bold text-lg">
          Rating: {report.mvp.rating.toFixed(1)}
        </div>
      </div>
    </section>
  );
}
