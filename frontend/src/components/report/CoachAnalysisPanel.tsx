import type { MatchFinalReport } from '../../types/simulation';

export default function CoachAnalysisPanel({ report }: { report: MatchFinalReport }) {
  if (!report.tacticalSummary) return null;
  
  return (
    <section className="glass-panel rounded-2xl p-4">
      <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm">lightbulb</span> Тактический разбор
      </p>
      
      <div className="space-y-4">
        <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 p-3 rounded-xl">
          <p className="text-[10px] uppercase text-[var(--color-primary)] font-bold mb-1">Что сработало</p>
          <ul className="list-disc pl-4 space-y-1 text-sm leading-snug">
            {report.tacticalSummary.whatWorked.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
        
        <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 p-3 rounded-xl">
          <p className="text-[10px] uppercase text-[var(--color-danger)] font-bold mb-1">Что не сработало</p>
          <ul className="list-disc pl-4 space-y-1 text-sm leading-snug">
            {report.tacticalSummary.whatFailed.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>

        {report.tacticalSummary.keyDecision && (
          <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 p-3 rounded-xl">
            <p className="text-[10px] uppercase text-[var(--color-warning)] font-bold mb-1">Ключевое решение</p>
            <p className="text-sm leading-snug">{report.tacticalSummary.keyDecision}</p>
          </div>
        )}
        
        <div className="bg-[var(--color-blue-accent)]/10 border border-[var(--color-blue-accent)]/20 p-3 rounded-xl">
          <p className="text-[10px] uppercase text-[var(--color-blue-accent)] font-bold mb-1">Советы на следующий матч</p>
          <ul className="list-disc pl-4 space-y-1 text-sm leading-snug">
            {report.tacticalSummary.nextMatchAdvice.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

