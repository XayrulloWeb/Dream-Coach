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
import { isGuestUser } from '../lib/auth';

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
  const isGuest = useMemo(() => isGuestUser(), []);

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

  const handleShare = async () => {
    const text = `🔥 Я разгромил ${report.opponentName} со счетом ${report.score.home}-${report.score.away} в Dream Coach!\n\n🧠 Моя тактика: ${report.homeFormation}\n⭐ MVP: ${report.coachCard?.mvp?.name ?? 'Моя команда'}\n\nСобери свой состав и стань тренером: https://dream-coach.vercel.app`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Мой матч в Dream Coach',
          text: text,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setShareMessage('Текст скопирован в буфер обмена!');
        setTimeout(() => setShareMessage(''), 3000);
      } catch (err) {
        setShareMessage('Не удалось поделиться.');
      }
    }
  };

  return (
    <AppShell title="ОТЧЕТ О МАТЧЕ" activeTab="report" showBackButton>
      <div className="px-5 space-y-5 animate-slide-up pb-8">
        
        {isGuest && (
          <section className="mt-4 rounded-2xl border border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/20 rounded-full blur-[40px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-3xl text-[var(--color-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <h2 className="font-['Lexend'] text-lg font-bold text-white">Отличный матч, тренер!</h2>
              </div>
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-4">
                Понравилось управлять командой? Сохрани свой состав, тактику и результаты навсегда — создай бесплатный аккаунт прямо сейчас.
              </p>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  navigate('/signup');
                }}
                className="w-full rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-fixed)] text-[var(--color-on-primary)] py-3 font-bold uppercase tracking-wider transition-colors neon-glow"
              >
                Создать аккаунт
              </button>
            </div>
          </section>
        )}

        <FinalScoreHero report={report} />
        <MVPCard report={report} />
        <GoalTimeline report={report} />
        <TeamStatsGrid report={report} />
        <PlayerRatingsList report={report} />
        <CoachAnalysisPanel report={report} />
        <CoachCard report={report} onSave={handleSaveCard} onShare={handleShare} />

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

