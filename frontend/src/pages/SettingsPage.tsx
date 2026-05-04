import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';

const НАСТРОЙКИ_KEY = 'dc_app_settings';

type AppSettings = {
  notifications: boolean;
  autoSaveSquads: boolean;
  reducedMotion: boolean;
  dataSaver: boolean;
};

const DEFAULT_НАСТРОЙКИ: AppSettings = {
  notifications: true,
  autoSaveSquads: true,
  reducedMotion: false,
  dataSaver: false,
};

function readSettings(): AppSettings {
  const raw = localStorage.getItem(НАСТРОЙКИ_KEY);
  if (!raw) {
    return DEFAULT_НАСТРОЙКИ;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      notifications: parsed.notifications ?? DEFAULT_НАСТРОЙКИ.notifications,
      autoSaveSquads: parsed.autoSaveSquads ?? DEFAULT_НАСТРОЙКИ.autoSaveSquads,
      reducedMotion: parsed.reducedMotion ?? DEFAULT_НАСТРОЙКИ.reducedMotion,
      dataSaver: parsed.dataSaver ?? DEFAULT_НАСТРОЙКИ.dataSaver,
    };
  } catch {
    return DEFAULT_НАСТРОЙКИ;
  }
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(() => readSettings());

  useEffect(() => {
    localStorage.setItem(НАСТРОЙКИ_KEY, JSON.stringify(settings));
  }, [settings]);

  return (
    <AppShell
      title="НАСТРОЙКИ"
      showBackButton
      backTo="/profile"
      activeTab="home"
      headerRightElement={<div className="w-8" />}
      contentClassName="px-4 space-y-4 pt-4"
    >
      <section className="rounded-2xl border border-white/10 bg-[#08162B]/90 p-4 space-y-2">
        <SwitchRow
          label="Уведомления"
          hint="Оповещения о матчах и челленджах"
          checked={settings.notifications}
          onChange={(value) => setSettings((prev) => ({ ...prev, notifications: value }))}
        />
        <SwitchRow
          label="Автосохранение составов"
          hint="Автоматически сохранять последние версии состава"
          checked={settings.autoSaveSquads}
          onChange={(value) => setSettings((prev) => ({ ...prev, autoSaveSquads: value }))}
        />
        <SwitchRow
          label="Уменьшенная анимация"
          hint="Снизить интенсивность анимаций"
          checked={settings.reducedMotion}
          onChange={(value) => setSettings((prev) => ({ ...prev, reducedMotion: value }))}
        />
        <SwitchRow
          label="Экономия трафика"
          hint="Использовать облегченные ресурсы"
          checked={settings.dataSaver}
          onChange={(value) => setSettings((prev) => ({ ...prev, dataSaver: value }))}
        />
      </section>

      <section className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
        <p className="text-sm text-rose-200">Аккаунт</p>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            navigate('/login');
          }}
          className="mt-3 rounded-lg border border-rose-400/70 px-3 py-2 text-sm text-rose-200"
        >
          Выйти
        </button>
      </section>
    </AppShell>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0B1D38] px-3 py-3">
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-slate-400 mt-1">{hint}</p>
      </div>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" />
    </label>
  );
}

