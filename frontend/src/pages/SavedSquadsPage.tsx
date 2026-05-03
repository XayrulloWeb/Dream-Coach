import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '../components/MobileBottomNav';
import { toApiError } from '../lib/api';
import { fetchSavedSquads, removeSavedSquad, type SavedSquadRecord } from '../lib/squadsApi';
import { loadSavedSquads } from '../lib/savedSquads';
import { saveSquadPayload } from '../lib/squad';
import type { SimulationPayload } from '../types/simulation';

export default function SavedSquadsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedSquadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const rows = await fetchSavedSquads();
        if (!active) {
          return;
        }
        setItems(rows);
      } catch (reason) {
        if (!active) {
          return;
        }

        const localFallback = loadSavedSquads().map((item) => ({
          id: item.id,
          ownerId: 'local',
          name: item.name,
          formation: item.formation,
          tacticalStyle: item.tacticalStyle,
          averageRating: item.averageRating,
          payload: item.payload,
          createdAt: item.createdAt,
          updatedAt: item.createdAt,
        })) as SavedSquadRecord[];

        setItems(localFallback);
        setError(toApiError(reason).message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const total = useMemo(() => items.length, [items]);

  const onDelete = async (id: string) => {
    setMessage('');

    try {
      await removeSavedSquad(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setMessage('Saved squad deleted.');
    } catch (reason) {
      setMessage(toApiError(reason).message);
    }
  };

  const onLoad = (payload: SimulationPayload, name: string) => {
    saveSquadPayload(payload);
    setMessage(`Loaded: ${name}`);
    navigate('/squad-builder');
  };

  return (
    <div className="min-h-screen bg-[#050A15] text-white pb-24">
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-4">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="text-slate-300">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-['Lexend'] text-xl text-emerald-300 tracking-wide">SAVED SQUADS</h1>
          <span className="text-xs text-slate-400">{total}</span>
        </header>

        {loading ? (
          <section className="rounded-xl border border-white/10 bg-[#08162B]/90 p-4">
            <p className="text-sm text-slate-400">Loading squads...</p>
          </section>
        ) : items.length ? (
          <section className="space-y-2">
            {items.map((squad) => (
              <div key={squad.id} className="rounded-xl border border-white/10 bg-[#08162B]/90 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{squad.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {squad.formation} • {squad.tacticalStyle} • OVR {squad.averageRating}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onLoad(squad.payload, squad.name)}
                      className="rounded-md border border-emerald-500/70 px-3 py-1 text-xs text-emerald-300"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => void onDelete(squad.id)}
                      className="rounded-md border border-rose-500/60 px-3 py-1 text-xs text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className="rounded-xl border border-white/10 bg-[#08162B]/90 p-4">
            <p className="text-sm text-slate-400">No saved squads yet.</p>
          </section>
        )}

        {error ? <p className="text-xs text-amber-300">API warning: {error}</p> : null}
        {message ? <p className="text-xs text-emerald-300">{message}</p> : null}
      </main>

      <MobileBottomNav active="squad" />
    </div>
  );
}
