import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export type BottomTab = 'home' | 'squad' | 'match' | 'report' | 'more';

type TabItem = {
  key: BottomTab;
  label: string;
  icon: string;
  path?: string;
};

const TABS: TabItem[] = [
  { key: 'home', label: 'Главная', icon: 'home', path: '/dashboard' },
  { key: 'squad', label: 'Состав', icon: 'groups', path: '/squad-builder' },
  { key: 'match', label: 'Матч', icon: 'sports_soccer', path: '/match-setup' },
  { key: 'report', label: 'Отчет', icon: 'summarize', path: '/match-report' },
  { key: 'more', label: 'Еще', icon: 'menu' },
];

const MORE_MENU_ITEMS = [
  { icon: 'person', label: 'Профиль', path: '/profile' },
  { icon: 'history', label: 'История матчей', path: '/match-history' },
  { icon: 'save', label: 'Сохраненные составы', path: '/saved-squads' },
  { icon: 'emoji_events', label: 'Таблица лидеров', path: '/leaderboard' },
  { icon: 'settings', label: 'Настройки', path: '/settings' },
];

export default function MobileBottomNav({ active }: { active?: BottomTab }) {
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleTabClick = (tab: TabItem) => {
    if (tab.key === 'more') {
      setShowMoreMenu(true);
    } else if (tab.path) {
      navigate(tab.path);
      setShowMoreMenu(false);
    }
  };

  const handleMoreItemClick = (path: string) => {
    setShowMoreMenu(false);
    navigate(path);
  };

  return (
    <>
      <div aria-hidden className="h-[88px] md:hidden" />

      {/* Нижнее меню "Еще" */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:hidden animate-fade-in">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="relative w-full bg-[var(--color-surface)] border-t border-white/10 rounded-t-3xl pt-2 pb-safe animate-slide-up">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
            <div className="px-4 pb-8 space-y-2">
              {MORE_MENU_ITEMS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleMoreItemClick(item.path)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-variant)]"
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="font-semibold">{item.label}</span>
                  <span className="material-symbols-outlined ml-auto text-[var(--color-on-surface-variant)]">chevron_right</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Нижняя навигация */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden pointer-events-none">
        <nav
          className="mx-auto border-t border-white/10 bg-[var(--color-surface-dim)]/95 backdrop-blur-2xl pointer-events-auto shadow-[0_-8px_30px_rgba(0,0,0,0.5)]"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)', maxWidth: '960px' }}
        >
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {TABS.map((tab) => {
              const isActive = tab.key === active;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabClick(tab)}
                  className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--color-primary-container)]/20 text-[var(--color-primary)]'
                      : 'bg-transparent text-[var(--color-on-surface-variant)] active:bg-white/5'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[24px] leading-none mb-1 transition-transform ${isActive ? 'scale-110' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    {tab.icon}
                  </span>
                  <span className={`text-[10px] font-semibold tracking-[0.05em] transition-opacity ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
