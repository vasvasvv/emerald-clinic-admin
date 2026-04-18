import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        setInterval(
          () => {
            void registration.update();
          },
          60 * 60 * 1000,
        );

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      })
      .catch((error) => {
        console.error('SW registration failed:', error);
      });
  });
}

if ('serviceWorker' in navigator && import.meta.env.DEV) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
