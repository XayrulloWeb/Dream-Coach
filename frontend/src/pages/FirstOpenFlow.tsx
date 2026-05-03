import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasCompletedOnboarding, markOnboardingCompleted } from '../lib/onboarding';
import background from '../assets/Images/backgroundFlow.png';

/* ────────────────────────────────────────────────────
   Data
   ──────────────────────────────────────────────────── */

type Club = { id: string; name: string; crest: string };

const CLUBS: Club[] = [
  { id: 'real-madrid', name: 'Real Madrid', crest: '🤍' },
  { id: 'barcelona', name: 'FC Barcelona', crest: '🔵🔴' },
  { id: 'man-city', name: 'Manchester City', crest: '🩵' },
  { id: 'liverpool', name: 'Liverpool FC', crest: '🔴' },
  { id: 'arsenal', name: 'Arsenal FC', crest: '🔴⚪' },
  { id: 'bayern', name: 'Bayern Munich', crest: '❤️' },
  { id: 'psg', name: 'Paris SG', crest: '🔵' },
  { id: 'juventus', name: 'Juventus FC', crest: '⚪⚫' },
  { id: 'inter', name: 'Inter Milan', crest: '🖤💙' },
  { id: 'dortmund', name: 'Dortmund', crest: '💛' },
  { id: 'chelsea', name: 'Chelsea FC', crest: '💙' },
  { id: 'man-united', name: 'Man United', crest: '🔴👹' },
];

const TOTAL_STEPS = 4; // 0=Splash, 1=Features, 2=Club, 3=Ready

/* ────────────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────────────── */

