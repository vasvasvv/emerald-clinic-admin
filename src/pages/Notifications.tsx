import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Send, Bell, Clock, CheckCircle, Smartphone, MessageCircle, RefreshCw, Link2, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/auth';

interface NotificationLog {
  id: number;
  channel: 'push' | 'telegram';
  body: string;
  target_type: 'all' | 'phone' | 'chat';
  target_value: string | null;
  created_at: string;
  sent_count: number;
  failed_count: number;
}

interface TelegramAppointment {
  id: number;
  patient_name: string;
  phone: string;
  appointment_at: string;
  doctor_name: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  telegram_chat_id: string | null;
}

interface TelegramPending {
  id: number;
  chat_id: string;
  first_name: string | null;
  created_at: string;
}

function normalizeDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('380') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+38${digits}`;
  return null;
}

export default function Notifications() {
  const { t } = useI18n();
  const token = getAdminToken();
  const [section, setSection] = useState<'push' | 'telegram'>('push');
  const [pushTarget, setPushTarget] = useState<'all' | 'targeted'>('all');
  const [pushMessage, setPushMessage] = useState('');
  const [pushPhone, setPushPhone] = useState('');
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [pushSubscriptions, setPushSubscriptions] = useState(0);
  const [telegramContacts, setTelegramContacts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const [telegramTab, setTelegramTab] = useState<'appointments' | 'pending' | 'settings'>('appointments');
  const [filterDate, setFilterDate] = useState(() => normalizeDateKey(new Date()));
  const [telegramAppointments, setTelegramAppointments] = useState<TelegramAppointment[]>([]);
  const [telegramPending, setTelegramPending] = useState<TelegramPending[]>([]);
  const [loadingTelegramAppointments, setLoadingTelegramAppointments] = useState(false);
  const [loadingTelegramPending, setLoadingTelegramPending] = useState(false);
  const [sendModal, setSendModal] = useState<TelegramAppointment | null>(null);
  const [sendText, setSendText] = useState('');
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [linkModal, setLinkModal] = useState<TelegramPending | null>(null);
  const [linkPhone, setLinkPhone] = useState('');
  const [linking, setLinking] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadBase = async () => {
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

  const loadTelegramAppointments = async () => {
    if (!token) return;
    setLoadingTelegramAppointments(true);
    setError('');
    try {
      setTelegramAppointments(await api.getTelegramAppointments(token, filterDate));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load telegram appointments');
    } finally {
      setLoadingTelegramAppointments(false);
    }
  };

  const loadTelegramPending = async () => {
    if (!token) return;
    setLoadingTelegramPending(true);
    setError('');
    try {
      setTelegramPending(await api.getTelegramPending(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load telegram pending list');
    } finally {
      setLoadingTelegramPending(false);
    }
  };

  useEffect(() => {
    void loadBase();
  }, [token]);

  useEffect(() => {
    if (section === 'telegram' && telegramTab === 'appointments') {
      void loadTelegramAppointments();
    }
  }, [section, telegramTab, filterDate, token]);

  useEffect(() => {
    if (section === 'telegram' && telegramTab === 'pending') {
      void loadTelegramPending();
    }
  }, [section, telegramTab, token]);

  const filteredLogs = useMemo(
    () => logs.filter((log) => (section === 'push' ? log.channel === 'push' : log.channel === 'telegram')),
    [logs, section],
  );

  const handlePushSend = async () => {
    if (!token || !pushMessage.trim()) return;
    if (pushTarget === 'targeted' && !pushPhone.trim()) {
      setError('Вкажи номер телефону для цільового push.');
      return;
    }
    setSending(true);
    setError('');
    setResult('');
    try {
      const response =
        pushTarget === 'all'
          ? await api.sendPushToAll(token, { body: pushMessage.trim() })
          : await api.sendPushToPhone(token, { phone: pushPhone.trim(), body: pushMessage.trim() });
      setResult(`Надіслано: ${response.sent}, помилки: ${response.failed}`);
      setPushMessage('');
      setPushPhone('');
      await loadBase();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send push notification');
    } finally {
      setSending(false);
    }
  };

  const handleSendTelegram = async () => {
    if (!token || !sendModal?.telegram_chat_id || !sendText.trim()) return;
    setSendingTelegram(true);
    setError('');
    setResult('');
    try {
      await api.sendTelegramMessage(token, { chat_id: sendModal.telegram_chat_id, text: sendText.trim() });
      setResult('Повідомлення в Telegram надіслано.');
      setSendModal(null);
      setSendText('');
      await loadBase();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send telegram message');
    } finally {
      setSendingTelegram(false);
    }
  };

  const handleLinkTelegram = async () => {
    if (!token || !linkModal) return;
    const phone = normalizePhone(linkPhone);
    if (!phone) {
      setError('Формат телефону: +380XXXXXXXXX або 0XXXXXXXXX');
      return;
    }
    setLinking(true);
    setError('');
    setResult('');
    try {
      const response = await api.linkTelegramPhone(token, {
        phone,
        telegram_chat_id: linkModal.chat_id,
      });
      setResult(response.updated > 0 ? `Прив’язано до ${response.updated} записів.` : 'Записів з таким номером не знайдено.');
      setLinkModal(null);
      setLinkPhone('');
      await Promise.all([loadTelegramPending(), loadTelegramAppointments(), loadBase()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link telegram phone');
    } finally {
      setLinking(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">{t('notifications')}</h1>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && <p className="text-sm text-success">{result}</p>}

        <div className="flex rounded-xl overflow-hidden border border-border w-full sm:w-fit">
          <button
            onClick={() => setSection('push')}
            className={`px-4 py-2 text-sm font-medium ${section === 'push' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/60'}`}
          >
            Push
          </button>
          <button
            onClick={() => setSection('telegram')}
            className={`px-4 py-2 text-sm font-medium ${section === 'telegram' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/60'}`}
          >
            Telegram
          </button>
        </div>

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

        {section === 'push' && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 space-y-4">
              <h2 className="font-heading font-semibold">{t('send')}</h2>

              <div className="flex gap-3">
                <button
                  onClick={() => setPushTarget('all')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    pushTarget === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  <Bell className="w-4 h-4 inline mr-1.5" />
                  {t('sendToAll')}
                </button>
                <button
                  onClick={() => setPushTarget('targeted')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    pushTarget === 'targeted' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  <Send className="w-4 h-4 inline mr-1.5" />
                  {t('sendTargeted')}
                </button>
              </div>

              {pushTarget === 'targeted' && (
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">{t('phone')}</label>
                  <input className="input-glass w-full" value={pushPhone} onChange={(e) => setPushPhone(e.target.value)} placeholder="+380..." />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">{t('message')}</label>
                <textarea
                  className="input-glass w-full resize-none"
                  rows={4}
                  value={pushMessage}
                  onChange={(e) => setPushMessage(e.target.value)}
                  placeholder={t('message') + '...'}
                />
              </div>

              <button onClick={() => void handlePushSend()} className="btn-accent flex items-center gap-2" disabled={sending}>
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
              ) : filteredLogs.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">Історія поки порожня.</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredLogs.map((log) => (
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
          </>
        )}

        {section === 'telegram' && (
          <>
            <div className="flex rounded-xl overflow-hidden border border-border w-full sm:w-fit">
              <button
                onClick={() => setTelegramTab('appointments')}
                className={`px-4 py-2 text-sm font-medium ${telegramTab === 'appointments' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/60'}`}
              >
                Записи
              </button>
              <button
                onClick={() => setTelegramTab('pending')}
                className={`px-4 py-2 text-sm font-medium ${telegramTab === 'pending' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/60'}`}
              >
                Очікують прив'язки
              </button>
              <button
                onClick={() => setTelegramTab('settings')}
                className={`px-4 py-2 text-sm font-medium ${telegramTab === 'settings' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/60'}`}
              >
                Налаштування
              </button>
            </div>

            {telegramTab === 'appointments' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <input type="date" className="input-glass" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                    <button onClick={() => void loadTelegramAppointments()} className="p-2 rounded-xl hover:bg-secondary/60">
                      <RefreshCw className={`w-4 h-4 ${loadingTelegramAppointments ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <span className="text-sm text-muted-foreground">Стан Telegram для записів на {filterDate}</span>
                </div>

                {loadingTelegramAppointments ? (
                  <div className="text-sm text-muted-foreground">{t('loading')}</div>
                ) : telegramAppointments.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Записів на цю дату немає.</div>
                ) : (
                  <div className="space-y-3">
                    {telegramAppointments.map((appointment) => (
                      <div key={appointment.id} className="rounded-2xl border border-border p-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{appointment.patient_name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${appointment.telegram_chat_id ? 'bg-info/20 text-info' : 'bg-secondary text-muted-foreground'}`}>
                              {appointment.telegram_chat_id ? 'Telegram OK' : 'Без Telegram'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{new Date(appointment.appointment_at).toLocaleString('uk-UA')}</span>
                            <span>{appointment.phone || '-'}</span>
                            <span>{appointment.doctor_name || '-'}</span>
                            {appointment.telegram_chat_id && <span>chat_id: {appointment.telegram_chat_id}</span>}
                          </div>
                        </div>
                        {appointment.telegram_chat_id && (
                          <button
                            onClick={() => {
                              setSendModal(appointment);
                              setSendText(`Доброго дня, ${appointment.patient_name}! Нагадуємо про ваш прийом у Dentis.`);
                            }}
                            className="btn-accent flex items-center gap-2"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Написати
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {telegramTab === 'pending' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-muted-foreground">Користувачі, які написали боту, але ще не прив’язані до телефону.</p>
                  <button onClick={() => void loadTelegramPending()} className="p-2 rounded-xl hover:bg-secondary/60">
                    <RefreshCw className={`w-4 h-4 ${loadingTelegramPending ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingTelegramPending ? (
                  <div className="text-sm text-muted-foreground">{t('loading')}</div>
                ) : telegramPending.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Немає користувачів у pending-черзі.</div>
                ) : (
                  <div className="space-y-3">
                    {telegramPending.map((pending) => (
                      <div key={pending.id} className="rounded-2xl border border-border p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center">
                          <MessageCircle className="w-5 h-5 text-info" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{pending.first_name || 'Без імені'}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>chat_id: {pending.chat_id}</span>
                            <span>{new Date(pending.created_at).toLocaleString('uk-UA')}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setLinkModal(pending);
                            setLinkPhone('');
                          }}
                          className="btn-accent flex items-center gap-2"
                        >
                          <Link2 className="w-4 h-4" />
                          Прив'язати
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {telegramTab === 'settings' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="glass-panel p-6 space-y-3">
                  <h2 className="font-heading font-semibold">Посилання для пацієнтів</h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="input-glass flex-1 min-w-[280px]">https://t.me/dentis_notif_bot</div>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText('https://t.me/dentis_notif_bot');
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="btn-accent"
                    >
                      {copied ? 'Скопійовано' : 'Копіювати'}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">Пацієнт відкриває бота, надсилає `/start`, ділиться номером телефону, після чого його можна зв’язати із записами.</p>
                </div>

                <div className="glass-panel p-6 space-y-2 text-sm text-muted-foreground">
                  <p>1. Пацієнт переходить у Telegram-бота.</p>
                  <p>2. Надсилає `/start` і ділиться номером телефону.</p>
                  <p>3. Контакт потрапляє в `pending` або відразу збігається з номером у системі.</p>
                  <p>4. Менеджер може вручну прив’язати pending-контакт до номера пацієнта.</p>
                  <p>5. Після цього можна надсилати ручні Telegram-повідомлення з адмінки.</p>
                </div>
              </motion.div>
            )}
          </>
        )}

        <AnimatePresence>
          {sendModal && (
            <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="glass-panel w-full max-w-lg p-6 space-y-4" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
                <h2 className="font-heading font-semibold text-lg">Написати в Telegram</h2>
                <div className="rounded-xl bg-secondary/50 p-4 text-sm">
                  <p className="font-medium">{sendModal.patient_name}</p>
                  <p className="text-muted-foreground">{sendModal.phone}</p>
                  <p className="text-muted-foreground">chat_id: {sendModal.telegram_chat_id}</p>
                </div>
                <textarea className="input-glass w-full resize-none" rows={5} value={sendText} onChange={(e) => setSendText(e.target.value)} />
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setSendModal(null)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary/60">
                    {t('cancel')}
                  </button>
                  <button onClick={() => void handleSendTelegram()} className="btn-accent flex items-center gap-2" disabled={sendingTelegram || !sendText.trim()}>
                    <Send className="w-4 h-4" />
                    {t('send')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {linkModal && (
            <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="glass-panel w-full max-w-lg p-6 space-y-4" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
                <h2 className="font-heading font-semibold text-lg">Прив'язати Telegram</h2>
                <div className="rounded-xl bg-secondary/50 p-4 text-sm">
                  <p className="font-medium">{linkModal.first_name || 'Без імені'}</p>
                  <p className="text-muted-foreground">chat_id: {linkModal.chat_id}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">{t('phone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input className="input-glass w-full pl-10" value={linkPhone} onChange={(e) => setLinkPhone(e.target.value)} placeholder="+380..." />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setLinkModal(null)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary/60">
                    {t('cancel')}
                  </button>
                  <button onClick={() => void handleLinkTelegram()} className="btn-accent flex items-center gap-2" disabled={linking}>
                    <Link2 className="w-4 h-4" />
                    Прив'язати
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
