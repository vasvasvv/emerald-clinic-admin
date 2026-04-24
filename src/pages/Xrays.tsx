import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, LoaderCircle, RefreshCw, Search, UserPlus, ZoomIn } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WheelDateTimeField } from '@/components/ui/wheel-date-time-field';
import { useSystemDoctors } from '@/hooks/use-doctors';
import { useCreatePatient, useSearchPatients } from '@/hooks/use-patients';
import { useActiveXraySession, useStartXraySession } from '@/hooks/use-xray';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { findDentalDoctorForUser } from '@/lib/admin-user';
import { useI18n } from '@/lib/i18n';
import { normalizePhone } from '@/lib/patient-utils';
import { cn } from '@/lib/utils';
import type { ApiPatient, ApiPatientPayload, ApiXraySession } from '@/types/api';
import type { Doctor } from '@/types/dental';

type PatientSummary = {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone?: string;
  doctorId?: string;
};

type Step = 'patient' | 'tooth' | 'capture';

type PatientDraft = {
  firstName: string;
  lastName: string;
  middleName: string;
  phone: string;
};

type PatientFormPayload = {
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  dateOfBirth: string;
  doctorId: string;
  gender?: 'male' | 'female';
};

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const TOOTH_IMAGE_MAP: Record<number, { imageNumber: number; mirrored: boolean }> = {
  18: { imageNumber: 1, mirrored: false },
  17: { imageNumber: 2, mirrored: false },
  16: { imageNumber: 3, mirrored: false },
  15: { imageNumber: 4, mirrored: false },
  14: { imageNumber: 5, mirrored: false },
  13: { imageNumber: 6, mirrored: false },
  12: { imageNumber: 7, mirrored: false },
  11: { imageNumber: 8, mirrored: false },
  21: { imageNumber: 8, mirrored: true },
  22: { imageNumber: 7, mirrored: true },
  23: { imageNumber: 6, mirrored: true },
  24: { imageNumber: 5, mirrored: true },
  25: { imageNumber: 4, mirrored: true },
  26: { imageNumber: 3, mirrored: true },
  27: { imageNumber: 2, mirrored: true },
  28: { imageNumber: 1, mirrored: true },
  48: { imageNumber: 24, mirrored: false },
  47: { imageNumber: 23, mirrored: false },
  46: { imageNumber: 22, mirrored: false },
  45: { imageNumber: 22, mirrored: false },
  44: { imageNumber: 21, mirrored: false },
  43: { imageNumber: 20, mirrored: false },
  42: { imageNumber: 19, mirrored: false },
  41: { imageNumber: 18, mirrored: false },
  31: { imageNumber: 18, mirrored: true },
  32: { imageNumber: 19, mirrored: true },
  33: { imageNumber: 20, mirrored: true },
  34: { imageNumber: 21, mirrored: true },
  35: { imageNumber: 22, mirrored: true },
  36: { imageNumber: 22, mirrored: true },
  37: { imageNumber: 23, mirrored: true },
  38: { imageNumber: 24, mirrored: true },
};
const patientSearchCache = new Map<string, PatientSummary[]>();

const buildPatientSearchQuery = (lastName: string, firstName: string, phone: string) => {
  const tokens = [lastName.trim(), firstName.trim()].filter(Boolean);
  if (tokens.length) return tokens.join(' ');
  return phone.trim();
};

const formatPatientName = (patient: PatientSummary | null) =>
  [patient?.lastName, patient?.firstName, patient?.middleName].filter(Boolean).join(' ').trim();

const findDefaultDoctor = (doctors: Doctor[]) => doctors[0] ?? null;

const buildDraft = (lastName: string, firstName: string, phone: string): PatientDraft => ({
  lastName: lastName.trim(),
  firstName: firstName.trim(),
  middleName: '',
  phone: normalizePhone(phone) ?? phone.trim(),
});

const mergePatients = (items: ApiPatient[]) => {
  const unique = new Map<number, PatientSummary>();

  items.forEach((item) => {
    const id = Number(item.id);
    if (!id || unique.has(id)) return;
    unique.set(id, {
      id,
      firstName: item.first_name ?? item.first_name ?? '',
      lastName: item.last_name ?? item.last_name ?? '',
      middleName: item.middle_name ?? item.middle_name ?? '',
      phone: item.phone ?? '',
      doctorId: String(item.primary_doctor_user_id ?? ''),
    });
  });

  return Array.from(unique.values());
};