export default function FirstOpenFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedClub, setSelectedClub] = useState<Club>(CLUBS[0]);
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  useEffect(() => {
    if (hasCompletedOnboarding()) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const filteredClubs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? CLUBS.filter((c) => c.name.toLowerCase().includes(q)) : CLUBS;
  }, [search]);

  const goNext = useCallback(() => {
    setDirection('forward');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection('back');
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const completeFlow = () => {
    localStorage.setItem('dc_favorite_club', selectedClub.id);
    markOnboardingCompleted();
    navigate('/login', { replace: true });
  };

  const skipFlow = () => {
    markOnboardingCompleted();
    navigate('/login', { replace: true });
  };

  /* ──── Progress Bar ──── */
  const progressBar = (
    <div className="flex gap-1.5 w-full max-w-[120px]">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className="h-[3px] rounded-full flex-1 transition-all duration-500"
          style={{
            background: i <= step
              ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
              : 'rgba(255,255,255,0.1)',
            boxShadow: i <= step ? '0 0 6px rgba(34,197,94,0.4)' : 'none',
          }}
        />
      ))}
    </div>
  );

  /* ──── Slide wrapper ──── */
  const slideClass = direction === 'forward'
    ? 'animate-[slideInRight_0.4s_ease-out]'
    : 'animate-[slideInLeft_0.4s_ease-out]';

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-on-background)] font-['Inter'] overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[var(--color-primary)] opacity-[0.06] blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[var(--color-blue-accent)] opacity-[0.04] blur-[100px]" />
      </div>

      {/* ═══════════════════════════════════════════
          STEP 0 — SPLASH / HERO
          ═══════════════════════════════════════════ */}
      {step === 0 && (
        <main className="relative min-h-screen flex flex-col animate-[fadeIn_0.6s_ease-out]">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${background})` }}
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-background)] via-[var(--color-background)]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-background)]/40 to-transparent" />

          {/* Content */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-end pb-12 px-6">
            {/* Logo */}
            <div className="mb-8 flex flex-col items-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 border border-[var(--color-primary)]/30"
                style={{
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(8,22,43,0.9))',
                  boxShadow: '0 0 40px rgba(34,197,94,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                <span
                  className="material-symbols-outlined text-[42px] text-[var(--color-primary)]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  sports
                </span>
              </div>

              <h1 className="font-['Lexend'] text-4xl font-black tracking-tight uppercase text-white">
                DREAM COACH
              </h1>
              <p className="text-[var(--color-on-surface-variant)] mt-2 text-base max-w-[280px] text-center leading-relaxed">
                Собирай состав. Настраивай тактику. Побеждай.<br />
                <span className="text-[var(--color-primary)] font-semibold">Твои решения меняют игру.</span>
              </p>
            </div>

            {/* Progress */}
            <div className="mb-6">{progressBar}</div>

            {/* Buttons */}
            <div className="w-full flex flex-col gap-3" style={{ maxWidth: '384px' }}>
              <button
                onClick={goNext}
                className="w-full py-4 rounded-2xl font-['Lexend'] font-bold uppercase tracking-wider text-[var(--color-on-primary)] transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                  boxShadow: '0 0 24px rgba(34,197,94,0.35), 0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                Начать
              </button>
              <button
                onClick={skipFlow}
                className="w-full py-3 text-[var(--color-on-surface-variant)] text-xs uppercase tracking-[0.2em] hover:text-white transition-colors"
              >
                Пропустить пока
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ═══════════════════════════════════════════
          STEP 1 — FEATURE HIGHLIGHTS (3 cards)
          ═══════════════════════════════════════════ */}
      {step === 1 && (
        <main className={`relative min-h-screen flex flex-col px-6 py-8 ${slideClass}`}>
          {/* Header */}
          <header className="relative z-10 flex items-center justify-between mb-2">
            <button onClick={goBack} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-[var(--color-on-surface-variant)]">arrow_back</span>
            </button>
            {progressBar}
            <button onClick={skipFlow} className="text-[11px] text-[var(--color-on-surface-variant)] uppercase tracking-wider hover:text-white transition-colors">
              Пропустить
            </button>
          </header>

          {/* Title */}
          <section className="relative z-10 text-center mt-6 mb-8">
            <p className="text-[var(--color-primary)] text-xs font-bold uppercase tracking-[0.2em] mb-3">Как это работает</p>
            <h2 className="font-['Lexend'] text-3xl font-bold leading-tight text-white">
              Три шага к<br /><span className="text-[var(--color-primary)]">победе</span>
            </h2>
          </section>

          {/* Feature Cards */}
          <section className="relative z-10 flex-1 flex flex-col gap-4 mx-auto w-full" style={{ maxWidth: '480px' }}>
            <FeatureCard
              step="01"
              icon="groups"
              title="Собери состав"
              description="Выбирай из 800+ реальных игроков. Определи схему и стиль игры."
              gradient="from-[#22C55E]/20 to-transparent"
              borderColor="border-[#22C55E]/20"
              delay={0}
            />
            <FeatureCard
              step="02"
              icon="psychology"
              title="Тактические решения"
              description="Получай предупреждения по ходу матча и делай замены в нужный момент."
              gradient="from-[#3B82F6]/20 to-transparent"
              borderColor="border-[#3B82F6]/20"
              delay={100}
            />
            <FeatureCard
              step="03"
              icon="analytics"
              title="Учись и улучшайся"
              description="Отчеты на базе ИИ объясняют, почему ты выиграл или проиграл. Каждое решение важно."
              gradient="from-[#F59E0B]/20 to-transparent"
              borderColor="border-[#F59E0B]/20"
              delay={200}
            />
          </section>

          {/* Next */}
          <div className="relative z-10 mt-8 w-full mx-auto" style={{ maxWidth: '480px' }}>
            <button
              onClick={goNext}
              className="w-full py-4 rounded-2xl font-['Lexend'] font-bold uppercase tracking-wider text-[var(--color-on-primary)] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                boxShadow: '0 0 24px rgba(34,197,94,0.3)',
              }}
            >
              Продолжить
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </button>
          </div>
        </main>
      )}

      {/* ═══════════════════════════════════════════
          STEP 2 — PICK FAVORITE CLUB
          ═══════════════════════════════════════════ */}
      {step === 2 && (
        <main className={`relative min-h-screen flex flex-col px-6 py-8 ${slideClass}`}>
          {/* Header */}
          <header className="relative z-10 flex items-center justify-between mb-2">
            <button onClick={goBack} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-[var(--color-on-surface-variant)]">arrow_back</span>
            </button>
            {progressBar}
            <button onClick={skipFlow} className="text-[11px] text-[var(--color-on-surface-variant)] uppercase tracking-wider hover:text-white transition-colors">
              Пропустить
            </button>
          </header>

          {/* Title */}
          <section className="relative z-10 text-center mt-4 mb-6">
            <p className="text-[var(--color-primary)] text-xs font-bold uppercase tracking-[0.2em] mb-3">Персонализация</p>
            <h2 className="font-['Lexend'] text-3xl font-bold leading-tight text-white">
              Выбери<br /><span className="text-[var(--color-primary)]">любимый клуб</span>
            </h2>
            <p className="text-[var(--color-on-surface-variant)] text-sm mt-2">Это поможет лучше настроить твой опыт</p>
          </section>

          {/* Search */}
          <div className="relative z-10 mx-auto w-full mb-4" style={{ maxWidth: '480px' }}>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] text-xl">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск клубов..."
                className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-on-surface-variant)]/50"
              />
            </div>
          </div>

          {/* Club Grid */}
          <div className="relative z-10 flex-1 mx-auto w-full overflow-y-auto pr-1 custom-scrollbar" style={{ maxWidth: '480px' }}>
            <div className="grid grid-cols-2 gap-3">
              {filteredClubs.map((club) => {
                const active = selectedClub.id === club.id;
                return (
                  <button
                    key={club.id}
                    onClick={() => setSelectedClub(club)}
                    className={`relative rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.97] ${
                      active
                        ? 'border-[var(--color-primary)]/60 bg-[var(--color-primary)]/10'
                        : 'border-white/5 bg-[var(--color-surface-container-high)] hover:border-white/15 hover:bg-[var(--color-surface-container-highest)]'
                    }`}
                  >
                    {/* Active indicator */}
                    {active && (
                      <div className="absolute top-3 right-3">
                        <span className="material-symbols-outlined text-[var(--color-primary)] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      </div>
                    )}
                    <div className="text-2xl mb-2">{club.crest}</div>
                    <p className={`text-sm font-semibold truncate ${active ? 'text-[var(--color-primary)]' : 'text-white'}`}>
                      {club.name}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next */}
          <div className="relative z-10 mt-6 w-full mx-auto" style={{ maxWidth: '480px' }}>
            <button
              onClick={goNext}
              className="w-full py-4 rounded-2xl font-['Lexend'] font-bold uppercase tracking-wider text-[var(--color-on-primary)] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                boxShadow: '0 0 24px rgba(34,197,94,0.3)',
              }}
            >
              Продолжить
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </button>
          </div>
        </main>
      )}

      {/* ═══════════════════════════════════════════
          STEP 3 — READY / FINAL
          ═══════════════════════════════════════════ */}
      {step === 3 && (
        <main className={`relative min-h-screen flex flex-col items-center justify-center px-6 ${slideClass}`}>
          {/* Background glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full opacity-20 blur-[80px]"
            style={{ background: 'radial-gradient(circle, #22C55E, transparent)' }}
          />

          {/* Icon */}
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 border border-[var(--color-primary)]/30 animate-[scaleIn_0.5s_ease-out]"
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))',
              boxShadow: '0 0 60px rgba(34,197,94,0.25)',
            }}
          >
            <span
              className="material-symbols-outlined text-6xl text-[var(--color-primary)]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
          </div>

          {/* Text */}
          <h2 className="font-['Lexend'] text-4xl font-black text-white text-center mb-3 animate-[fadeInUp_0.5s_ease-out_0.15s_both]">
            ВСЕ ГОТОВО<span className="text-[var(--color-primary)]">!</span>
          </h2>
          <p className="text-[var(--color-on-surface-variant)] text-center max-w-[300px] leading-relaxed mb-2 animate-[fadeInUp_0.5s_ease-out_0.25s_both]">
            Твой путь в Dream Coach начинается сейчас.
          </p>
          <p className="text-[var(--color-primary)] text-sm font-semibold text-center mb-10 animate-[fadeInUp_0.5s_ease-out_0.3s_both]">
            Собирай. Управляй. Побеждай.
          </p>

          {/* CTA */}
          <div className="w-full animate-[fadeInUp_0.5s_ease-out_0.4s_both]" style={{ maxWidth: '384px' }}>
            <button
              onClick={completeFlow}
              className="w-full py-4 rounded-2xl font-['Lexend'] font-bold uppercase tracking-wider text-[var(--color-on-primary)] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                boxShadow: '0 0 30px rgba(34,197,94,0.4), 0 8px 24px rgba(0,0,0,0.3)',
              }}
            >
              Поехали
              <span className="material-symbols-outlined text-xl">rocket_launch</span>
            </button>
          </div>
        </main>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────────────── */

function FeatureCard({
  step,
  icon,
  title,
  description,
  gradient,
  borderColor,
  delay,
}: {
  step: string;
  icon: string;
  title: string;
  description: string;
  gradient: string;
  borderColor: string;
  delay: number;
}) {
  return (
    <div
      className={`rounded-2xl border ${borderColor} p-5 bg-gradient-to-r ${gradient} backdrop-blur-sm relative overflow-hidden transition-all hover:scale-[1.01]`}
      style={{ animationDelay: `${delay}ms`, animation: 'fadeInUp 0.5s ease-out both' }}
    >
      {/* Step number accent */}
      <div className="absolute top-4 right-4 text-[40px] font-['Lexend'] font-black text-white/[0.03] leading-none">
        {step}
      </div>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-['Lexend'] text-base font-bold text-white mb-1">{title}</h3>
          <p className="text-[var(--color-on-surface-variant)] text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
