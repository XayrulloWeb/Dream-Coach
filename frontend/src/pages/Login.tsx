import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, toApiError } from '../lib/api';

export default function Login() {
  const [formData, setFormData] = useState({ emailOrUsername: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/api/auth/login', formData);
      localStorage.setItem('token', response.data.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const apiError = toApiError(err);
      setError(apiError.message || 'Invalid credentials');
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    try {
      const response = await api.post('/api/auth/guest');
      localStorage.setItem('token', response.data.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const apiError = toApiError(err);
      setError(apiError.message || 'Unable to continue as guest');
    }
  };

  return (
    <div className="min-h-screen text-[#e0e3e5] font-['Inter'] bg-[#101415] relative overflow-hidden flex items-center justify-center p-5">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#4be27714] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#bcc7de14] blur-[100px] pointer-events-none" />

      <main className="w-full max-w-[28rem] z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#272a2c] border border-[#3d4a3d] mb-4 shadow-[0_0_20px_rgba(75,226,119,0.2)]">
            <span className="material-symbols-outlined text-[#4be277] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>sports_soccer</span>
          </div>
          <h1 className="font-['Lexend'] text-3xl font-black tracking-tight uppercase mb-2">STADIUM PRO</h1>
          <h2 className="font-['Lexend'] text-2xl text-[#bccbb9]">Welcome Back, Coach!</h2>
        </div>

        <div className="bg-[#10141599] backdrop-blur-xl rounded-xl border border-[#3d4a3d]/60 p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 rounded-xl border border-white/5 pointer-events-none" />

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs tracking-[0.12em] text-[#bccbb9] mb-2 uppercase" htmlFor="identifier">
                Email or Username
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#bccbb9aa]">person</span>
                <input
                  id="identifier"
                  type="text"
                  placeholder="Enter your email or username"
                  value={formData.emailOrUsername}
                  onChange={(e) => setFormData({ ...formData, emailOrUsername: e.target.value })}
                  className="w-full bg-[#323537] border border-[#3d4a3d] rounded-lg py-3 pl-10 pr-4 text-[#e0e3e5] placeholder:text-[#bccbb988] focus:border-[#4be277] focus:ring-1 focus:ring-[#4be277] outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs tracking-[0.12em] text-[#bccbb9] uppercase" htmlFor="password">
                  Password
                </label>
                <button type="button" className="text-xs text-[#4be277] hover:text-[#6bff8f]">Forgot Password?</button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#bccbb9aa]">lock</span>
                <input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[#323537] border border-[#3d4a3d] rounded-lg py-3 pl-10 pr-12 text-[#e0e3e5] placeholder:text-[#bccbb988] focus:border-[#4be277] focus:ring-1 focus:ring-[#4be277] outline-none"
                  required
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#bccbb9aa]">visibility_off</span>
              </div>
            </div>

            {error && <p className="text-sm text-[#ffb4ab]">{error}</p>}

            <button
              type="submit"
              className="w-full bg-[#4be277] hover:bg-[#6bff8f] text-[#003915] font-['Lexend'] text-lg py-4 rounded-lg mt-1 transition-all shadow-[0_0_15px_rgba(75,226,119,0.3)]"
            >
              Login
            </button>
          </form>

          <div className="relative flex items-center py-6">
            <div className="flex-grow border-t border-[#3d4a3d]/60" />
            <span className="px-4 text-xs text-[#bccbb9] uppercase tracking-[0.14em]">or continue with</span>
            <div className="flex-grow border-t border-[#3d4a3d]/60" />
          </div>

          <div className="flex gap-4">
            <button type="button" className="flex-1 bg-[#323537] hover:bg-[#363a3b] border border-[#3d4a3d] rounded-lg py-3 flex items-center justify-center transition-colors">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            </button>
            <button type="button" className="flex-1 bg-[#323537] hover:bg-[#363a3b] border border-[#3d4a3d] rounded-lg py-3 flex items-center justify-center transition-colors">
              <img src="https://www.svgrepo.com/show/512008/apple-173.svg" alt="Apple" className="w-5 h-5 invert" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleGuestLogin}
            className="w-full mt-4 bg-[#1d2022] hover:bg-[#272a2c] border border-[#3d4a3d] text-[#e0e3e5] font-['Lexend'] text-base py-3 rounded-lg transition-colors"
          >
            Continue as Guest
          </button>
        </div>

        <p className="text-center text-[#bccbb9] mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#4be277] font-semibold hover:underline">Sign Up</Link>
        </p>
      </main>
    </div>
  );
}
