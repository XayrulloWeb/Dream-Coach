import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '../components/MobileBottomNav';
import { toApiError } from '../lib/api';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from '../lib/notificationsApi';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetchNotifications(80);
        if (!active) {
          return;
        }

        setItems(response.items);
        setUnreadCount(response.unreadCount);
      } catch (reason) {
        if (!active) {
          return;
        }
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

  const hasUnread = useMemo(() => unreadCount > 0, [unreadCount]);

  const onReadOne = async (id: string) => {
    try {
      const updated = await markNotificationRead(id);
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (reason) {
      setMessage(toApiError(reason).message);
    }
  };

  const onReadAll = async () => {
    try {
      const updated = await markAllNotificationsRead();
      setItems((current) =>
        current.map((item) => (item.isRead ? item : { ...item, isRead: true, readAt: new Date().toISOString() })),
      );
      setUnreadCount(0);
      setMessage(updated > 0 ? `Marked ${updated} as read.` : 'Nothing unread.');
    } catch (reason) {
      setMessage(toApiError(reason).message);
    }
  };

  return (
    <div className="min-h-screen bg-[#050A15] text-white pb-24">
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-4">
        <header className="flex items-center justify-between">
          <button onClick={() => navigate('/profile')} className="text-slate-300">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-['Lexend'] text-xl text-emerald-300 tracking-wide">NOTIFICATIONS</h1>
          <button
            onClick={() => void onReadAll()}
            disabled={!hasUnread}
            className="text-xs rounded-md border border-emerald-500/50 px-2 py-1 text-emerald-300 disabled:opacity-40"
          >
            Read all
          </button>
        </header>

        <section className="rounded-xl border border-white/10 bg-[#08162B]/90 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
            Feed {hasUnread ? `• ${unreadCount} unread` : '• all read'}
          </p>

          {loading ? <p className="mt-3 text-sm text-slate-400">Loading notifications...</p> : null}
          {!loading && !items.length ? <p className="mt-3 text-sm text-slate-400">No notifications yet.</p> : null}

          <div className="mt-3 space-y-2">
            {items.map((item) => (
              <article
                key={item.id}
                className={`rounded-xl border p-3 ${
                  item.isRead ? 'border-white/10 bg-[#0B1D38]/80' : 'border-emerald-500/35 bg-[#10273f]/90'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{item.title}</p>
                    <p className="text-sm text-slate-300 mt-1">{item.message}</p>
                    <p className="text-xs text-slate-500 mt-2">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  {!item.isRead ? (
                    <button
                      onClick={() => void onReadOne(item.id)}
                      className="shrink-0 rounded-md border border-emerald-500/70 px-2 py-1 text-xs text-emerald-300"
                    >
                      Mark
                    </button>
                  ) : (
                    <span className="shrink-0 text-[10px] text-slate-500 uppercase tracking-[0.12em]">Read</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {error ? <p className="text-xs text-amber-300">API warning: {error}</p> : null}
        {message ? <p className="text-xs text-emerald-300">{message}</p> : null}
      </main>

      <MobileBottomNav active="home" />
    </div>
  );
}

