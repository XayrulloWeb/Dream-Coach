import AppShell from '../components/AppShell';

const FREE_FEATURES = [
  '5 симуляций матчей в день',
  'До 3 сохраненных составов',
  'Базовый отчет матча',
];

const PRO_FEATURES = [
  'Неограниченные симуляции',
  'Продвинутый ИИ-тактический анализ',
  'Неограниченные сохраненные составы',
  'Режим сезона и бонусы испытаний',
  'Премиальные карточки для шаринга',
];

export default function ProSubscriptionPage() {
  return (
    <AppShell
      title="ПОДПИСКА PRO"
      showBackButton
      backTo="/profile"
      activeTab="home"
      headerRightElement={<div className="w-8" />}
      contentClassName="px-4 space-y-4 pt-4"
    >
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_0%,rgba(163,230,53,0.17),transparent_40%),radial-gradient(circle_at_88%_12%,rgba(34,197,94,0.14),transparent_34%)]" />

      <section className="rounded-2xl border border-white/10 bg-[#08162B]/90 p-4 relative z-10">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Текущий тариф</p>
        <h2 className="mt-2 text-2xl font-semibold">Бесплатный</h2>
        <ul className="mt-3 space-y-1 text-sm text-slate-300">
          {FREE_FEATURES.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#A3E63566] bg-[#0A2116]/85 p-4 relative z-10">
        <p className="text-xs uppercase tracking-[0.12em] text-[#A3E635]">Dream Coach Pro</p>
        <h3 className="mt-2 text-2xl font-semibold text-emerald-300">$7.99 / месяц</h3>
        <ul className="mt-3 space-y-1 text-sm text-slate-200">
          {PRO_FEATURES.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
        <button
          onClick={() => window.alert('Интеграция оплаты появится в следующем релизе.')}
          className="mt-4 w-full rounded-xl bg-[#22C55E] py-3 font-['Lexend'] font-semibold text-[#06210F]"
        >
          ПЕРЕЙТИ НА PRO
        </button>
      </section>
    </AppShell>
  );
}