function ToothButton({
  tooth,
  selected,
  isUpper,
  onClick,
}: {
  tooth: number;
  selected: boolean;
  isUpper: boolean;
  onClick: () => void;
}) {
  const mapped = TOOTH_IMAGE_MAP[tooth];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-0 flex-col items-center rounded-[14px] sm:rounded-[18px] border px-0.5 sm:px-1 py-1.5 sm:py-2 transition-all',
        selected
          ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_10px_24px_rgba(16,185,129,0.18)]'
          : 'border-border/60 bg-background hover:border-emerald-400/50 hover:bg-muted/30',
      )}
    >
      {isUpper && (
        <span className="mb-0.5 sm:mb-1 text-[9px] sm:text-[11px] font-medium text-muted-foreground">{tooth}</span>
      )}
      <img
        src={`/teeth/${mapped?.imageNumber ?? (isUpper ? 8 : 18)}.png`}
        alt={`Tooth ${tooth}`}
        className={cn(
          'h-[65px] w-[28px] sm:h-[75px] sm:w-[33px] md:h-[88px] md:w-[38px] object-contain',
          mapped?.mirrored && '-scale-x-100',
        )}
      />
      {!isUpper && (
        <span className="mt-0.5 sm:mt-1 text-[9px] sm:text-[11px] font-medium text-muted-foreground">{tooth}</span>
      )}
    </button>
  );
}

