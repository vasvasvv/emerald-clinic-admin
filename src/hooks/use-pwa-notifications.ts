import { useCallback, useEffect, useState } from 'react';
import { API_URL, apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type PushState = 'unsupported' | 'loading' | 'denied' | 'subscribed' | 'unsubscribed';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function usePwaNotifications() {
  const { token } = useAuth();
  const [state, setState] = useState<PushState>(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    return 'loading';
  });
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [installingPwa, setInstallingPwa] = useState(false);
  const [pwaInstalled, setPwaInstalled] = useState(
    typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches,
  );

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setState(subscription ? 'subscribed' : 'unsubscribed'))
      .catch(() => setState('unsubscribed'));
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as DeferredInstallPrompt);
    };
    const handleInstalled = () => {
      setPwaInstalled(true);
      setDeferredInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const subscribe = useCallback(async () => {
    if (!token || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
      setState('loading');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'unsubscribed');
        return false;
      }

      const keyResponse = await apiFetch('/api/push/public-key');
      const { key } = (await keyResponse.json()) as { key: string };
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      await apiFetch(
        '/api/push/subscribe',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription.toJSON()),
        },
        token,
      );

      setState('subscribed');
      return true;
    } catch {
      setState('unsubscribed');
      return false;
    }
  }, [token]);

  const unsubscribe = useCallback(async () => {
    if (!token || !('serviceWorker' in navigator)) return false;
    try {
      setState('loading');
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await apiFetch(
          '/api/push/unsubscribe',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          },
          token,
        );
        await subscription.unsubscribe();
      }
      setState('unsubscribed');
      return true;
    } catch {
      setState('subscribed');
      return false;
    }
  }, [token]);

  const install = useCallback(async () => {
    if (!deferredInstallPrompt) return 'unavailable' as const;
    setInstallingPwa(true);
    try {
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      setDeferredInstallPrompt(null);
      return choice.outcome;
    } finally {
      setInstallingPwa(false);
    }
  }, [deferredInstallPrompt]);

  return {
    canInstall: Boolean(deferredInstallPrompt),
    deferredInstallPrompt,
    install,
    installingPwa,
    pwaInstalled,
    state,
    subscribe,
    unsubscribe,
    isSupported: API_URL.length > 0 && 'serviceWorker' in navigator && 'PushManager' in window,
  };
}
