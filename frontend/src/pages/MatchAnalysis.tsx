import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '../components/MobileBottomNav';
import { loadMatchHistory } from '../lib/matchHistory';
import type { MatchFinalReport } from '../types/simulation';

const LAST_MATCH_REPORT_KEY = 'dc_last_match_report';

function loadLastReport(): MatchFinalReport | null {
  const raw = localStorage.getItem(LAST_MATCH_REPORT_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as MatchFinalReport;
  } catch {
    return null;
  }
}

export default function MatchAnalysis() {
  const navigate = useNavigate();
  const report = useMemo(() => loadLastReport(), []);
  const history = useMemo(() => loadMatchHistory(), []);

  if (!report) {
    return (
      <div className="min-h-screen bg-[#050A15] text-white p-6 pb-24">
        <h1 className="font-['Lexend'] text-2xl">Match Analysis</h1>
        <p className="mt-3 text-slate-400">No completed match found yet.</p>
        <button
          onClick={() => navigate('/live-match')}
          className="mt-5 rounded-lg border border-emerald-500/70 bg-emerald-500/10 px-4 py-2 text-emerald-300"
        >
          Go to Live Match
        </button>
        <MobileBottomNav active="report" />
      </div>
    );
  }

  const topIssues = report.insights.flatMap((insight) => insight.issues).slice(0, 3);
  const avgRating = report.playerRatings.length
    ? (report.playerRatings.reduce((sum, item) => sum + item.rating, 0) / report.playerRatings.length).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-screen bg-[#050A15] text-white pb-24">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.13),transparent_36%),radial-gradient(circle_at_80%_0%,rgba(34,197,94,0.13),transparent_35%)]" />

      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-6 space-y-4">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate('/match-report')} className="text-slate-300">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-['Lexend'] text-xl text-emerald-300 tracking-wide">MATCH ANALYSIS</h1>
          <div className="w-8" />
        </header>

        <section className="rounded-2xl border border-white/10 bg-[#08162B]/90 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Performance Summary</p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Metric label="Score" value={`${report.score.home}-${report.score.away}`} />
            <Metric label="xG" value={`${report.stats.home.xg} / ${report.stats.away.xg}`} />
            <Metric label="Avg Rating" value={avgRating} />
            <Metric label="MVP" value={report.mvp?.playerName ?? 'N/A'} />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#08162B]/90 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Top Tactical Issues</p>
          <div className="mt-3 space-y-2">
            {topIssues.length ? (
              topIssues.map((issue, index) => (
                <div key={`${issue.type}-${index}`} className="rounded-lg border border-white/10 bg-[#0B1D38] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-100">{issue.type.replaceAll('_', ' ')}</p>
                    <span className="text-xs text-amber-300">{issue.severity}</span>
                  </div>
                  <p className="text-sm mt-1 text-slate-300">{issue.message}</p>
                  {issue.suggestedActions.length ? (
                    <p className="text-xs mt-2 text-emerald-300">Fix: {issue.suggestedActions[0]}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No tactical alerts.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#08162B]/90 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Trend (Recent Matches)</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Metric label="Matches" value={`${history.length}`} />
            <Metric label="Wins" value={`${history.filter((item) => item.result === 'Win').length}`} />
            <Metric label="Win Rate" value={`${history.length ? Math.round((history.filter((item) => item.result === 'Win').length / history.length) * 100) : 0}%`} />
          </div>
        </section>

        <button
          onClick={() => navigate('/match-setup')}
          className="w-full rounded-xl bg-[#22C55E] py-3 font-['Lexend'] font-semibold text-[#06210F]"
        >
          NEXT MATCH SETUP
        </button>
      </main>

      <MobileBottomNav active="report" />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0B1D38] p-3">
      <p className="text-[10px] uppercase tracking-[0.11em] text-slate-400">{label}</p>
      <p className="text-sm mt-1 text-slate-100 truncate">{value}</p>
    </div>
  );
}