function PatientModal({
  open,
  onOpenChange,
  doctors,
  defaultDoctorId,
  draft,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctors: Doctor[];
  defaultDoctorId: string;
  draft: PatientDraft;
  onSubmit: (payload: PatientFormPayload) => Promise<void>;
}) {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirstName(draft.firstName);
    setLastName(draft.lastName);
    setMiddleName(draft.middleName);
    setPhone(draft.phone);
    setDateOfBirth('');
    setGender('');
    setDoctorId(defaultDoctorId);
  }, [open, draft, defaultDoctorId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !doctorId) return;
    setSaving(true);
    try {
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim() || undefined,
        phone: normalizePhone(phone) ?? phone.trim(),
        dateOfBirth,
        doctorId,
        gender: (gender || undefined) as 'male' | 'female' | undefined,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('xrayCreatePatientTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient-last-name">{t('lastName')}</Label>
              <Input
                id="patient-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-first-name">{t('firstName')}</Label>
              <Input
                id="patient-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_130px] gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient-middle-name">{t('middleName')}</Label>
              <Input
                id="patient-middle-name"
                value={middleName}
                onChange={(event) => setMiddleName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('gender')}</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder={t('unspecified')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('male')}</SelectItem>
                  <SelectItem value="female">{t('female')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient-phone">{t('phone')}</Label>
              <Input id="patient-phone" value={phone} onChange={(event) => setPhone(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-date">{t('dateOfBirth')}</Label>
              <WheelDateTimeField
                mode="date"
                value={dateOfBirth}
                onChange={setDateOfBirth}
                placeholder={t('dateOfBirth')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('doctor')}</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger>
                <SelectValue placeholder={t('chooseDoctor')} />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={saving || !doctorId}>
              {saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              {t('savePatient')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Xrays() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [step, setStep] = useState<Step>('patient');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [matches, setMatches] = useState<PatientSummary[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [sessionState, setSessionState] = useState<ApiXraySession | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [isFullResOpen, setIsFullResOpen] = useState(false);
  const [captureType, setCaptureType] = useState<'twin' | 'scanner'>('twin');
  const systemDoctorsQuery = useSystemDoctors();
  const searchPatientsMutation = useSearchPatients();
  const createPatientMutation = useCreatePatient();
  const startXraySessionMutation = useStartXraySession();
  const activeSessionQuery = useActiveXraySession(
    sessionState?.id,
    step === 'capture' && Boolean(sessionState?.id) && sessionState?.status !== 'completed',
  );
  const doctors = useMemo<Doctor[]>(
    () =>
      Array.isArray(systemDoctorsQuery.data)
        ? systemDoctorsQuery.data.map((doctor) => ({
            id: String(doctor.id ?? ''),
            name: doctor.name ?? doctor.fullName ?? '',
            specialty: doctor.specialty ?? t('xrayNoSpecialty'),
          }))
        : [],
    [systemDoctorsQuery.data, t],
  );
  const session = activeSessionQuery.data ?? sessionState;
  const sessionXray = session?.xray ?? null;
  const defaultDoctor = useMemo(
    () => findDentalDoctorForUser(doctors, user) ?? findDefaultDoctor(doctors),
    [doctors, user],
  );
  const draft = useMemo(() => buildDraft(lastName, firstName, phone), [lastName, firstName, phone]);
  const searchAbortRef = useRef<AbortController | null>(null);
  const canCreate =
    hasSearched &&
    matches.length === 0 &&
    lastName.trim().length > 0 &&
    firstName.trim().length > 0 &&
    phone.trim().length > 0;

  useEffect(() => {
    const currentQuery = buildPatientSearchQuery(lastName, firstName, phone);
    if (currentQuery.trim()) return;
    searchAbortRef.current?.abort();
    setHasSearched(false);
    setMatches([]);
    setIsSearching(false);
  }, [lastName, firstName, phone]);

  useEffect(() => {
    if (activeSessionQuery.data) {
      setSessionState(activeSessionQuery.data);
    }
  }, [activeSessionQuery.data]);

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

  const queryError = systemDoctorsQuery.error ?? activeSessionQuery.error;
  const errorMessage = error || (queryError instanceof Error ? queryError.message : '');

  useEffect(() => () => searchAbortRef.current?.abort(), []);

  const runSearch = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setHasSearched(false);
      setMatches([]);
      return;
    }

    const cacheKey = trimmedQuery.toLowerCase();
    const cached = patientSearchCache.get(cacheKey);
    if (cached) {
      setMatches(cached);
      setHasSearched(true);
      setIsSearching(false);
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setIsSearching(true);
    setError('');

    try {
      const results = mergePatients(
        await searchPatientsMutation.mutateAsync({ query: trimmedQuery, limit: 20, signal: controller.signal }),
      );
      patientSearchCache.set(cacheKey, results);
      setMatches(results);
      setHasSearched(true);
    } catch (searchError) {
      if (searchError instanceof DOMException && searchError.name === 'AbortError') return;
      setError(searchError instanceof Error ? searchError.message : t('xrayFailedSearchPatients'));
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
      }
      setIsSearching(false);
    }
  };

  const triggerSearch = () => void runSearch(buildPatientSearchQuery(lastName, firstName, phone));

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    triggerSearch();
  };

  const pickPatient = (patient: PatientSummary) => {
    setSelectedPatient(patient);
    setSelectedTooth(null);
    setStep('tooth');
  };

  const createPatient = async (payload: PatientFormPayload) => {
    try {
      const requestBody: ApiPatientPayload = {
        ...payload,
        middleName: payload.middleName ?? null,
        gender: payload.gender ?? null,
      };

      const created = await createPatientMutation.mutateAsync(requestBody);

      pickPatient({
        id: Number(created.id),
        firstName: created.first_name ?? created.first_name ?? '',
        lastName: created.last_name ?? created.last_name ?? '',
        middleName: created.middle_name ?? created.middle_name ?? '',
        phone: created.phone ?? '',
        doctorId: String(created.primary_doctor_user_id ?? payload.doctorId),
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t('xrayFailedCreatePatient'));
      throw createError;
    }
  };

  const startCapture = async () => {
    if (!selectedPatient || !selectedTooth) return;
    setError('');
    setPreviewUrl(null);
    setOriginalUrl(null);
    setZoom(1);
    try {
      const nextSession = await startXraySessionMutation.mutateAsync({
        patientId: selectedPatient.id,
        toothId: selectedTooth,
        captureType,
      });
      setSessionState(nextSession);
      setStep('capture');
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : t('xrayFailedCreateSession'));
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
    setPreviewUrl(null);
    setOriginalUrl(null);
    setSelectedPatient(null);
    setSelectedTooth(null);
    setLastName('');
    setFirstName('');
    setPhone('');
    setMatches([]);
    setHasSearched(false);
    setIsFullResOpen(false);
    setZoom(1);
    setCaptureType('twin');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {errorMessage && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {step === 'patient' && (
          <section className="mx-auto max-w-3xl rounded-[24px] sm:rounded-[28px] border border-border/70 bg-card p-4 sm:p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
            <div className="space-y-1.5 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl font-semibold">{t('xraySelectPatientTitle')}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">{t('xraySelectPatientDescription')}</p>
            </div>

            <form onSubmit={handleSearchSubmit}>
              <div className="mt-4 sm:mt-6 grid gap-3 sm:gap-4 md:grid-cols-2">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="xray-last-name" className="text-xs sm:text-sm">
                    {t('lastName')}
                  </Label>
                  <Input
                    id="xray-last-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    onBlur={triggerSearch}
                    placeholder={t('lastName')}
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="xray-first-name" className="text-xs sm:text-sm">
                    {t('firstName')}
                  </Label>
                  <Input
                    id="xray-first-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    onBlur={triggerSearch}
                    placeholder={t('firstName')}
                    className="h-9 sm:h-10"
                  />
                </div>
              </div>

              <div className="mt-3 sm:mt-4 grid gap-3 sm:gap-4 md:grid-cols-[1fr_auto]">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="xray-phone" className="text-xs sm:text-sm">
                    {t('phone')}
                  </Label>
                  <Input
                    id="xray-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    onBlur={triggerSearch}
                    placeholder="+380..."
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" variant="outline" className="w-full md:w-auto h-9 sm:h-10">
                    {isSearching ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    {t('xraySearchButton')}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 rounded-[20px] sm:rounded-[24px] border border-border/60 bg-muted/20 px-3 sm:px-4 py-2.5 sm:py-3">
              <p className="text-xs sm:text-sm text-muted-foreground">{t('xrayCreateReadyHint')}</p>
              <Button
                onClick={() => setIsCreatingPatient(true)}
                disabled={!canCreate}
                className="w-full sm:w-auto h-9 sm:h-10"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {t('xrayCreateButton')}
              </Button>
            </div>

            {hasSearched && (
              <div className="mt-3 sm:mt-4 rounded-[20px] sm:rounded-[24px] border border-border/60 bg-muted/20 p-2.5 sm:p-3">
                <p className="mb-2 sm:mb-3 text-xs sm:text-sm font-medium">
                  {matches.length > 0 ? t('xrayMatchesFound') : t('xrayNoMatches')}
                </p>
                {matches.length > 0 ? (
                  <ScrollArea className="h-[220px] sm:h-[260px]">
                    <div className="space-y-2 pr-2">
                      {matches.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => pickPatient(patient)}
                          className="w-full rounded-[16px] sm:rounded-[18px] border border-transparent bg-background px-3 sm:px-4 py-2.5 sm:py-3 text-left transition-colors hover:border-border hover:bg-muted/40"
                        >
                          <p className="text-sm font-medium truncate">{formatPatientName(patient)}</p>
                          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-muted-foreground">
                            {patient.phone || t('xrayNoPhone')}
                          </p>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="rounded-[16px] sm:rounded-[18px] bg-background px-3 sm:px-4 py-4 sm:py-5 text-xs sm:text-sm text-muted-foreground">
                    {t('xrayNoMatchesDescription')}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {step === 'tooth' && (
          <section className="space-y-5 rounded-[28px] border border-border/70 bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">{t('xrayPatientLabel')}</p>
                <h1 className="text-xl sm:text-2xl font-semibold truncate">{formatPatientName(selectedPatient)}</h1>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                  {t('xrayChooseToothDescription')}
                </p>
              </div>
              <Button variant="outline" onClick={() => setStep('patient')} className="w-full sm:w-auto shrink-0">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('xrayBack')}
              </Button>
            </div>

            <div className="rounded-[24px] border border-border/60 bg-background p-3 sm:p-4 md:p-5">
              <p className="mb-2 text-xs sm:text-sm font-semibold">{t('xrayUpperJaw')}</p>
              <div className="overflow-x-auto -mx-3 px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0 touch-pan-x">
                <div className="flex min-w-[560px] sm:min-w-[700px] md:min-w-0 md:justify-between gap-0.5 sm:gap-2">
                  {UPPER_TEETH.map((tooth) => (
                    <ToothButton
                      key={tooth}
                      tooth={tooth}
                      isUpper
                      selected={selectedTooth === tooth}
                      onClick={() => setSelectedTooth(tooth)}
                    />
                  ))}
                </div>
              </div>

              <p className="mb-2 mt-4 sm:mt-6 text-xs sm:text-sm font-semibold">{t('xrayLowerJaw')}</p>
              <div className="overflow-x-auto -mx-3 px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0 touch-pan-x">
                <div className="flex min-w-[560px] sm:min-w-[700px] md:min-w-0 md:justify-between gap-0.5 sm:gap-2">
                  {LOWER_TEETH.map((tooth) => (
                    <ToothButton
                      key={tooth}
                      tooth={tooth}
                      isUpper={false}
                      selected={selectedTooth === tooth}
                      onClick={() => setSelectedTooth(tooth)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-[20px] border border-border/60 bg-muted/20 px-3 sm:px-4 py-3">
              <div className="flex flex-col gap-2">
                <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                  {selectedTooth ? `${t('xrayToothLabel')}: FDI ${selectedTooth}` : t('xraySelectToothPrompt')}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">{t('xrayCaptureType')}:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCaptureType('twin')}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                        captureType === 'twin'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-background border border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      TWIN
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptureType('scanner')}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                        captureType === 'scanner'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-background border border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      Scanner
                    </button>
                  </div>
                </div>
              </div>
              <Button
                onClick={startCapture}
                disabled={!selectedTooth || startXraySessionMutation.isPending}
                className="h-11 sm:h-12 rounded-2xl px-4 sm:px-6 text-sm sm:text-base w-full sm:w-auto"
              >
                {startXraySessionMutation.isPending ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                {t('xrayStartCapture')}
              </Button>
            </div>
          </section>
        )}

        {step === 'capture' && session && !session.xray && (
          <section className="flex min-h-[60vh] sm:min-h-[72vh] flex-col justify-between rounded-[28px] border border-amber-500/20 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.98))] p-4 sm:p-6 md:p-8">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-amber-700">{t('xrayWaitingEyebrow')}</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-semibold">{t('xrayWaitingTitle')}</h2>
              <p className="mt-2 sm:mt-3 max-w-2xl text-xs sm:text-sm text-muted-foreground">
                {t('xrayWaitingDescription')}
              </p>
            </div>

            <div className="grid gap-3 sm:gap-4 rounded-[20px] sm:rounded-[24px] border border-border/70 bg-background/90 p-4 sm:p-5 md:grid-cols-4">
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t('xrayPatientLabel')}
                </p>
                <p className="mt-1 sm:mt-2 text-sm font-medium truncate">{session.patientName}</p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t('xrayToothLabel')}
                </p>
                <p className="mt-1 sm:mt-2 text-sm font-medium">FDI {session.toothId}</p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t('xrayCaptureType')}
                </p>
                <p className="mt-1 sm:mt-2 text-sm font-medium">
                  {session.captureType === 'scanner' ? t('xrayCaptureTypeScanner') : t('xrayCaptureTypeTwin')}
                </p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t('xrayStatusLabel')}
                </p>
                <div className="mt-1 sm:mt-2 inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-amber-500/12 px-2 sm:px-3 py-1 text-xs sm:text-sm text-amber-700">
                  <LoaderCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  {t('xrayPollingStatus')}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
              <Button variant="outline" onClick={() => setStep('tooth')} className="w-full sm:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('xrayChangeTooth')}
              </Button>
              <Button variant="outline" onClick={refreshCapture} className="w-full sm:w-auto">
                <RefreshCw className={`mr-2 h-4 w-4 ${activeSessionQuery.isFetching ? 'animate-spin' : ''}`} />
                {t('xrayRefreshNow')}
              </Button>
            </div>
          </section>
        )}

        {step === 'capture' && session?.xray && (
          <section className="space-y-4 sm:space-y-5 rounded-[28px] border border-border/70 bg-card p-4 sm:p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">{t('xrayResultEyebrow')}</p>
                <h2 className="mt-2 text-xl sm:text-2xl font-semibold">{t('xrayResultTitle')}</h2>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">{t('xrayResultDescription')}</p>
              </div>
              <div className="rounded-[16px] sm:rounded-[20px] border border-border/70 bg-muted/30 px-3 sm:px-4 py-2 sm:py-3 shrink-0">
                <p className="text-xs sm:text-sm font-medium truncate">{session.patientName}</p>
                <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-muted-foreground">
                  {t('xrayToothLabel')} FDI {session.toothId}
                </p>
              </div>
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

      <PatientModal
        open={isCreatingPatient}
        onOpenChange={setIsCreatingPatient}
        doctors={doctors}
        defaultDoctorId={defaultDoctor?.id ?? ''}
        draft={draft}
        onSubmit={createPatient}
      />

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
