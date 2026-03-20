import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Send, Bell, Clock, CheckCircle, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/auth';

interface NotificationLog {
  id: number;
  body: string;
  target_type: 'all' | 'phone' | 'chat';
  target_value: string | null;
  created_at: string;
  sent_count: number;
  failed_count: number;
}

export default function Notifications() {
  const { t } = useI18n();
  const token = getAdminToken();
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [target, setTarget] = useState<'all' | 'targeted'>('all');
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [pushSubscriptions, setPushSubscriptions] = useState(0);
  const [telegramContacts, setTelegramContacts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [counts, history] = await Promise.all([api.getPushCounts(token), api.getNotificationLogs(token)]);
      setPushSubscriptions(counts.pushSubscriptions);
      setTelegramContacts(counts.telegramContacts);
      setLogs(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const handleSend = async () => {
    if (!token || !message.trim()) return;
    if (target === 'targeted' && !phone.trim()) {
      setError('Вкажи номер телефону для цільового push.');
      return;
    }

    setSending(true);
    setError('');
    setResult('');
    try {
      const response =
        target === 'all'
          ? await api.sendPushToAll(token, { body: message.trim() })
          : await api.sendPushToPhone(token, { phone: phone.trim(), body: message.trim() });

      setResult(`Надіслано: ${response.sent}, помилки: ${response.failed}`);
      setMessage('');
      setPhone('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">{t('notifications')}</h1>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && <p className="text-sm text-success">{result}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Push subscription</p>
            </div>
            <p className="text-3xl font-heading font-bold">{loading ? '...' : pushSubscriptions}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground">Telegram contacts</p>
            </div>
            <p className="text-3xl font-heading font-bold">{loading ? '...' : telegramContacts}</p>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 space-y-4">
          <h2 className="font-heading font-semibold">{t('send')}</h2>

          <div className="flex gap-3">
            <button
              onClick={() => setTarget('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                target === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <Bell className="w-4 h-4 inline mr-1.5" />
              {t('sendToAll')}
            </button>
            <button
              onClick={() => setTarget('targeted')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                target === 'targeted' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <Send className="w-4 h-4 inline mr-1.5" />
              {t('sendTargeted')}
            </button>
          </div>

          {target === 'targeted' && (
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">{t('phone')}</label>
              <input
                className="input-glass w-full"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+380..."
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('message')}</label>
            <textarea
              className="input-glass w-full resize-none"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('message') + '...'}
            />
          </div>

          <button onClick={() => void handleSend()} className="btn-accent flex items-center gap-2" disabled={sending}>
            <Send className="w-4 h-4" />
            {t('send')}
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel">
          <div className="p-5 border-b border-border">
            <h2 className="font-heading font-semibold">{t('notificationHistory')}</h2>
          </div>
          {loading ? (
            <div className="p-5 text-sm text-muted-foreground">{t('loading')}</div>
          ) : logs.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">Історія поки порожня.</div>
          ) : (
            <div className="divide-y divide-border/50">
              {logs.map((log) => (
                <div key={log.id} className="p-5 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-success/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{log.body}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{log.target_type === 'all' ? 'Всі підписники' : log.target_value || '-'}</span>
                      <span>Успішно: {log.sent_count}</span>
                      <span>Помилки: {log.failed_count}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString('uk-UA')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
}
