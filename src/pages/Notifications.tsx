import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Send,
  Bell,
  Clock,
  CheckCircle,
  Phone,
  RefreshCw,
  Link2,
  MessageCircle,
  MessageSquareShare,
  TimerReset,
  Siren,
  Download,
  Smartphone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useLinkTelegramPhone,
  useNotificationLogs,
  usePushCounts,
  useSendPushToAll,
  useSendPushToPhone,
  useSendTelegramMessage,
  useTelegramAppointments,
  useTelegramDebug,
  useTelegramPending,
  useTriggerTelegramCron,
} from '@/hooks/use-notifications';
import { formatDateKey } from '@/lib/date-utils';
import { extractFirstName, normalizePhone } from '@/lib/patient-utils';
import type {
  ApiNotificationLog,
  ApiTelegramAppointment,
  ApiTelegramDebugResult,
  ApiTelegramPending,
} from '@/types/api';

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function Notifications() {
  const { t, lang } = useI18n();
  const locale = lang === 'uk' ? 'uk-UA' : 'en-US';
  const [section, setSection] = useState<'push' | 'telegram' | 'pwa'>('telegram');
  const [pushTarget, setPushTarget] = useState<'all' | 'targeted'>('all');
  const [pushMessage, setPushMessage] = useState('');
  const [pushPhone, setPushPhone] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [telegramTab, setTelegramTab] = useState<'appointments' | 'pending' | 'settings'>('appointments');
  const [filterDate, setFilterDate] = useState(() => formatDateKey(new Date()));
  const [sendModal, setSendModal] = useState<ApiTelegramAppointment | null>(null);
  const [sendText, setSendText] = useState('');
  const [linkModal, setLinkModal] = useState<ApiTelegramPending | null>(null);
  const [linkPhone, setLinkPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [installingPwa, setInstallingPwa] = useState(false);
  const [pwaInstalled, setPwaInstalled] = useState(
    typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches,
  );

  const pushCountsQuery = usePushCounts();
  const notificationLogsQuery = useNotificationLogs();
  const telegramAppointmentsQuery = useTelegramAppointments(
    filterDate,
    section === 'telegram' && telegramTab === 'appointments',
  );
  const telegramPendingQuery = useTelegramPending(section === 'telegram' && telegramTab === 'pending');
  const telegramDebugQuery = useTelegramDebug(section === 'telegram' && telegramTab === 'settings');
  const sendPushToAll = useSendPushToAll();
  const sendPushToPhone = useSendPushToPhone();
  const sendTelegramMessage = useSendTelegramMessage();
  const linkTelegramPhone = useLinkTelegramPhone();
  const triggerTelegramCron = useTriggerTelegramCron();

  const pushSubscriptions = pushCountsQuery.data?.pushSubscriptions ?? 0;
  const telegramContacts = pushCountsQuery.data?.telegramContacts ?? 0;
  const loading = pushCountsQuery.isLoading || notificationLogsQuery.isLoading;
  const telegramAppointments = telegramAppointmentsQuery.data ?? [];
  const telegramPending = telegramPendingQuery.data ?? [];
  const loadingTelegramAppointments = telegramAppointmentsQuery.isLoading || telegramAppointmentsQuery.isFetching;
  const loadingTelegramPending = telegramPendingQuery.isLoading || telegramPendingQuery.isFetching;
  const debugData: ApiTelegramDebugResult | null = triggerTelegramCron.data ?? telegramDebugQuery.data ?? null;
  const loadingDebug = telegramDebugQuery.isLoading || telegramDebugQuery.isFetching;
  const sending = sendPushToAll.isPending || sendPushToPhone.isPending;
  const sendingTelegram = sendTelegramMessage.isPending;
  const linking = linkTelegramPhone.isPending;
  const triggeringCron = triggerTelegramCron.isPending;
  const queryError =
    pushCountsQuery.error ??
    notificationLogsQuery.error ??
    telegramAppointmentsQuery.error ??
    telegramPendingQuery.error ??
    telegramDebugQuery.error;
  const errorMessage = error || (queryError instanceof Error ? queryError.message : '');
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as DeferredInstallPrompt);
    };
    const handleInstalled = () => {
      setPwaInstalled(true);
      setDeferredInstallPrompt(null);
      setResult(t('notificationsPwaInstalled'));
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [t]);

  const filteredLogs = useMemo(
    () =>
      (notificationLogsQuery.data ?? []).filter((log: ApiNotificationLog) =>
        section === 'push' ? log.channel === 'push' : log.channel === 'telegram',
      ),
    [notificationLogsQuery.data, section],
  );

  const handlePushSend = async () => {
    if (!pushMessage.trim()) return;
    if (pushTarget === 'targeted' && !pushPhone.trim()) return setError('Вкажи номер телефону для цільового push.');
    setError('');
    setResult('');
    try {
      const response =
        pushTarget === 'all'
          ? await sendPushToAll.mutateAsync({ body: pushMessage.trim() })
          : await sendPushToPhone.mutateAsync({ phone: pushPhone.trim(), body: pushMessage.trim() });
      setResult(`Надіслано: ${response.sent}, помилки: ${response.failed}`);
      setPushMessage('');
      setPushPhone('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('notificationsFailedSendPush'));
    }
  };
  const handleSendTelegram = async () => {
    if (!sendModal?.telegram_chat_id || !sendText.trim()) return;
    setError('');
    setResult('');
    try {
      await sendTelegramMessage.mutateAsync({ chat_id: sendModal.telegram_chat_id, text: sendText.trim() });
      setResult(t('notificationsTelegramSent'));
      setSendModal(null);
      setSendText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('notificationsFailedSendTelegram'));
    }
  };
  const handleLinkTelegram = async () => {
    if (!linkModal) return;
    const phone = normalizePhone(linkPhone);
    if (!phone) return setError('Формат телефону: +380XXXXXXXXX або 0XXXXXXXXX');
    setError('');
    setResult('');
    try {
      const response = await linkTelegramPhone.mutateAsync({ phone, telegram_chat_id: linkModal.chat_id });
      setResult(
        response.updated > 0
          ? t('notificationsLinkedRecords').replace('{{count}}', String(response.updated))
          : t('notificationsNoRecordsForPhone'),
      );
      setLinkModal(null);
      setLinkPhone('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('notificationsFailedLinkTelegram'));
    }
  };
  const handleTriggerCron = async () => {
    setError('');
    setResult('');
    try {
      const data = await triggerTelegramCron.mutateAsync();
      setResult(
        t('notificationsCronResult')
          .replace('{{remind24}}', String(data.remind24))
          .replace('{{remind1}}', String(data.remind1)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('notificationsFailedTriggerCron'));
    }
  };

  const handleInstallPwa = async () => {
    if (!deferredInstallPrompt) {
      setResult(t('notificationsPwaInstallAvailableLater'));
      return;
    }
    setInstallingPwa(true);
    setError('');
    setResult('');
    try {
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setResult(t('notificationsPwaInstallAccepted'));
      } else {
        setResult(t('notificationsPwaInstallDismissed'));
      }
      setDeferredInstallPrompt(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('notificationsPwaInstallFailed'));
    } finally {
      setInstallingPwa(false);
    }
  };

  const StatCard = ({
    icon,
    label,
    value,
    accent,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    accent: string;
  }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${accent}`}>{icon}</div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-3xl font-heading font-bold">{value}</p>
    </motion.div>
  );

  const DebugColumn = ({
    title,
    subtitle,
    items,
    icon,
  }: {
    title: string;
    subtitle: string;
    items: Array<{ id: number; patient_name: string; appointment_at: string }>;
    icon: React.ReactNode;
  }) => (
    <div className="rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('xrayNoMatches')}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl bg-secondary/40 px-3 py-2">
              <p className="text-sm font-medium">{item.patient_name}</p>
              <p className="text-xs text-muted-foreground">{new Date(item.appointment_at).toLocaleString(locale)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">{t('notifications')}</h1>
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        {result && <p className="text-sm text-success">{result}</p>}

        <div className="inline-flex w-full max-w-xl rounded-3xl border border-border bg-secondary/35 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
          <button
            onClick={() => setSection('telegram')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[20px] px-5 py-3 text-sm font-semibold transition-all ${section === 'telegram' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-secondary/70'}`}
          >
            <Send className="h-4 w-4" />
            {t('notificationsSectionTelegram')}
          </button>
          <button
            onClick={() => setSection('push')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[20px] px-5 py-3 text-sm font-semibold transition-all ${section === 'push' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-secondary/70'}`}
          >
            <Bell className="h-4 w-4" />
            {t('notificationsSectionPush')}
          </button>
          <button
            onClick={() => setSection('pwa')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[20px] px-5 py-3 text-sm font-semibold transition-all ${section === 'pwa' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-secondary/70'}`}
          >
            <Smartphone className="h-4 w-4" />
            {t('notificationsSectionPwa')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={<Send className="w-5 h-5 text-accent" />}
            label={t('telegramContactsLabel')}
            value={loading ? '...' : telegramContacts}
            accent="bg-accent/15"
          />
          <StatCard
            icon={<Phone className="w-5 h-5 text-primary" />}
            label={t('pushSubscribersLabel')}
            value={loading ? '...' : pushSubscriptions}
            accent="bg-primary/15"
          />
        </div>

        {section === 'push' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-6 space-y-4"
            >
              <h2 className="font-heading font-semibold">{t('send')}</h2>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setPushTarget('all')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${pushTarget === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                >
                  <Bell className="w-4 h-4 inline mr-1.5" />
                  {t('sendToAll')}
                </button>
                <button
                  onClick={() => setPushTarget('targeted')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${pushTarget === 'targeted' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                >
                  <Send className="w-4 h-4 inline mr-1.5" />
                  {t('sendTargeted')}
                </button>
              </div>
              {pushTarget === 'targeted' && (
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">{t('phone')}</label>
                  <input
                    className="input-glass w-full"
                    value={pushPhone}
                    onChange={(e) => setPushPhone(e.target.value)}
                    placeholder="+380..."
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">{t('message')}</label>
                <textarea
                  className="input-glass w-full resize-none"
                  rows={4}
                  value={pushMessage}
                  onChange={(e) => setPushMessage(e.target.value)}
                  placeholder={`${t('message')}...`}
                />
              </div>
              <button
                onClick={() => void handlePushSend()}
                className="btn-accent flex items-center gap-2"
                disabled={sending}
              >
                <Send className="w-4 h-4" />
                {t('send')}
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel"
            >
              <div className="p-5 border-b border-border">
                <h2 className="font-heading font-semibold">{t('notificationHistory')}</h2>
              </div>
              {loading ? (
                <div className="p-5 text-sm text-muted-foreground">{t('loading')}</div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">{t('notificationsHistoryEmpty')}</div>
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
                          <span>
                            {log.target_type === 'all' ? t('notificationsAllSubscribers') : log.target_value || '-'}
                          </span>
                          <span>
                            {t('notificationsSuccessCount')}: {log.sent_count}
                          </span>
                          <span>
                            {t('notificationsFailedCount')}: {log.failed_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.created_at).toLocaleString(locale)}
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
            <div className="inline-flex w-full max-w-2xl rounded-2xl border border-border bg-secondary/25 p-1">
              <button
                onClick={() => setTelegramTab('appointments')}
                className={`flex-1 rounded-[14px] px-4 py-2.5 text-sm font-medium ${telegramTab === 'appointments' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/60'}`}
              >
                {t('telegramTabAppointments')}
              </button>
              <button
                onClick={() => setTelegramTab('pending')}
                className={`flex-1 rounded-[14px] px-4 py-2.5 text-sm font-medium ${telegramTab === 'pending' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/60'}`}
              >
                {t('telegramTabPending')}
              </button>
              <button
                onClick={() => setTelegramTab('settings')}
                className={`flex-1 rounded-[14px] px-4 py-2.5 text-sm font-medium ${telegramTab === 'settings' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary/60'}`}
              >
                {t('telegramTabSettings')}
              </button>
            </div>

            {telegramTab === 'appointments' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      className="input-glass"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                    />
                    <button
                      onClick={() => void telegramAppointmentsQuery.refetch()}
                      className="p-2 rounded-xl hover:bg-secondary/60"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingTelegramAppointments ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {t('telegramStatusForDate')} {filterDate}
                  </span>
                </div>
                {loadingTelegramAppointments ? (
                  <div className="text-sm text-muted-foreground">{t('loading')}</div>
                ) : telegramAppointments.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('telegramNoAppointmentsForDate')}</div>
                ) : (
                  <div className="space-y-3">
                    {telegramAppointments.map((appointment) => {
                      const firstName = extractFirstName(appointment.patient_name);
                      return (
                        <div
                          key={appointment.id}
                          className="rounded-2xl border border-border p-4 flex items-center gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">{firstName || appointment.patient_name}</p>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${appointment.telegram_chat_id ? 'bg-info/20 text-info' : 'bg-secondary text-muted-foreground'}`}
                              >
                                {appointment.telegram_chat_id ? t('telegramOk') : t('telegramMissing')}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{new Date(appointment.appointment_at).toLocaleString(locale)}</span>
                              <span>{appointment.phone || '-'}</span>
                              <span>{appointment.doctor_name || '-'}</span>
                              {appointment.telegram_chat_id && <span>chat_id: {appointment.telegram_chat_id}</span>}
                            </div>
                          </div>
                          {appointment.telegram_chat_id && (
                            <button
                              onClick={() => {
                                setSendModal(appointment);
                                setSendText(
                                  `Доброго дня, ${firstName || 'пацієнте'}! Нагадуємо про ваш прийом у Dentis.`,
                                );
                              }}
                              className="btn-accent flex items-center gap-2"
                            >
                              <MessageCircle className="w-4 h-4" />
                              {t('telegramWrite')}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {telegramTab === 'pending' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-muted-foreground">{t('telegramPendingHelp')}</p>
                  <button
                    onClick={() => void telegramPendingQuery.refetch()}
                    className="p-2 rounded-xl hover:bg-secondary/60"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingTelegramPending ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {loadingTelegramPending ? (
                  <div className="text-sm text-muted-foreground">{t('loading')}</div>
                ) : telegramPending.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t('telegramNoPending')}</div>
                ) : (
                  <div className="space-y-3">
                    {telegramPending.map((pending) => (
                      <div key={pending.id} className="rounded-2xl border border-border p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center">
                          <Send className="w-5 h-5 text-info" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{pending.first_name || t('noName')}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>chat_id: {pending.chat_id}</span>
                            <span>{new Date(pending.created_at).toLocaleString(locale)}</span>
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
                          {t('telegramLinkAction')}
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
                  <h2 className="font-heading font-semibold">{t('telegramBotLinkTitle')}</h2>
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
                      {copied ? t('copied') : t('copy')}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('telegramBotLinkDescription')}</p>
                </div>

                <div className="glass-panel p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h2 className="font-heading font-semibold">{t('telegramRemindersTitle')}</h2>
                      <p className="text-sm text-muted-foreground">{t('telegramRemindersDescription')}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => void telegramDebugQuery.refetch()}
                        className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium"
                        disabled={loadingDebug}
                      >
                        <RefreshCw className={`w-4 h-4 inline mr-2 ${loadingDebug ? 'animate-spin' : ''}`} />
                        {t('refresh')}
                      </button>
                      <button onClick={() => void handleTriggerCron()} className="btn-accent" disabled={triggeringCron}>
                        <Siren className="w-4 h-4 inline mr-2" />
                        {t('runCron')}
                      </button>
                    </div>
                  </div>

                  {!debugData && loadingDebug ? (
                    <div className="text-sm text-muted-foreground">{t('loading')}</div>
                  ) : debugData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <DebugColumn
                          title={t('telegramCandidates24h')}
                          subtitle={`Вікно: ${debugData.windows.from24} - ${debugData.windows.to24}`}
                          items={debugData.appointments24}
                          icon={<TimerReset className="w-4 h-4 text-primary" />}
                        />
                        <DebugColumn
                          title={t('telegramCandidates1h')}
                          subtitle={`Вікно: ${debugData.windows.from1} - ${debugData.windows.to1}`}
                          items={debugData.appointments1}
                          icon={<Clock className="w-4 h-4 text-accent" />}
                        />
                      </div>
                      <div className="rounded-2xl border border-border p-4 space-y-2">
                        <p className="text-sm font-medium">{t('debugLogTitle')}</p>
                        {debugData.log.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t('debugLogEmpty')}</p>
                        ) : (
                          <div className="space-y-1 font-mono text-xs text-muted-foreground">
                            {debugData.log.map((line, index) => (
                              <p key={`${line}-${index}`}>{line}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('debugNotLoaded')}</p>
                  )}
                </div>

                <div className="glass-panel p-6 space-y-2 text-sm text-muted-foreground">
                  <p>{t('telegramFlowStep1')}</p>
                  <p>{t('telegramFlowStep2')}</p>
                  <p>{t('telegramFlowStep3')}</p>
                  <p>{t('telegramFlowStep4')}</p>
                  <p>{t('telegramFlowStep5')}</p>
                </div>
              </motion.div>
            )}
          </>
        )}

        {section === 'pwa' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 space-y-5"
          >
            <div className="space-y-2">
              <h2 className="font-heading font-semibold">{t('pwaInstallTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('pwaInstallDescription')}</p>
            </div>

            <div className="rounded-3xl border border-border bg-secondary/30 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('pwaStatusTitle')}</p>
                  <p className="text-sm text-muted-foreground">
                    {pwaInstalled
                      ? t('pwaAlreadyInstalled')
                      : deferredInstallPrompt
                        ? t('pwaReadyToInstall')
                        : t('pwaWaitingToInstall')}
                  </p>
                </div>
                <button
                  onClick={() => void handleInstallPwa()}
                  className="btn-accent flex items-center justify-center gap-2 sm:min-w-[220px]"
                  disabled={installingPwa || pwaInstalled || !deferredInstallPrompt}
                >
                  <Download className="w-4 h-4" />
                  {pwaInstalled ? t('pwaInstalledLabel') : installingPwa ? t('pwaLaunching') : t('pwaInstallButton')}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border p-4 text-sm text-muted-foreground space-y-2">
              <p>{t('pwaStep1')}</p>
              <p>{t('pwaStep2')}</p>
              <p>{t('pwaStep3')}</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {sendModal && (
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="glass-panel w-full max-w-lg p-6 space-y-4"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <h2 className="font-heading font-semibold text-lg">{t('telegramWriteTitle')}</h2>
                <div className="rounded-xl bg-secondary/50 p-4 text-sm">
                  <p className="font-medium">{extractFirstName(sendModal.patient_name) || sendModal.patient_name}</p>
                  <p className="text-muted-foreground">{sendModal.phone}</p>
                  <p className="text-muted-foreground">chat_id: {sendModal.telegram_chat_id}</p>
                </div>
                <textarea
                  className="input-glass w-full resize-none"
                  rows={5}
                  value={sendText}
                  onChange={(e) => setSendText(e.target.value)}
                />
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setSendModal(null)}
                    className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary/60"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={() => void handleSendTelegram()}
                    className="btn-accent flex items-center gap-2"
                    disabled={sendingTelegram || !sendText.trim()}
                  >
                    <MessageSquareShare className="w-4 h-4" />
                    {t('send')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {linkModal && (
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="glass-panel w-full max-w-lg p-6 space-y-4"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <h2 className="font-heading font-semibold text-lg">{t('telegramLinkTitle')}</h2>
                <div className="rounded-xl bg-secondary/50 p-4 text-sm">
                  <p className="font-medium">{linkModal.first_name || t('noName')}</p>
                  <p className="text-muted-foreground">chat_id: {linkModal.chat_id}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">{t('phone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      className="input-glass w-full pl-10"
                      value={linkPhone}
                      onChange={(e) => setLinkPhone(e.target.value)}
                      placeholder="+380..."
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setLinkModal(null)}
                    className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary/60"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={() => void handleLinkTelegram()}
                    className="btn-accent flex items-center gap-2"
                    disabled={linking}
                  >
                    <Link2 className="w-4 h-4" />
                    {t('telegramLinkAction')}
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
