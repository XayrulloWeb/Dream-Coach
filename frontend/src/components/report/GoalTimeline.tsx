import type { MatchFinalReport } from '../../types/simulation';

export default function GoalTimeline({ report }: { report: MatchFinalReport }) {
  return (
    <section className="glass-panel rounded-2xl p-4">
      <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm">sports_soccer</span> Хронология голов
      </p>
      <div className="space-y-2">
        {report.goals.length ? report.goals.map((goal, idx) => (
          <div key={`${goal.minute}-${goal.scorer}-${idx}`} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-surface-container-highest)] border border-white/5">
            <span className="text-xs font-bold bg-black/40 px-1.5 py-0.5 rounded text-[var(--color-primary)]">{goal.minute}'</span>
            <div>
              <p className="text-sm font-semibold">{goal.scorer}</p>
              {goal.assist && <p className="text-[10px] text-[var(--color-on-surface-variant)] font-medium">Голевая: {goal.assist}</p>}
            </div>
          </div>
        )) : <p className="text-sm text-[var(--color-on-surface-variant)] p-2">Голы не зафиксированы.</p>}
      </div>
    </section>
  );
}

