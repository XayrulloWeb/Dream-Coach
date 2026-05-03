import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '../components/MobileBottomNav';
import { loadSavedSquads } from '../lib/savedSquads';
import { loadMatchHistory } from '../lib/matchHistory';

export default function ProfilePage() {
  const navigate = useNavigate();
  const matches = useMemo(() => loadMatchHistory(), []);
  const squads = useMemo(() => loadSavedSquads(), []);

  const wins = matches.filter((item) => item.result === 'Win').length;
  const winRate = matches.length ? Math.round((wins / matches.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#050A15] text-white pb-24">
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-4">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="text-slate-300">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-['Lexend'] text-xl text-emerald-300 tracking-wide">ПРОФИЛЬ</h1>
          <div className="w-8" />
        </header>

        <section className="rounded-2xl border border-white/10 bg-[#08162B]/90 p-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full border border-emerald-400/70 overflow-hidden">
              <img
                alt="Тренер"
                className="h-full w-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuADD6abTEPgXscS6PNdp5KldcuYittHdY8udopx6Tbqw5-z-5OSrNkVQ-uhS4cNzoewoKJig5_Tx-ets-UDwO9zk26aVF9mmm3CgVAvfI3wme_OvlnPmZt0xrXFluxORdvA0xzZpdVkzaxECw_ZgdKDAdsDNTqToo_f99DUNAW2Qkw2PSlePCgJHSBOmA_X_tO2ltz_7wfVLv-TJm-Q3HoOlFeeCTDKj6t-6HdfdRNHo2VT9yR50TMPX3YnkrjxxvYzrbmop4GIi4s"
              />
            </div>
            <div>
              <p className="text-sm text-slate-400">Профиль тренера</p>
              <p className="text-xl font-semibold">Dream Coach</p>
              <p className="text-xs text-emerald-300 mt-1">Элитный дивизион</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Матчи" value={`${matches.length}`} />
            <Stat label="Процент побед" value={`${winRate}%`} />
            <Stat label="Составы" value={`${squads.length}`} />
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <MenuButton title="Сохраненные составы" subtitle="Управление заготовками" onClick={() => navigate('/saved-squads')} icon="shield" />
          <MenuButton title="Испытания" subtitle="Соревнования с сообществом" onClick={() => navigate('/community-challenges')} icon="emoji_events" />
          <MenuButton title="Настройки" subtitle="Приложение и аккаунт" onClick={() => navigate('/settings')} icon="settings" />
          <MenuButton title="Разбор матча" subtitle="Детальный тактический анализ" onClick={() => navigate('/match-analysis')} icon="analytics" />
          <MenuButton title="Уведомления" subtitle="Обновления и оповещения" onClick={() => navigate('/notifications')} icon="notifications" />
          <MenuButton title="Режим сезона" subtitle="Прогресс в лиге" onClick={() => navigate('/tournament')} icon="trophy" />
          <MenuButton title="Dream Coach Pro" subtitle="Расширенные функции" onClick={() => navigate('/pro-subscription')} icon="workspace_premium" />
        </section>
      </main>

      <MobileBottomNav active="home" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0B1D38] p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-emerald-300 mt-1">{value}</p>
    </div>
  );
}

function MenuButton({
  title,
  subtitle,
  onClick,
  icon,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
  icon: string;
}) {
  return (
    <button onClick={onClick} className="rounded-xl border border-white/10 bg-[#08162B]/85 p-4 text-left">
      <span className="material-symbols-outlined text-emerald-300">{icon}</span>
      <p className="mt-2 font-semibold">{title}</p>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </button>
  );
}
