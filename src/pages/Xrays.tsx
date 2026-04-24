import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, LoaderCircle, RefreshCw, ZoomIn } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useActiveXraySession, useStartXraySession } from '@/hooks/use-xray';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import type { ApiXraySession } from '@/types/api';

type Step = 'idle' | 'capture';

export default function Xrays() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [step, setStep] = useState<Step>('idle');
  const [sessionState, setSessionState] = useState<ApiXraySession | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [isFullResOpen, setIsFullResOpen] = useState(false);

  const startXraySessionMutation = useStartXraySession();
  const activeSessionQuery = useActiveXraySession(
    sessionState?.id,
    step === 'capture' && Boolean(sessionState?.id) && sessionState?.status !== 'completed',
  );

  const session = activeSessionQuery.data ?? sessionState;
  const sessionXray = session?.xray ?? null;

  // Оновлюємо стан сесії при кожному polling
  useEffect(() => {
    if (activeSessionQuery.data) {
      setSessionState(activeSessionQuery.data);
    }
  }, [activeSessionQuery.data]);

  // Завантажуємо зображення коли знімок з'явився
  useEffect(() => {
    if (!token || !sessionXray) return;
    let cancelled = false;
    let previewObjectUrl: string | null = null;
    let originalObjectUrl: string | null = null;

    void (async () => {
      setIsImageLoading(true);
      try {
        const [previewBlob, originalBlob] = await Promise.all([
          api.getProtectedImageBlob(token, sessionXray.previewUrl),
          api.getProtectedImageBlob(token, sessionXray.originalUrl),
        ]);
        if (cancelled) return;
        previewObjectUrl = URL.createObjectURL(previewBlob);
        originalObjectUrl = URL.createObjectURL(originalBlob);
        setPreviewUrl(previewObjectUrl);
        setOriginalUrl(originalObjectUrl);
      } catch (imageError) {
        if (!cancelled) setError(imageError instanceof Error ? imageError.message : t('xrayFailedLoadImage'));
      } finally {
        if (!cancelled) setIsImageLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
      if (originalObjectUrl) URL.revokeObjectURL(originalObjectUrl);
    };
  }, [sessionXray, t, token]);

  // Запускаємо сесію — одразу переходимо в capture без жодних кроків
  const startCapture = async () => {
    setError('');
    setPreviewUrl(null);
    setOriginalUrl(null);
    setZoom(1);
    setIsStarting(true);
    try {
      const nextSession = await startXraySessionMutation.mutateAsync({
        patientId: 0, // Пацієнт та зуб прийдуть з im0 через агента
        toothId: 0,
        captureType: 'twin',
      });
      setSessionState(nextSession);
      setStep('capture');
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : t('xrayFailedCreateSession'));
    } finally {
      setIsStarting(false);
    }
  };

  const refreshCapture = async () => {
    if (!session?.id) return;
    try {
      const result = await activeSessionQuery.refetch();
      if (result.data) setSessionState(result.data);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : t('xrayFailedRefreshStatus'));
    }
  };

  const resetCapture = () => {
    setStep('idle');
    setSessionState(null);
    setPreviewUrl(null);
    setOriginalUrl(null);
    setIsFullResOpen(false);
    setZoom(1);
    setError('');
  };

  const errorMessage = error || (activeSessionQuery.error instanceof Error ? activeSessionQuery.error.message : '');

  return (
    <AdminLayout>
      <div className="space-y-6">
        {errorMessage && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {/* ── IDLE: кнопка "Зробити знімок" ── */}
        {step === 'idle' && (
          <section className="flex min-h-[60vh] flex-col items-center justify-center gap-6 rounded-[28px] border border-border/70 bg-card p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-semibold">{t('xrayStartCapture')}</h1>
              <p className="text-sm text-muted-foreground max-w-sm">{t('xrayWaitingDescription')}</p>
            </div>
            <Button
              onClick={startCapture}
              disabled={isStarting}
              size="lg"
              className="h-14 rounded-2xl px-8 text-base gap-2"
            >
              {isStarting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              {t('xrayStartCapture')}
            </Button>
          </section>
        )}

        {/* ── CAPTURE: очікування знімка від агента ── */}
        {step === 'capture' && session && !session.xray && (
          <section className="flex min-h-[60vh] sm:min-h-[72vh] flex-col justify-between rounded-[28px] border border-amber-500/20 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.98))] p-4 sm:p-6 md:p-8">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-amber-700">{t('xrayWaitingEyebrow')}</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-semibold">{t('xrayWaitingTitle')}</h2>
              <p className="mt-2 sm:mt-3 max-w-2xl text-xs sm:text-sm text-muted-foreground">
                {t('xrayWaitingDescription')}
              </p>
            </div>

            <div className="grid gap-3 sm:gap-4 rounded-[20px] sm:rounded-[24px] border border-border/70 bg-background/90 p-4 sm:p-5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t('xrayStatusLabel')}
                </p>
                <div className="mt-1 sm:mt-2 inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-amber-500/12 px-2 sm:px-3 py-1 text-xs sm:text-sm text-amber-700">
                  <LoaderCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  {t('xrayPollingStatus')}
                </div>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t('xrayCaptureType')}
                </p>
                <p className="mt-1 sm:mt-2 text-sm font-medium">
                  {session.captureType === 'scanner' ? t('xrayCaptureTypeScanner') : t('xrayCaptureTypeTwin')}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
              <Button variant="outline" onClick={resetCapture} className="w-full sm:w-auto">
                {t('cancel')}
              </Button>
              <Button variant="outline" onClick={refreshCapture} className="w-full sm:w-auto">
                <RefreshCw className={`mr-2 h-4 w-4 ${activeSessionQuery.isFetching ? 'animate-spin' : ''}`} />
                {t('xrayRefreshNow')}
              </Button>
            </div>
          </section>
        )}

        {/* ── RESULT: знімок отримано ── */}
        {step === 'capture' && session?.xray && (
          <section className="space-y-4 sm:space-y-5 rounded-[28px] border border-border/70 bg-card p-4 sm:p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">{t('xrayResultEyebrow')}</p>
                <h2 className="mt-2 text-xl sm:text-2xl font-semibold">{t('xrayResultTitle')}</h2>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">{t('xrayResultDescription')}</p>
              </div>
              {session.patientName && session.patientName !== '—' && (
                <div className="rounded-[16px] sm:rounded-[20px] border border-border/70 bg-muted/30 px-3 sm:px-4 py-2 sm:py-3 shrink-0">
                  <p className="text-xs sm:text-sm font-medium truncate">{session.patientName}</p>
                  {session.toothId > 0 && (
                    <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-muted-foreground">
                      {t('xrayToothLabel')} FDI {session.toothId}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
              <label className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="shrink-0">{t('xrayZoom')}</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-28 sm:w-40"
                />
                <span className="w-8 sm:w-10 text-right text-muted-foreground">{zoom.toFixed(1)}x</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/dental-charts')}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  {t('xrayGoToDentalCharts')}
                </Button>
                <Button variant="outline" onClick={resetCapture} className="w-full sm:w-auto text-xs sm:text-sm">
                  {t('xrayNewCapture')}
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] sm:rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.01))]">
              <button
                type="button"
                onClick={() => setIsFullResOpen(true)}
                className="flex min-h-[50vh] sm:min-h-[68vh] w-full items-center justify-center overflow-auto p-3 sm:p-6"
              >
                {isImageLoading || !previewUrl ? (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <LoaderCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                    {t('xrayPreviewLoading')}
                  </div>
                ) : (
                  <img
                    src={previewUrl}
                    alt={`Preview tooth ${session.toothId}`}
                    className="max-w-none rounded-xl sm:rounded-2xl shadow-[0_24px_60px_rgba(15,23,42,0.18)] transition-transform"
                    style={{ transform: `scale(${zoom})` }}
                  />
                )}
              </button>
            </div>
          </section>
        )}
      </div>

      <Dialog open={isFullResOpen} onOpenChange={setIsFullResOpen}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t('xrayOriginalTitle')}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded-2xl border border-border/70 bg-muted/20 p-4">
            {originalUrl ? (
              <img
                src={originalUrl}
                alt={session ? `Original tooth ${session.toothId}` : 'Original xray'}
                className="max-w-none rounded-2xl"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
              />
            ) : (
              <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
                {t('xrayOriginalLoading')}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
