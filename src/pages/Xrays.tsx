import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, LoaderCircle, RefreshCw } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { XrayViewer } from '@/components/XrayViewer';
import { useActiveXraySession, useStartXraySession } from '@/hooks/use-xray';
import { useSystemDoctors } from '@/hooks/use-doctors';
import { useSearchPatients } from '@/hooks/use-patients';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import type { ApiPatient, ApiXraySession } from '@/types/api';

type Step = 'patient' | 'tooth' | 'capture';

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export default function Xrays() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [step, setStep] = useState<Step>('patient');
  const [sessionState, setSessionState] = useState<ApiXraySession | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  // Крок 1 — пацієнт
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<ApiPatient | null>(null);

  // Крок 2 — зуб, пристрій, лікар
  const [selectedTooth, setSelectedTooth] = useState<number>(0);
  const [captureType, setCaptureType] = useState<'rvg' | 'scanner'>('rvg');
  const [doctorId, setDoctorId] = useState<string>('');

  // Blob URLs для viewer
  const [viewerFiles, setViewerFiles] = useState<{ id: string; url: string; label?: string }[]>([]);
  const blobUrlsRef = useRef<string[]>([]);

  const doctorsQuery = useSystemDoctors();
  const doctors = doctorsQuery.data ?? [];
  const searchPatientsMutation = useSearchPatients();

  const startXraySessionMutation = useStartXraySession();
  const activeSessionQuery = useActiveXraySession(
    sessionState?.id,
    step === 'capture' && Boolean(sessionState?.id) && sessionState?.status !== 'completed',
  );

  const session = activeSessionQuery.data ?? sessionState;
  const sessionXray = session?.xray ?? null;

  useEffect(() => {
    if (activeSessionQuery.data) setSessionState(activeSessionQuery.data);
  }, [activeSessionQuery.data]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  // Завантажуємо знімки у viewer коли з'явились
  useEffect(() => {
    if (!token || !sessionXray) return;
    let cancelled = false;

    void (async () => {
      setIsImageLoading(true);
      try {
        // Завантажуємо обидва — original i preview
        const [originalBlob, previewBlob] = await Promise.all([
          api.getProtectedImageBlob(token, sessionXray.originalUrl),
          api.getProtectedImageBlob(token, sessionXray.previewUrl),
        ]);
        if (cancelled) return;

        const origUrl = URL.createObjectURL(originalBlob);
        const prevUrl = URL.createObjectURL(previewBlob);
        blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
        blobUrlsRef.current = [origUrl, prevUrl];

        const tooth = session?.toothId ?? 0;
        setViewerFiles([
          {
            id: `orig-${sessionXray.id}`,
            url: sessionXray.originalUrl,
            label: `Оригінал${tooth > 0 ? ` — FDI ${tooth}` : ''}`,
          },
          {
            id: `prev-${sessionXray.id}`,
            url: sessionXray.previewUrl,
            label: `Preview${tooth > 0 ? ` — FDI ${tooth}` : ''}`,
          },
        ]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('xrayFailedLoadImage'));
      } finally {
        if (!cancelled) setIsImageLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionXray, t, token, session?.toothId]);

  // Пошук пацієнтів
  const handleSearch = async () => {
    if (!token || !searchQuery.trim()) return;
    setError('');
    await searchPatientsMutation.mutateAsync({ query: searchQuery.trim(), token });
  };

  // Старт сесії
  const startCapture = async () => {
    if (!selectedPatient || !selectedTooth) return;
    setError('');
    setViewerFiles([]);
    setIsStarting(true);
    try {
      const patientName = [selectedPatient.last_name, selectedPatient.first_name, selectedPatient.middle_name]
        .filter(Boolean)
        .join(' ');

      const nextSession = await startXraySessionMutation.mutateAsync({
        patientId: selectedPatient.id,
        toothId: selectedTooth,
        captureType: captureType as 'twin' | 'scanner',
        patientName,
        doctorId: doctorId || undefined,
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
    setStep('patient');
    setSessionState(null);
    setViewerFiles([]);
    setIsViewerOpen(false);
    setSelectedPatient(null);
    setSelectedTooth(0);
    setSearchQuery('');
    setError('');
    setCaptureType('rvg');
  };

  const patients = searchPatientsMutation.data ?? [];
  const errorMessage = error || (activeSessionQuery.error instanceof Error ? activeSessionQuery.error.message : '');

  return (
    <AdminLayout>
      <div className="space-y-5">
        {errorMessage && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {/* ── КРОК 1: вибір пацієнта ── */}
        {step === 'patient' && (
          <section className="rounded-[28px] border border-border/70 bg-card p-6 shadow-sm space-y-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Крок 1 / 2</p>
              <h2 className="mt-1 text-2xl font-semibold">Оберіть пацієнта</h2>
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Прізвище або ім'я..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searchPatientsMutation.isPending} className="rounded-xl">
                {searchPatientsMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-sm">Пошук</span>
                )}
              </Button>
            </div>
            {patients.length > 0 && (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {patients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(p);
                      setStep('tooth');
                    }}
                    className="w-full text-left rounded-xl border border-border/60 bg-muted/20 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium">
                      {p.last_name} {p.first_name} {p.middle_name ?? ''}
                    </p>
                    {p.date_of_birth && <p className="text-xs text-muted-foreground mt-0.5">{p.date_of_birth}</p>}
                  </button>
                ))}
              </div>
            )}
            {searchPatientsMutation.isSuccess && patients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Пацієнтів не знайдено</p>
            )}
          </section>
        )}

        {/* ── КРОК 2: зуб, пристрій, лікар ── */}
        {step === 'tooth' && selectedPatient && (
          <section className="rounded-[28px] border border-border/70 bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Крок 2 / 2</p>
                <h2 className="mt-1 text-2xl font-semibold">Налаштуйте знімок</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {selectedPatient.last_name} {selectedPatient.first_name}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep('patient')}>
                ← Змінити пацієнта
              </Button>
            </div>

            {/* Лікар */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Лікар</p>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Оберіть лікаря" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name ?? d.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Схема зубів */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground text-center">Верхня щелепа</p>
              <div className="flex justify-center gap-1 flex-wrap">
                {UPPER_TEETH.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSelectedTooth(n)}
                    className={`w-9 h-9 rounded-lg text-xs font-mono font-medium border transition-colors
                      ${
                        selectedTooth === n
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border bg-muted/30 hover:bg-muted/60 text-muted-foreground'
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="border-t border-dashed border-border/60" />
              <div className="flex justify-center gap-1 flex-wrap">
                {LOWER_TEETH.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSelectedTooth(n)}
                    className={`w-9 h-9 rounded-lg text-xs font-mono font-medium border transition-colors
                      ${
                        selectedTooth === n
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border bg-muted/30 hover:bg-muted/60 text-muted-foreground'
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs font-medium text-muted-foreground text-center">Нижня щелепа</p>
            </div>

            {selectedTooth > 0 && (
              <p className="text-center text-sm font-medium text-primary">Вибрано: FDI {selectedTooth}</p>
            )}

            {/* Пристрій */}
            <div className="flex gap-2">
              {(['rvg', 'scanner'] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCaptureType(val)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors
                    ${
                      captureType === val
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                    }`}
                >
                  {val === 'rvg' ? 'RVG 5100 (TWIN)' : 'VistaScan (Сканер)'}
                </button>
              ))}
            </div>

            <Button
              onClick={startCapture}
              disabled={!selectedTooth || !doctorId || isStarting}
              className="w-full h-12 rounded-2xl text-base gap-2"
            >
              {isStarting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              {t('xrayStartCapture')}
            </Button>
          </section>
        )}

        {/* ── CAPTURE: очікування ── */}
        {step === 'capture' && session && !session.xray && (
          <section className="flex min-h-[60vh] sm:min-h-[72vh] flex-col justify-between rounded-[28px] border border-amber-500/20 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.98))] p-5 sm:p-8">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-amber-700">{t('xrayWaitingEyebrow')}</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-semibold">{t('xrayWaitingTitle')}</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-lg">{t('xrayWaitingDescription')}</p>
            </div>
            <div className="grid sm:grid-cols-4 gap-3 rounded-2xl border border-border/70 bg-background/90 p-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t('xrayPatientLabel')}</p>
                <p className="mt-1 text-sm font-medium truncate">{session.patientName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t('xrayToothLabel')}</p>
                <p className="mt-1 text-sm font-medium">{session.toothId > 0 ? `FDI ${session.toothId}` : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t('xrayCaptureType')}</p>
                <p className="mt-1 text-sm font-medium">
                  {session.captureType === 'scanner' ? t('xrayCaptureTypeScanner') : t('xrayCaptureTypeTwin')}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t('xrayStatusLabel')}</p>
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-500/12 px-2 py-1 text-xs text-amber-700">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  {t('xrayPollingStatus')}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={resetCapture} className="flex-1">
                {t('cancel')}
              </Button>
              <Button variant="outline" onClick={refreshCapture} className="flex-1">
                <RefreshCw className={`mr-2 h-4 w-4 ${activeSessionQuery.isFetching ? 'animate-spin' : ''}`} />
                {t('xrayRefreshNow')}
              </Button>
            </div>
          </section>
        )}

        {/* ── RESULT: знімок отримано ── */}
        {step === 'capture' && session?.xray && (
          <section className="space-y-4 rounded-[28px] border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">{t('xrayResultEyebrow')}</p>
                <h2 className="mt-1 text-2xl font-semibold">{t('xrayResultTitle')}</h2>
              </div>
              <div className="rounded-[16px] border border-border/70 bg-muted/30 px-4 py-3 shrink-0">
                <p className="text-sm font-medium">{session.patientName}</p>
                {session.toothId > 0 && <p className="text-xs text-muted-foreground mt-0.5">FDI {session.toothId}</p>}
              </div>
            </div>

            {/* Мініатюра — клік відкриває fullscreen */}
            <button
              type="button"
              onClick={() => setIsViewerOpen(true)}
              className="group relative w-full overflow-hidden rounded-[24px] border border-border/70 bg-black"
              style={{ minHeight: '60vh' }}
              title="Натисніть для перегляду на весь екран"
            >
              {isImageLoading || viewerFiles.length === 0 ? (
                <div className="flex h-full min-h-[60vh] items-center justify-center gap-2 text-sm text-white/50">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  {t('xrayPreviewLoading')}
                </div>
              ) : (
                <>
                  {/* Відображаємо preview як мініатюру */}
                  <XrayViewerThumb url={session.xray.previewUrl} token={token!} alt={`Прев'ю FDI ${session.toothId}`} />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                    <span className="rounded-2xl bg-black/60 px-5 py-2.5 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                      Збільшити — повний екран
                    </span>
                  </div>
                </>
              )}
            </button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/dental-charts')} className="flex-1 text-sm">
                {t('xrayGoToDentalCharts')}
              </Button>
              <Button variant="outline" onClick={resetCapture} className="flex-1 text-sm">
                {t('xrayNewCapture')}
              </Button>
            </div>
          </section>
        )}
      </div>

      {/* Fullscreen viewer */}
      {isViewerOpen && viewerFiles.length > 0 && (
        <XrayViewer files={viewerFiles} initialIndex={0} onClose={() => setIsViewerOpen(false)} />
      )}
    </AdminLayout>
  );
}

/** Мініатюрна preview для картки результату */
function XrayViewerThumb({ url, token, alt }: { url: string; token: string; alt: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    void api
      .getProtectedImageBlob(token, url)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, token]);

  if (!blobUrl) return null;
  return (
    <img src={blobUrl} alt={alt} draggable={false} className="w-full object-contain" style={{ maxHeight: '70vh' }} />
  );
}
