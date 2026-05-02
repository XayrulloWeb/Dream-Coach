import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasCompletedOnboarding, markOnboardingCompleted } from '../lib/onboarding';
import background from '../assets/Images/backgroundFlow.png';

type Experience = 'coach' | 'casual';

type Club = {
  id: string;
  name: string;
  badge: string;
};

const clubs: Club[] = [
  { id: 'real-madrid', name: 'Real Madrid', badge: 'RM' },
  { id: 'barcelona', name: 'Barcelona', badge: 'BAR' },
  { id: 'man-city', name: 'Man City', badge: 'MCI' },
  { id: 'man-united', name: 'Man United', badge: 'MUN' },
  { id: 'arsenal', name: 'Arsenal', badge: 'ARS' },
  { id: 'liverpool', name: 'Liverpool', badge: 'LIV' },
  { id: 'bayern', name: 'Bayern', badge: 'BAY' },
  { id: 'psg', name: 'PSG', badge: 'PSG' },
];

export default function FirstOpenFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<Experience>('coach');
  const [selectedClub, setSelectedClub] = useState<Club>(clubs[0]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (hasCompletedOnboarding()) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const filteredClubs = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return clubs;
    }
    return clubs.filter((club) => club.name.toLowerCase().includes(normalized));
  }, [search]);

  const completeFlow = () => {
    localStorage.setItem('dc_experience_mode', experience);
    localStorage.setItem('dc_favorite_club', selectedClub.id);
    markOnboardingCompleted();
    navigate('/login', { replace: true });
  };

  const skipFlow = () => {
    markOnboardingCompleted();
    navigate('/login', { replace: true });
  };

  const progressDots = (
    <div className="flex gap-2">
      {[0, 1, 2].map((idx) => (
        <div key={idx} className={`h-1 rounded-full ${step - 1 === idx ? 'w-8 bg-[#4be277]' : 'w-8 bg-[#323537]'}`} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#101415] text-[#e0e3e5] font-['Inter']">
      {step === 0 && (
        <main className="relative min-h-screen flex flex-col justify-end bg-cover bg-center" style={{ backgroundImage: `url(${background})` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-[#101415] via-[#101415cc] to-[#10141544]" />
          <div className="relative z-10 w-full max-w-[28rem] mx-auto px-5 pb-10 flex flex-col items-center text-center">
            <div className="mb-6 flex flex-col items-center">
              <div className="w-20 h-20 bg-[#10141599] backdrop-blur-md rounded-full flex items-center justify-center border border-[#3d4a3d] mb-4 shadow-[0_0_30px_rgba(75,226,119,0.15)]">
                <span className="material-symbols-outlined text-[40px] text-[#4be277]" style={{ fontVariationSettings: "'FILL' 1" }}>sports_soccer</span>
              </div>
              <h1 className="font-['Lexend'] text-3xl font-bold tracking-tight uppercase">DREAM COACH</h1>
              <p className="text-base text-[#bccbb9] mt-2 max-w-[280px]">Be the Coach. Build Your Legacy.</p>
            </div>
            <div className="flex gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-[#4be277] shadow-[0_0_8px_rgba(75,226,119,0.6)]" />
              <div className="w-2 h-2 rounded-full bg-[#323537]" />
              <div className="w-2 h-2 rounded-full bg-[#323537]" />
            </div>
            <div className="w-full flex flex-col gap-3">
              <button onClick={() => setStep(1)} className="w-full bg-[#4be277] text-[#003915] py-4 rounded-xl font-['Lexend'] font-semibold uppercase tracking-wider shadow-[0_0_20px_rgba(75,226,119,0.3)]">Get Started</button>
              <button onClick={skipFlow} className="w-full py-4 text-[#bccbb9] text-xs uppercase tracking-[0.16em]">Skip</button>
            </div>
          </div>
        </main>
      )}

      {step === 1 && (
        <main className="relative min-h-screen px-5 py-12 flex flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(75,226,119,0.15)_0%,rgba(16,20,21,1)_70%)]" />
          <header className="relative z-10 flex justify-between items-center">
            <span className="font-['Lexend'] text-xl italic font-black text-[#4be277] tracking-tight">STADIUM PRO</span>
            {progressDots}
          </header>

          <section className="relative z-10 text-center mt-6">
            <p className="text-[#4be277] text-sm">1/3</p>
            <h2 className="font-['Lexend'] text-4xl mt-2 leading-tight">Build Your <span className="text-[#4be277]">Dream Team</span></h2>
            <p className="text-[#bccbb9] mt-3">Choose from legends and stars. Create the ultimate squad.</p>
          </section>

          <section className="relative z-10 my-6 rounded-xl border border-[#3d4a3d] bg-[#10141599] backdrop-blur-xl p-4">
            <div className="grid grid-cols-4 gap-2 text-xs">
              {['Neymar', 'Ronaldo', 'Messi', 'De Bruyne', 'Kroos', 'Casemiro', 'Davies', 'Hakimi'].map((name, idx) => (
                <div key={name} className="rounded-lg border border-white/10 bg-[#1d2022] p-2">
                  <p className="text-[#4be277] font-bold">{90 - (idx % 4)}</p>
                  <p className="truncate mt-1">{name}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="relative z-10 w-full flex flex-col gap-3 pb-3">
            <button onClick={() => setStep(2)} className="w-full bg-[#4be277] text-[#003915] py-4 rounded-lg font-['Lexend'] font-semibold uppercase tracking-wider">Next</button>
            <button onClick={skipFlow} className="text-[#bccbb9] text-xs uppercase tracking-[0.16em]">Skip</button>
          </div>
        </main>
      )}

      {step === 2 && (
        <main className="relative min-h-screen px-5 py-12 flex flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(75,226,119,0.12)_0%,rgba(16,20,21,1)_70%)]" />
          <header className="relative z-10 flex justify-between items-center">
            <button onClick={() => setStep(1)} className="text-[#bccbb9]"><span className="material-symbols-outlined">arrow_back</span></button>
            {progressDots}
          </header>

          <section className="relative z-10 flex-1 flex items-center justify-center my-6">
            <div className="w-full aspect-[4/3] bg-[#10141599] backdrop-blur-xl rounded-xl border border-[#3d4a3d] p-4 relative overflow-hidden">
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10 -translate-x-1/2" />
              <div className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full border border-white/10 -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute top-1/4 left-1/4 w-3 h-3 rounded-full bg-[#4be277] shadow-[0_0_10px_rgba(75,226,119,0.45)]" />
              <div className="absolute bottom-1/3 right-1/4 w-3 h-3 rounded-full bg-[#4be277] shadow-[0_0_10px_rgba(75,226,119,0.45)]" />
              <div className="absolute top-1/2 right-1/3 w-3 h-3 rounded-full bg-[#4be277] shadow-[0_0_10px_rgba(75,226,119,0.45)]" />
              <div className="absolute left-4 right-4 bottom-4 rounded-lg bg-[#0b0f10cc] p-3">
                <Metric name="Pressing" value={85} />
                <Metric name="Possession" value={70} />
                <Metric name="Attack Width" value={60} />
                <Metric name="Defensive Line" value={70} />
              </div>
            </div>
          </section>

          <section className="relative z-10 text-center">
            <h2 className="font-['Lexend'] text-4xl leading-tight">Create Tactics.<br /><span className="text-[#4be277]">Dominate Matches.</span></h2>
            <p className="text-[#bccbb9] mt-3">Tactical control in your hands. Every decision matters.</p>
            <button onClick={() => setStep(3)} className="mt-7 w-full bg-[#4be277] text-[#003915] py-4 rounded-lg font-['Lexend'] font-semibold uppercase tracking-wider flex items-center justify-center gap-2">Next <span className="material-symbols-outlined">arrow_forward</span></button>
          </section>
        </main>
      )}

      {step === 3 && (
        <main className="min-h-screen px-5 py-10 flex flex-col">
          <header className="flex justify-between items-center">
            <button onClick={() => setStep(2)} className="text-[#bccbb9]"><span className="material-symbols-outlined">arrow_back</span></button>
            <p className="text-sm text-[#bccbb9]">3/3</p>
          </header>
          <h2 className="font-['Lexend'] text-3xl mt-6">Live Match Insights</h2>
          <p className="text-[#bccbb9] mt-2">Get tactical warnings and fatigue analysis before it is too late.</p>
          <div className="mt-6 space-y-3">
            <AlertCard type="HIGH" text="Left flank exposed. Opponent right winger getting too much space." />
            <AlertCard type="MED" text="Midfield control dropped below 40%. Consider a defensive sub." />
          </div>
          <div className="mt-auto space-y-3 pb-3">
            <button onClick={() => setStep(4)} className="w-full bg-[#4be277] text-[#003915] py-4 rounded-lg font-['Lexend'] font-semibold uppercase tracking-wider">Continue</button>
            <button onClick={skipFlow} className="text-[#bccbb9] text-xs uppercase tracking-[0.16em] w-full">Skip</button>
          </div>
        </main>
      )}

      {step === 4 && (
        <main className="min-h-screen px-5 py-10 flex flex-col">
          <h2 className="text-center text-[#4be277] tracking-[0.16em] text-sm">WHY DREAM COACH?</h2>
          <div className="grid grid-cols-2 gap-3 mt-7">
            <WhyCard title="Be the Coach" text="Make the right decisions" icon="sports" />
            <WhyCard title="Win & Achieve" text="Compete in challenges" icon="trophy" />
            <WhyCard title="Analyze & Improve" text="AI insights to improve" icon="query_stats" />
            <WhyCard title="Challenge Friends" text="Test tactics vs others" icon="groups" />
          </div>
          <div className="mt-auto space-y-3 pb-3">
            <button onClick={() => setStep(5)} className="w-full bg-[#4be277] text-[#003915] py-4 rounded-lg font-['Lexend'] font-semibold uppercase tracking-wider">Continue</button>
            <button onClick={skipFlow} className="text-[#bccbb9] text-xs uppercase tracking-[0.16em] w-full">Skip</button>
          </div>
        </main>
      )}

      {step === 5 && (
        <main className="min-h-screen px-5 py-10 flex flex-col">
          <header>
            <button onClick={() => setStep(4)} className="text-[#bccbb9]"><span className="material-symbols-outlined">arrow_back</span></button>
            <p className="text-[#bccbb9] mt-3 text-sm">CHOOSE YOUR EXPERIENCE</p>
          </header>
          <div className="mt-6 space-y-4">
            <ExperienceCard active={experience === 'coach'} title="Coach Mode" text="Full tactical experience with analysis and competitions." onClick={() => setExperience('coach')} />
            <ExperienceCard active={experience === 'casual'} title="Casual Mode" text="Quick matches and fun without pressure." onClick={() => setExperience('casual')} />
          </div>
          <button onClick={() => setStep(6)} className="mt-auto mb-3 w-full bg-[#4be277] text-[#003915] py-4 rounded-lg font-['Lexend'] font-semibold uppercase tracking-wider">Next</button>
        </main>
      )}

      {step === 6 && (
        <main className="min-h-screen px-5 py-10 flex flex-col">
          <header>
            <button onClick={() => setStep(5)} className="text-[#bccbb9]"><span className="material-symbols-outlined">arrow_back</span></button>
            <p className="text-[#bccbb9] mt-3 text-sm">SELECT YOUR FAVORITE CLUB</p>
          </header>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search for a club..." className="mt-4 w-full bg-[#191c1e] border border-[#3d4a3d] rounded-lg px-4 py-3 outline-none focus:border-[#4be277]" />
          <div className="mt-4 grid grid-cols-2 gap-3 overflow-y-auto pr-1">
            {filteredClubs.map((club) => (
              <button key={club.id} onClick={() => setSelectedClub(club)} className={`rounded-lg border p-3 text-left ${selectedClub.id === club.id ? 'border-[#4be277] bg-[#4be2771a]' : 'border-[#3d4a3d] bg-[#1d2022]'}`}>
                <div className="text-xl">{club.badge}</div>
                <p className="mt-2 text-sm">{club.name}</p>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(7)} className="mt-auto mb-3 w-full bg-[#4be277] text-[#003915] py-4 rounded-lg font-['Lexend'] font-semibold uppercase tracking-wider">Next</button>
        </main>
      )}

      {step === 7 && (
        <main className="min-h-screen px-5 py-10 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-7xl text-[#4be277]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          <h2 className="font-['Lexend'] text-4xl mt-5 text-[#4be277]">YOU'RE READY!</h2>
          <p className="text-[#bccbb9] mt-3 max-w-[280px]">Your journey as a coach starts now.</p>
          <button onClick={completeFlow} className="mt-10 w-full max-w-[24rem] bg-[#4be277] text-[#003915] py-4 rounded-lg font-['Lexend'] font-semibold uppercase tracking-wider">Let's Go!</button>
        </main>
      )}
    </div>
  );
}

function Metric({ name, value }: { name: string; value: number }) {
  return (
    <div className="flex items-center gap-3 mb-2 last:mb-0">
      <span className="text-xs uppercase tracking-wide text-[#bccbb9] w-[98px]">{name}</span>
      <div className="h-1 flex-1 rounded-full bg-[#323537] overflow-hidden">
        <div className="h-full bg-[#4be277]" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-[#bccbb9] w-6 text-right">{value}</span>
    </div>
  );
}

function AlertCard({ type, text }: { type: 'HIGH' | 'MED'; text: string }) {
  const color = type === 'HIGH' ? 'border-[#ffb4ab] text-[#ffb4ab]' : 'border-[#F59E0B] text-[#F59E0B]';
  return (
    <div className={`rounded-lg border bg-[#1d2022] p-4 ${color}`}>
      <p className="text-xs tracking-[0.14em]">{type}</p>
      <p className="mt-1 text-sm text-[#e0e3e5]">{text}</p>
    </div>
  );
}

function WhyCard({ title, text, icon }: { title: string; text: string; icon: string }) {
  return (
    <div className="rounded-lg border border-[#3d4a3d] bg-[#1d2022] p-4 text-center">
      <span className="material-symbols-outlined text-[#4be277]">{icon}</span>
      <h3 className="mt-2 font-['Lexend'] text-sm">{title}</h3>
      <p className="text-xs text-[#bccbb9] mt-1">{text}</p>
    </div>
  );
}

function ExperienceCard({ active, title, text, onClick }: { active: boolean; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full rounded-xl border p-4 text-left ${active ? 'border-[#4be277] bg-[#4be27714]' : 'border-[#3d4a3d] bg-[#1d2022]'}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-['Lexend'] text-lg">{title}</h3>
        <div className={`w-5 h-5 rounded-full border ${active ? 'border-[#4be277] bg-[#4be277]' : 'border-[#869585]'}`} />
      </div>
      <p className="text-sm text-[#bccbb9] mt-2">{text}</p>
    </button>
  );
}
