import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from './MobileBottomNav';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  backTo?: string;
  hideHeader?: boolean;
  hideBottomNav?: boolean;
  activeTab?: 'home' | 'squad' | 'match' | 'report' | 'more';
}

export default function AppShell({
  children,
  title = 'DREAM COACH',
  showBackButton = false,
  backTo = '/dashboard',
  hideHeader = false,
  hideBottomNav = false,
  activeTab,
}: AppShellProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-on-background)] font-['Inter'] relative flex flex-col">
      {/* Universal Background Gradient */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_0%,rgba(34,197,94,0.08),transparent_40%),radial-gradient(circle_at_90%_10%,rgba(59,130,246,0.06),transparent_34%)]" />

      {/* Unified Header */}
      {!hideHeader && (
        <header className="fixed top-0 w-full z-40 bg-[var(--color-background)]/80 backdrop-blur-xl border-b border-white/5 pt-safe">
          <div className="flex justify-between items-center px-4 h-14">
            {showBackButton ? (
              <button 
                onClick={handleBack} 
                className="w-10 h-10 flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-white transition-colors"
                aria-label="Назад"
              >
                <span className="material-symbols-outlined text-2xl">arrow_back</span>
              </button>
            ) : (
              <div className="w-10 h-10" />
            )}

            <h1 className="font-['Lexend'] uppercase tracking-widest font-bold text-[var(--color-primary)] italic text-lg truncate px-2">
              {title}
            </h1>

            <button 
              onClick={() => navigate('/profile')} 
              className="w-8 h-8 rounded-full bg-[var(--color-surface-container-high)] overflow-hidden border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)] transition-colors"
              aria-label="Профиль"
            >
              <img
                alt="Аватар пользователя"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQITB1X7YNiLHQ9Kl0mG9s7M7ShhtxGSisADKkRh9CHKW423xHtpIp0l3BsdkEqdAh_VhOzCWCXMMb6srvtkabDowKy5WmpL7EEnffHyuyCaehy-u9nyLyGUOCffneEOZ4oC8EXXUZRLcUOoCRW2PPo0M2yjsPUmN42JMDvRAWMUcpFr1z09AvDquTns0TBvVMCHImoPEu1LxWgQ3GkEcLYCeMMna4CaVnn5GYQFdqU11ZzUZFtHCfmHvy0UchBSvYRaQemVTIYho"
              />
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 relative z-10 w-full max-w-3xl mx-auto flex flex-col ${!hideHeader ? 'pt-[calc(56px+env(safe-area-inset-top))]' : ''} ${!hideBottomNav ? 'pb-24' : ''}`}>
        {children}
      </main>

      {/* Unified Bottom Nav */}
      {!hideBottomNav && (
        <MobileBottomNav active={activeTab} />
      )}
    </div>
  );
}
