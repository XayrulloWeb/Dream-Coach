import type { MatchFinalReport } from '../../types/simulation';

export default function CoachCard({ report, onSave }: { report: MatchFinalReport, onSave: () => void }) {
  if (!report.coachCard) return null;

  return (
    <section className="glass-panel rounded-2xl p-4 flex flex-col items-center">
      <p className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] font-bold mb-4 flex items-center gap-2 self-start">
        <span className="material-symbols-outlined text-sm">share</span> Карточка тренера
      </p>

      {/* HTML Card representation */}
      <div id="coach-card-element" className="w-full max-w-[320px] bg-[#050A15] border border-white/10 rounded-xl overflow-hidden shadow-2xl relative mb-4">
        {/* Background Accents */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--color-primary)]/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[var(--color-blue-accent)]/20 rounded-full blur-2xl" />

        <div className="p-5 relative z-10">
          <h2 className="text-xl font-black text-[var(--color-primary)] italic tracking-tight">{report.coachCard.title}</h2>
          
          <div className="mt-4 pb-4 border-b border-white/10">
            <p className="text-[10px] uppercase text-[var(--color-on-surface-variant)] font-bold tracking-widest mb-1">Результат матча</p>
            <p className="text-2xl font-black">{report.coachCard.score}</p>
          </div>

          <div className="mt-4 pb-4 border-b border-white/10">
            <p className="text-[10px] uppercase text-[var(--color-on-surface-variant)] font-bold tracking-widest mb-1">План на матч</p>
            <p className="text-sm font-semibold">{report.coachCard.tacticalTag} ({report.coachCard.formation})</p>
          </div>

          {report.coachCard.mvp && (
            <div className="mt-4 pb-4 border-b border-white/10">
              <p className="text-[10px] uppercase text-[var(--color-warning)] font-bold tracking-widest mb-1">Лучший игрок матча</p>
              <p className="text-sm font-semibold">{report.coachCard.mvp.name} <span className="text-[var(--color-warning)]">({report.coachCard.mvp.rating})</span></p>
            </div>
          )}

          <div className="mt-4 pb-2">
            <p className="text-[10px] uppercase text-[var(--color-on-surface-variant)] font-bold tracking-widest mb-1">Ключевое решение</p>
            <p className="text-xs font-medium leading-snug">{report.coachCard.keyDecision}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-black/40 border-t border-[var(--color-primary)] p-2 text-center relative z-10">
          <p className="text-[8px] uppercase tracking-widest text-[var(--color-on-surface-variant)]">Футбольный симулятор с ИИ</p>
        </div>
      </div>

      <button
        onClick={onSave}
        className="w-full flex items-center justify-center gap-2 glass-panel hover:bg-[var(--color-surface-container-high)] p-3 rounded-xl border border-[var(--color-primary)]/30 text-[var(--color-primary)] transition-colors active:scale-95"
      >
        <span className="material-symbols-outlined text-xl">download</span>
        <span className="text-[10px] uppercase tracking-wider font-bold">Сохранить карточку как изображение</span>
      </button>
    </section>
  );
}

