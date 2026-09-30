import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, ArrowRight, ShieldAlert, Sparkles, DollarSign } from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('invoicenet_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/notifications', { headers });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen]);

  const markRead = async (id: string) => {
    try {
      const token = localStorage.getItem('invoicenet_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/notifications/${id}/read`, { method: 'PUT', headers });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {
      console.warn('Failed to mark read:', e);
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('invoicenet_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/notifications/read-all', { method: 'PUT', headers });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.warn('Failed to mark all read:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="flex-1" onClick={onClose} />
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col font-sans border-l border-slate-200 animate-in slide-in-from-right">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4 text-royal" />
            <h3 className="text-sm font-bold text-navy uppercase tracking-wider">In-App Alerts</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={markAllRead}
              className="text-[11px] font-semibold text-royal hover:underline flex items-center space-x-1"
              title="Mark all as read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-royal"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-8 text-slate-400 text-xs">
              No notifications yet. Workflow events will appear here in real time.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 transition-colors ${
                  notif.is_read ? 'bg-white opacity-70' : 'bg-royal/5 border-l-2 border-royal'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-navy">{notif.title}</h4>
                  {!notif.is_read && (
                    <button
                      onClick={() => markRead(notif.id)}
                      className="text-slate-400 hover:text-emerald p-0.5"
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                <span className="text-[10px] text-slate-400 font-mono mt-1.5 block">
                  {new Date(notif.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
