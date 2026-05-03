import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, toApiError } from '../lib/api';

function resetLocalProgress() {
  const keys = [
    'dc_last_squad_payload',
    'dc_saved_squads',
    'dc_match_history',
    'dc_last_match_report',
    'dc_active_match_id',
    'dc_tournament_next_fixture',
  ];

  for (const key of keys) {
    localStorage.removeItem(key);
  }
}

type SignUpData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function SignUp() {
  const [formData, setFormData] = useState<SignUpData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (!agree) {
      setError('Нужно принять условия использования и политику конфиденциальности');
      return;
    }

    try {
      const response = await api.post('/api/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      resetLocalProgress();
      localStorage.setItem('token', response.data.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const apiError = toApiError(err);
      setError(apiError.message || 'Что-то пошло не так');
    }
  };

  return (
    <div className="min-h-screen bg-[#101415] text-[#e0e3e5] font-['Inter'] bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.15)_0%,rgba(16,20,21,1)_70%)]">
      <header className="flex justify-between items-center px-5 py-4 bg-[#02061799] backdrop-blur-md border-b border-white/10 shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#22c55e] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>sports_soccer</span>
          <span className="text-xl font-black italic text-[#22c55e] tracking-tight font-['Lexend']">DREAM COACH</span>
        </div>
        <Link to="/login" className="text-[#bccbb9] hover:text-[#4be277] transition-colors">Вход</Link>
      </header>

      <main className="px-5 py-8 flex justify-center">
        <div className="w-full max-w-[28rem]">
          <div className="text-center mb-8">
            <h1 className="font-['Lexend'] text-4xl font-bold mb-2">Создай аккаунт</h1>
            <p className="text-[#bccbb9]">Присоединяйся к тысячам тренеров по всему миру.</p>
          </div>

          <div className="rounded-xl p-6 shadow-2xl relative overflow-hidden border border-[#3d4a3d]/50 bg-[#10141599] backdrop-blur-xl">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <form className="space-y-4" onSubmit={handleSubmit}>
              <InputField
                id="username"
                label="ЛОГИН"
                icon="person"
                placeholder="TacticalGenius99"
                type="text"
                value={formData.username}
                onChange={(value) => setFormData({ ...formData, username: value })}
              />

              <InputField
                id="email"
                label="EMAIL"
                icon="mail"
                placeholder="coach@stadiumpro.com"
                type="email"
                value={formData.email}
                onChange={(value) => setFormData({ ...formData, email: value })}
              />

              <InputField
                id="password"
                label="ПАРОЛЬ"
                icon="lock"
                placeholder="********"
                type="password"
                value={formData.password}
                onChange={(value) => setFormData({ ...formData, password: value })}
                withEye
              />

              <InputField
                id="confirm-password"
                label="ПОДТВЕРДИ ПАРОЛЬ"
                icon="lock_reset"
                placeholder="********"
                type="password"
                value={formData.confirmPassword}
                onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
                withEye
              />

              <div className="flex items-start gap-3 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-[#3d4a3d] bg-[#191c1e] accent-[#4be277]"
                />
                <label htmlFor="terms" className="text-sm text-[#bccbb9]">
                  Я принимаю <span className="text-[#4be277]">Условия использования</span> и <span className="text-[#4be277]">Политику конфиденциальности</span>.
                </label>
              </div>

              {error && <p className="text-sm text-[#ffb4ab]">{error}</p>}

              <button type="submit" className="w-full bg-[#4be277] text-[#003915] font-['Lexend'] text-lg py-4 rounded-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(75,226,119,0.2)] hover:bg-[#6bff8f]">
                <span>Зарегистрироваться</span>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_forward</span>
              </button>
            </form>

            <div className="flex items-center gap-4 my-6">
              <div className="h-px bg-[#3d4a3d] flex-grow" />
              <span className="text-xs text-[#bccbb9] tracking-[0.12em]">ИЛИ ПРОДОЛЖИТЬ ЧЕРЕЗ</span>
              <div className="h-px bg-[#3d4a3d] flex-grow" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center gap-2 py-3 rounded-lg border border-[#3d4a3d] bg-[#1d2022] hover:bg-[#323537] transition-colors">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                <span className="text-sm">Google</span>
              </button>
              <button type="button" className="flex items-center justify-center gap-2 py-3 rounded-lg border border-[#3d4a3d] bg-[#1d2022] hover:bg-[#323537] transition-colors">
                <img src="https://www.svgrepo.com/show/512008/apple-173.svg" alt="Apple" className="w-5 h-5 invert" />
                <span className="text-sm">Apple</span>
              </button>
            </div>
          </div>

          <div className="text-center mt-4">
            <p className="text-[#bccbb9]">Уже есть аккаунт? <Link to="/login" className="text-[#4be277] font-semibold hover:underline">Войти</Link></p>
          </div>
        </div>
      </main>
    </div>
  );
}

type InputFieldProps = {
  id: string;
  label: string;
  icon: string;
  placeholder: string;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  withEye?: boolean;
};

function InputField({ id, label, icon, placeholder, type, value, onChange, withEye = false }: InputFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs tracking-[0.12em] text-[#bccbb9] mb-2">{label}</label>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#869585]">{icon}</span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#191c1e] border border-[#3d4a3d] rounded-lg py-3 pl-10 pr-11 text-[#e0e3e5] placeholder:text-[#323537] focus:border-[#4be277] focus:ring-1 focus:ring-[#4be277] outline-none"
          required
        />
        {withEye && <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#869585]">visibility_off</span>}
      </div>
    </div>
  );
}

