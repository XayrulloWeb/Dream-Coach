import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '../components/MobileBottomNav';

const SETTINGS_KEY = 'dc_app_settings';

type AppSettings = {
  notifications: boolean;
  autoSaveSquads: boolean;
  reducedMotion: boolean;
  dataSaver: boolean;
};

const DEFAULT_SETTINGS: AppSettings = {
  notifications: true,
  autoSaveSquads: true,
  reducedMotion: false,
  dataSaver: false,
};

function readSettings(): AppSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      notifications: parsed.notifications ?? DEFAULT_SETTINGS.notifications,
      autoSaveSquads: parsed.autoSaveSquads ?? DEFAULT_SETTINGS.autoSaveSquads,
      reducedMotion: parsed.reducedMotion ?? DEFAULT_SETTINGS.reducedMotion,
      dataSaver: parsed.dataSaver ?? DEFAULT_SETTINGS.dataSaver,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(() => readSettings());

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  return (
    <div className="min-h-screen bg-[#050A15] text-white pb-24">
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-4">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate('/profile')} className="text-slate-300">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-['Lexend'] text-xl text-emerald-300 tracking-wide">SETTINGS</h1>
          <div className="w-8" />
        </header>

        <section className="rounded-2xl border border-white/10 bg-[#08162B]/90 p-4 space-y-2">
          <SwitchRow
            label="Notifications"
            hint="Match alerts and challenge updates"
            checked={settings.notifications}
            onChange={(value) => setSettings((prev) => ({ ...prev, notifications: value }))}
          />
          <SwitchRow
            label="Auto Save Squads"
            hint="Automatically store latest team snapshots"
            checked={settings.autoSaveSquads}
            onChange={(value) => setSettings((prev) => ({ ...prev, autoSaveSquads: value }))}
          />
          <SwitchRow
            label="Reduced Motion"
            hint="Lower animation intensity"
            checked={settings.reducedMotion}
            onChange={(value) => setSettings((prev) => ({ ...prev, reducedMotion: value }))}
          />
          <SwitchRow
            label="Data Saver"
            hint="Prefer lightweight assets"
            checked={settings.dataSaver}
            onChange={(value) => setSettings((prev) => ({ ...prev, dataSaver: value }))}
          />
        </section>

        <section className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-200">Account</p>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              navigate('/login');
            }}
            className="mt-3 rounded-lg border border-rose-400/70 px-3 py-2 text-sm text-rose-200"
          >
            Logout
          </button>
        </section>
      </main>

      <MobileBottomNav active="home" />
    </div>
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
