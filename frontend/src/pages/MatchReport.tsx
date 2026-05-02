import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MatchFinalReport } from '../types/simulation';

const LAST_MATCH_REPORT_KEY = 'dc_last_match_report';

function loadReport(): MatchFinalReport | null {
  const raw = localStorage.getItem(LAST_MATCH_REPORT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as MatchFinalReport;
    if (!parsed?.score || !parsed?.stats) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export default function MatchReport() {
  const navigate = useNavigate();
  const report = useMemo(() => loadReport(), []);
  const [shareMessage, setShareMessage] = useState('');

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white px-5 py-10">
        <h1 className="font-['Lexend'] text-3xl">Match Report</h1>
        <p className="text-[#9CA3AF] mt-3">No report found. Play a match first.</p>
        <button
          onClick={() => navigate('/live-match')}
          className="mt-6 rounded-lg border border-[#22C55E] bg-[#22C55E22] px-4 py-2 text-[#A3E635]"
        >
          Go to Live Match
        </button>
      </div>
    );
  }

  const headline = `Dream Coach result: ${report.score.home}-${report.score.away}. xG ${report.stats.home.xg}-${report.stats.away.xg}`;
  const analysis = buildCoachAnalysis(report);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Dream Coach Match Report',
          text: headline,
        });
        setShareMessage('Shared successfully.');
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(headline);
        setShareMessage('Copied to clipboard.');
        return;
      }

      setShareMessage(headline);
    } catch {
      setShareMessage('Unable to share right now.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white px-5 py-6 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="font-['Lexend'] text-3xl">Match Report</h1>
        <button onClick={() => navigate('/live-match')} className="text-[#9CA3AF]">Back</button>
      </header>

      <section className="mt-6 rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <p className="text-xs tracking-[0.14em] text-[#A3E635]">FINAL SCORE</p>
        <p className="font-['Lexend'] text-4xl mt-2 text-[#22C55E]">{report.score.home} - {report.score.away}</p>
        <p className="text-[#9CA3AF] mt-2">Possession {report.stats.home.possession}% vs {report.stats.away.possession}%</p>
        <p className="text-[#9CA3AF]">Shots {report.stats.home.shots} vs {report.stats.away.shots}</p>
        <p className="text-[#9CA3AF]">xG {report.stats.home.xg} vs {report.stats.away.xg}</p>
      </section>

      <section className="mt-4 rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <p className="text-xs tracking-[0.14em] text-[#A3E635]">MVP</p>
        <p className="mt-2 text-lg">{report.mvp ? `${report.mvp.playerName} (${report.mvp.rating})` : 'No MVP'}</p>
      </section>

      <section className="mt-4 rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <p className="text-xs tracking-[0.14em] text-[#A3E635]">GOALS & ASSISTS</p>
        <div className="mt-2 space-y-2">
          {report.goals.length ? report.goals.map((goal) => (
            <p key={`${goal.minute}-${goal.scorer}`} className="text-sm text-[#E5E7EB]">
              {goal.minute}' {goal.scorer}{goal.assist ? ` (A: ${goal.assist})` : ''}
            </p>
          )) : <p className="text-sm text-[#9CA3AF]">No goals recorded.</p>}
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <p className="text-xs tracking-[0.14em] text-[#A3E635]">TOP PLAYER RATINGS</p>
        <div className="mt-2 space-y-1">
          {report.playerRatings.slice(0, 8).map((entry) => (
            <p key={`${entry.team}-${entry.playerId}`} className="text-sm text-[#E5E7EB]">
              {entry.playerName}: {entry.rating}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <p className="text-xs tracking-[0.14em] text-[#A3E635]">COACH ANALYSIS</p>
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs text-[#22C55E] uppercase">What Worked</p>
            <p className="text-sm text-[#E5E7EB] mt-1">{analysis.whatWorked}</p>
          </div>
          <div>
            <p className="text-xs text-[#EF4444] uppercase">What Failed</p>
            <p className="text-sm text-[#E5E7EB] mt-1">{analysis.whatFailed}</p>
          </div>
          <div>
            <p className="text-xs text-[#3B82F6] uppercase">Recommendation</p>
            <p className="text-sm text-[#E5E7EB] mt-1">{analysis.recommendation}</p>
          </div>
        </div>
      </section>

      <button
        onClick={() => void handleShare()}
        className="mt-5 w-full rounded-lg border border-[#22C55E] bg-[#22C55E22] py-3 text-[#A3E635]"
      >
        Share Result
      </button>
      <button
        onClick={() => downloadShareCard(report)}
        className="mt-3 w-full rounded-lg border border-[#3B82F6] bg-[#3B82F622] py-3 text-[#93C5FD]"
      >
        Export Share Card (PNG)
      </button>
      {shareMessage ? <p className="mt-2 text-xs text-[#9CA3AF]">{shareMessage}</p> : null}
    </div>
  );
}

function buildCoachAnalysis(report: MatchFinalReport): {
  whatWorked: string;
  whatFailed: string;
  recommendation: string;
} {
  const topMvp = report.mvp ? `${report.mvp.playerName} drove your best sequences.` : 'Your shape generated the best sequences.';
  const chanceText =
    report.stats.home.bigChances >= report.stats.away.bigChances
      ? `You created ${report.stats.home.bigChances} big chances and controlled chance quality.`
      : `You were efficient in transitions despite fewer big chances (${report.stats.home.bigChances}).`;

  const whatWorked = `${topMvp} ${chanceText}`;

  const failedByStamina =
    report.events.filter((event) => event.type === 'INJURY').length > 0 ||
    report.events.filter((event) => event.type === 'TACTICAL_WARNING').length > 0;

  const whatFailed = failedByStamina
    ? 'Late-game structure dropped after heavy intensity. Opponent found easier routes during transitions.'
    : 'Final-third execution was inconsistent. Several shots did not convert into goals.';

  const recommendation =
    report.stats.home.possession < 45
      ? 'Add one control midfielder or reduce tempo after minute 60 to stabilize possession.'
      : 'Keep current base shape, but rotate front line earlier to protect stamina after minute 65.';

  return { whatWorked, whatFailed, recommendation };
}

function downloadShareCard(report: MatchFinalReport): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  ctx.fillStyle = '#0B1220';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#22C55E';
  ctx.font = 'bold 56px Arial';
  ctx.fillText('DREAM COACH', 70, 110);

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '30px Arial';
  ctx.fillText('Match Result', 70, 170);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 140px Arial';
  ctx.fillText(`${report.score.home} - ${report.score.away}`, 70, 340);

  ctx.fillStyle = '#E5E7EB';
  ctx.font = '40px Arial';
  ctx.fillText(`xG ${report.stats.home.xg} - ${report.stats.away.xg}`, 70, 420);
  ctx.fillText(`Shots ${report.stats.home.shots} - ${report.stats.away.shots}`, 70, 480);
  ctx.fillText(`Possession ${report.stats.home.possession}% - ${report.stats.away.possession}%`, 70, 540);

  ctx.fillStyle = '#A3E635';
  ctx.font = 'bold 42px Arial';
  const mvp = report.mvp ? `${report.mvp.playerName} (${report.mvp.rating})` : 'No MVP';
  ctx.fillText(`MVP: ${mvp}`, 70, 640);

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '30px Arial';
  ctx.fillText('Top Moments', 70, 720);

  ctx.fillStyle = '#E5E7EB';
  ctx.font = '28px Arial';
  report.goals.slice(0, 4).forEach((goal, idx) => {
    const text = `${goal.minute}' ${goal.scorer}${goal.assist ? ` (A: ${goal.assist})` : ''}`;
    ctx.fillText(text, 70, 770 + idx * 44);
  });

  ctx.fillStyle = '#334155';
  ctx.fillRect(70, 930, 940, 2);
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '24px Arial';
  ctx.fillText('AI-Powered Football Coach Simulator', 70, 980);

  const link = document.createElement('a');
  link.download = `dream-coach-${report.score.home}-${report.score.away}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
