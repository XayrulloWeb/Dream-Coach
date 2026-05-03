import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import type { MatchFinalReport } from '../types/simulation';
import * as htmlToImage from 'html-to-image';

import FinalScoreHero from '../components/report/FinalScoreHero';
import GoalTimeline from '../components/report/GoalTimeline';
import MVPCard from '../components/report/MVPCard';
import PlayerRatingsList from '../components/report/PlayerRatingsList';
import TeamStatsGrid from '../components/report/TeamStatsGrid';
import CoachAnalysisPanel from '../components/report/CoachAnalysisPanel';
import CoachCard from '../components/report/CoachCard';

const LAST_MATCH_REPORT_KEY = 'dc_last_match_report';

function loadReport(): MatchFinalReport | null {
  const raw = localStorage.getItem(LAST_MATCH_REPORT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MatchFinalReport;
    if (!parsed?.score || !parsed?.stats) return null;
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
      <AppShell title="Отчет о матче" activeTab="report">
        <div className="flex flex-col items-center justify-center h-[60vh] px-5 text-center">
          <span className="material-symbols-outlined text-6xl text-[var(--color-outline-variant)] mb-4">analytics</span>
          <h1 className="font-['Lexend'] text-2xl font-bold mb-2">Отчет не найден</h1>
          <p className="text-[var(--color-on-surface-variant)] mb-6 text-sm">Сыграй матч, чтобы сформировать подробный тактический разбор.</p>
          <button
            onClick={() => navigate('/match-setup')}
            className="rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-6 py-3 text-[var(--color-primary)] font-bold transition-colors hover:bg-[var(--color-primary)]/20"
          >
            Начать матч
          </button>
        </div>
      </AppShell>
    );
  }

  const handleSaveCard = async () => {
    const node = document.getElementById('coach-card-element');
    if (!node) return;
    
    try {
      const dataUrl = await htmlToImage.toPng(node, { quality: 1, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `dream-coach-${report.score.home}-${report.score.away}.png`;
      link.href = dataUrl;
      link.click();
      setShareMessage('Карточка сохранена!');
      setTimeout(() => setShareMessage(''), 3000);
    } catch (err) {
      console.error('Failed to save card', err);
      setShareMessage('Не удалось сохранить карточку.');
    }
  };

  return (
    <AppShell title="ОТЧЕТ О МАТЧЕ" activeTab="report" showBackButton>
      <div className="px-5 space-y-5 animate-slide-up pb-8">
        
        <FinalScoreHero report={report} />
        <MVPCard report={report} />
        <GoalTimeline report={report} />
        <TeamStatsGrid report={report} />
        <PlayerRatingsList report={report} />
        <CoachAnalysisPanel report={report} />
        <CoachCard report={report} onSave={handleSaveCard} />

        {/* CTA Actions */}
        <section className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => navigate('/match-setup')}
            className="flex flex-col items-center justify-center gap-1 glass-panel hover:bg-[var(--color-surface-container-high)] p-3 rounded-xl border border-[var(--color-primary)]/30 text-[var(--color-primary)] transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">replay</span>
            <span className="text-[10px] uppercase tracking-wider font-bold">Реванш</span>
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            className="flex flex-col items-center justify-center gap-1 glass-panel hover:bg-[var(--color-surface-container-high)] p-3 rounded-xl border border-white/20 text-white transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">home</span>
            <span className="text-[10px] uppercase tracking-wider font-bold">Главная</span>
          </button>
        </section>
        
        {shareMessage && <p className="text-center text-xs text-[var(--color-primary)] font-bold animate-fade-in">{shareMessage}</p>}
      </div>
    </AppShell>
  );
}

