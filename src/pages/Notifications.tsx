import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Send, Bell, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface NotificationLog {
  id: number;
  message: string;
  target: string;
  sentAt: string;
  status: 'sent' | 'failed';
}

const mockLogs: NotificationLog[] = [
  { id: 1, message: 'Нагадування про прийом завтра о 10:00', target: 'Олена Петренко', sentAt: '2026-03-18 18:00', status: 'sent' },
  { id: 2, message: 'Акція: знижка 20% на відбілювання', target: 'Усі користувачі', sentAt: '2026-03-17 12:00', status: 'sent' },
  { id: 3, message: 'Зміна графіку роботи', target: 'Усі користувачі', sentAt: '2026-03-16 10:00', status: 'sent' },
];

export default function Notifications() {
  const { t } = useI18n();
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'targeted'>('all');
  const [logs] = useState<NotificationLog[]>(mockLogs);

  const handleSend = () => {
    if (!message.trim()) return;
    // Mock send
    setMessage('');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">{t('notifications')}</h1>

        {/* Send form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 space-y-4"
        >
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

          <button onClick={handleSend} className="btn-accent flex items-center gap-2">
            <Send className="w-4 h-4" />
            {t('send')}
          </button>
        </motion.div>

        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel"
        >
          <div className="p-5 border-b border-border">
            <h2 className="font-heading font-semibold">{t('notificationHistory')}</h2>
          </div>
          <div className="divide-y divide-border/50">
            {logs.map((log) => (
              <div key={log.id} className="p-5 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-success/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{log.message}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{log.target}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {log.sentAt}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
