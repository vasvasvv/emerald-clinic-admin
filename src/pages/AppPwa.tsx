import { Download, Smartphone } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { usePwaNotifications } from '@/hooks/use-pwa-notifications';
import { useI18n } from '@/lib/i18n';

export default function AppPwa() {
  const { t } = useI18n();
  const { canInstall, install, installingPwa, isSupported, pwaInstalled, state, subscribe, unsubscribe } =
    usePwaNotifications();

  const notificationsEnabled = state === 'subscribed';
  const notificationsDisabled = state === 'unsubscribed' || state === 'denied';

  const handleToggleNotifications = async (checked: boolean) => {
    if (checked) {
      await subscribe();
      return;
    }
    await unsubscribe();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">{t('appTab')}</h1>

        <div className="glass-panel p-6 space-y-5">
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
                    : canInstall
                      ? t('pwaReadyToInstall')
                      : t('pwaWaitingToInstall')}
                </p>
              </div>
              <button
                onClick={() => void install()}
                className="btn-accent flex items-center justify-center gap-2 sm:min-w-[220px]"
                disabled={installingPwa || pwaInstalled || !canInstall}
              >
                <Download className="w-4 h-4" />
                {pwaInstalled ? t('pwaInstalledLabel') : installingPwa ? t('pwaLaunching') : t('pwaInstallButton')}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-secondary/30 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('appNotificationsTitle')}</p>
                <p className="text-sm text-muted-foreground">
                  {notificationsEnabled
                    ? t('appNotificationsEnabled')
                    : notificationsDisabled
                      ? t('appNotificationsDisabled')
                      : t('appNotificationsLoading')}
                </p>
              </div>
              <label className="inline-flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{t('appNotificationsToggle')}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationsEnabled}
                  onClick={() => void handleToggleNotifications(!notificationsEnabled)}
                  disabled={!isSupported || state === 'loading'}
                  className={`relative h-7 w-12 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    notificationsEnabled ? 'bg-primary' : 'bg-muted'
                  } ${!isSupported || state === 'loading' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-border p-4 text-sm text-muted-foreground space-y-2">
            <p>{t('pwaStep1')}</p>
            <p>{t('pwaStep2')}</p>
            <p>{t('pwaStep3')}</p>
          </div>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('appTab')}</p>
              <p className="text-sm text-muted-foreground">{t('pushSubscribersLabel')}</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
