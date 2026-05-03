import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <AppShell title="СКОРО" activeTab="more" showBackButton>
      <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border border-[var(--color-primary)]/20"
          style={{
            background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.03))',
            boxShadow: '0 0 30px rgba(34,197,94,0.1)',
          }}
        >
          <span className="material-symbols-outlined text-[42px] text-[var(--color-primary)]">
            construction
          </span>
        </div>

        <h1 className="font-['Lexend'] text-2xl font-bold text-white mb-2">
          Скоро
        </h1>
        <p className="text-[var(--color-on-surface-variant)] text-sm leading-relaxed mb-8" style={{ maxWidth: '300px' }}>
          Эта функция в разработке. Пока сосредоточься на ключевом игровом опыте.
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          className="px-8 py-3 rounded-xl font-['Lexend'] font-bold uppercase tracking-wider text-[var(--color-on-primary)] transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
            boxShadow: '0 0 20px rgba(34,197,94,0.3)',
          }}
        >
          На главную
        </button>
      </div>
    </AppShell>
  );
}

