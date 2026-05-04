import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { toApiError } from '../lib/api';
import { fetchSavedSquads, removeSavedSquad, type SavedSquadRecord } from '../lib/squadsApi';
import { loadSavedSquads } from '../lib/savedSquads';
import { saveSquadPayload } from '../lib/squad';
import type { SimulationPayload } from '../types/simulation';

export default function SavedSquadsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedSquadRecord[]>([]);
  const [loading, setЗагрузитьing] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setЗагрузитьing(true);
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
          setЗагрузитьing(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const total = useMemo(() => items.length, [items]);

  const onУдалить = async (id: string) => {
    setMessage('');

    try {
      await removeSavedSquad(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setMessage('Состав удален.');
    } catch (reason) {
      setMessage(toApiError(reason).message);
    }
  };

  const onЗагрузить = (payload: SimulationPayload, name: string) => {
    saveSquadPayload(payload);
    setMessage(`Загрузитьed: ${name}`);
    navigate('/squad-builder');
  };

  return (
    <AppShell
      title="СОХРАНЕННЫЕ СОСТАВЫ"
      showBackButton
      backTo="/dashboard"
      activeTab="squad"
      headerRightElement={<span className="text-xs text-slate-400 font-bold px-2">{total}</span>}
      contentClassName="px-4 space-y-4 pt-4"
    >
      {loading ? (
        <section className="rounded-xl border border-white/10 bg-[#08162B]/90 p-4">
          <p className="text-sm text-slate-400">Загрузка составов...</p>
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
                    onClick={() => onЗагрузить(squad.payload, squad.name)}
                    className="rounded-md border border-emerald-500/70 px-3 py-1 text-xs text-emerald-300"
                  >
                    Загрузить
                  </button>
                  <button
                    onClick={() => void onУдалить(squad.id)}
                    className="rounded-md border border-rose-500/60 px-3 py-1 text-xs text-rose-300"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="rounded-xl border border-white/10 bg-[#08162B]/90 p-4">
          <p className="text-sm text-slate-400">Пока нет сохраненных составов.</p>
        </section>
      )}

      {error ? <p className="text-xs text-amber-300">Предупреждение API: {error}</p> : null}
      {message ? <p className="text-xs text-emerald-300">{message}</p> : null}
    </AppShell>
  );
}

