import type { MatchFinalReport } from '../../types/simulation';

export default function FinalScoreHero({ report }: { report: MatchFinalReport }) {
  const isWin = report.score.home > report.score.away;
  const isDraw = report.score.home === report.score.away;
  const resultColor = isWin ? 'text-[var(--color-primary)]' : isDraw ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]';
  const resultBg = isWin ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30' : isDraw ? 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30' : 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30';

  return (
    <section className={`rounded-3xl border ${resultBg} p-6 relative overflow-hidden shadow-lg`}>
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
      
      <div className="text-center mb-4 relative z-10">
        <span className={`px-3 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase transition-colors bg-black/30 backdrop-blur-md ${resultColor} border-current`}>
          {isWin ? 'ПОБЕДА' : isDraw ? 'НИЧЬЯ' : 'ПОРАЖЕНИЕ'}
        </span>
      </div>

      <div className="flex items-center justify-between relative z-10">
        <div className="text-center flex-1">
          <p className="font-bold text-[var(--color-primary)] text-sm sm:text-base">Dream FC</p>
          <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase mt-0.5 font-semibold">Дома</p>
        </div>
        
        <div className="flex items-center gap-4 px-4">
          <span className="text-5xl sm:text-6xl font-black">{report.score.home}</span>
          <span className="text-2xl text-[var(--color-on-surface-variant)]">-</span>
          <span className="text-5xl sm:text-6xl font-black">{report.score.away}</span>
        </div>

        <div className="text-center flex-1">
          <p className="font-bold text-[var(--color-blue-accent)] text-sm sm:text-base">Соперник</p>
          <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase mt-0.5 font-semibold">В гостях</p>
        </div>
      </div>
    </section>
  );
}

