import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api, apiCall } from '@/lib/api';
import { getAdminToken } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { Doctor } from '@/types/dental';
import { ArrowLeft, Camera, LoaderCircle, RefreshCw, Search, UserPlus, ZoomIn } from 'lucide-react';

type PatientSummary = { id: number; firstName: string; lastName: string; middleName?: string; phone?: string; doctorId?: string };
type XraySession = {
  id: number; patientId: number; patientName: string; toothId: number; status: 'waiting' | 'completed';
  createdAt: string; updatedAt: string; completedAt: string | null;
  xray: null | { id: number; previewUrl: string; originalUrl: string; previewContentType: string; originalContentType: string };
};
type Step = 'patient' | 'tooth' | 'capture';
type PatientDraft = { firstName: string; lastName: string; middleName: string; phone: string };
type PatientFormPayload = {
  firstName: string; lastName: string; middleName?: string; phone: string; dateOfBirth: string; doctorId: string; gender?: 'male' | 'female';
};

const DEFAULT_DOCTOR_NAME = 'Верховський Олександр';
const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const TOOTH_IMAGE_MAP: Record<number, { imageNumber: number; mirrored: boolean }> = {18:{imageNumber:1,mirrored:false},17:{imageNumber:2,mirrored:false},16:{imageNumber:3,mirrored:false},15:{imageNumber:4,mirrored:false},14:{imageNumber:5,mirrored:false},13:{imageNumber:6,mirrored:false},12:{imageNumber:7,mirrored:false},11:{imageNumber:8,mirrored:false},21:{imageNumber:8,mirrored:true},22:{imageNumber:7,mirrored:true},23:{imageNumber:6,mirrored:true},24:{imageNumber:5,mirrored:true},25:{imageNumber:4,mirrored:true},26:{imageNumber:3,mirrored:true},27:{imageNumber:2,mirrored:true},28:{imageNumber:1,mirrored:true},48:{imageNumber:24,mirrored:false},47:{imageNumber:23,mirrored:false},46:{imageNumber:22,mirrored:false},45:{imageNumber:22,mirrored:false},44:{imageNumber:21,mirrored:false},43:{imageNumber:20,mirrored:false},42:{imageNumber:19,mirrored:false},41:{imageNumber:18,mirrored:false},31:{imageNumber:18,mirrored:true},32:{imageNumber:19,mirrored:true},33:{imageNumber:20,mirrored:true},34:{imageNumber:21,mirrored:true},35:{imageNumber:22,mirrored:true},36:{imageNumber:22,mirrored:true},37:{imageNumber:23,mirrored:true},38:{imageNumber:24,mirrored:true}};

const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('380') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+38${digits}`;
  if (digits.length === 9) return `+380${digits}`;
  return phone;
};
const formatPatientName = (patient: PatientSummary | null) => [patient?.lastName, patient?.firstName, patient?.middleName].filter(Boolean).join(' ').trim();
const findDefaultDoctor = (doctors: Doctor[]) => doctors.find((d) => d.name.trim().toLowerCase() === DEFAULT_DOCTOR_NAME.toLowerCase()) ?? doctors[0] ?? null;
const buildDraft = (lastName: string, firstName: string, phone: string): PatientDraft => ({ lastName: lastName.trim(), firstName: firstName.trim(), middleName: '', phone: normalizePhone(phone.trim()) });
const mergePatients = (items: any[]) => {
  const unique = new Map<number, PatientSummary>();
  items.forEach((item) => {
    const id = Number(item.id);
    if (!id || unique.has(id)) return;
    unique.set(id, { id, firstName: item.first_name ?? item.firstName ?? '', lastName: item.last_name ?? item.lastName ?? '', middleName: item.middle_name ?? item.middleName ?? '', phone: item.phone ?? '', doctorId: String(item.primary_doctor_user_id ?? item.doctorId ?? '') });
  });
  return Array.from(unique.values());
};

function ToothButton({ tooth, selected, isUpper, onClick }: { tooth: number; selected: boolean; isUpper: boolean; onClick: () => void }) {
  const mapped = TOOTH_IMAGE_MAP[tooth];
  return (
    <button type="button" onClick={onClick} className={cn('flex min-w-0 flex-col items-center rounded-[18px] border px-1 py-2 transition-all', selected ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_10px_24px_rgba(16,185,129,0.18)]' : 'border-border/60 bg-background hover:border-emerald-400/50 hover:bg-muted/30')}>
      {isUpper && <span className="mb-1 text-[11px] font-medium text-muted-foreground">{tooth}</span>}
      <img src={`/teeth/${mapped?.imageNumber ?? (isUpper ? 8 : 18)}.png`} alt={`Tooth ${tooth}`} className={cn('h-[64px] w-[28px] object-contain sm:h-[70px] sm:w-[30px]', mapped?.mirrored && '-scale-x-100')} />
      {!isUpper && <span className="mt-1 text-[11px] font-medium text-muted-foreground">{tooth}</span>}
    </button>
  );
}

function PatientModal({ open, onOpenChange, doctors, defaultDoctorId, draft, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; doctors: Doctor[]; defaultDoctorId: string; draft: PatientDraft; onSubmit: (payload: PatientFormPayload) => Promise<void> }) {
  const [firstName, setFirstName] = useState(''); const [lastName, setLastName] = useState(''); const [middleName, setMiddleName] = useState('');
  const [phone, setPhone] = useState(''); const [dateOfBirth, setDateOfBirth] = useState(''); const [gender, setGender] = useState(''); const [doctorId, setDoctorId] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { if (!open) return; setFirstName(draft.firstName); setLastName(draft.lastName); setMiddleName(draft.middleName); setPhone(draft.phone); setDateOfBirth(''); setGender(''); setDoctorId(defaultDoctorId); }, [open, draft, defaultDoctorId]);
  const handleSubmit = async (event: React.FormEvent) => { event.preventDefault(); if (!firstName.trim() || !lastName.trim() || !phone.trim() || !doctorId) return; setSaving(true); try { await onSubmit({ firstName: firstName.trim(), lastName: lastName.trim(), middleName: middleName.trim() || undefined, phone: normalizePhone(phone.trim()), dateOfBirth, doctorId, gender: (gender || undefined) as 'male' | 'female' | undefined }); onOpenChange(false); } finally { setSaving(false); } };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Створити пацієнта</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="patient-last-name">Прізвище</Label><Input id="patient-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="patient-first-name">Ім'я</Label><Input id="patient-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div></div>
          <div className="grid grid-cols-[1fr_130px] gap-4"><div className="space-y-2"><Label htmlFor="patient-middle-name">По батькові</Label><Input id="patient-middle-name" value={middleName} onChange={(e) => setMiddleName(e.target.value)} /></div><div className="space-y-2"><Label>Стать</Label><Select value={gender} onValueChange={setGender}><SelectTrigger><SelectValue placeholder="Не вказано" /></SelectTrigger><SelectContent><SelectItem value="male">Чоловіча</SelectItem><SelectItem value="female">Жіноча</SelectItem></SelectContent></Select></div></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="patient-phone">Телефон</Label><Input id="patient-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="patient-date">Дата народження</Label><Input id="patient-date" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} /></div></div>
          <div className="space-y-2"><Label>Лікар</Label><Select value={doctorId} onValueChange={setDoctorId}><SelectTrigger><SelectValue placeholder="Оберіть лікаря" /></SelectTrigger><SelectContent>{doctors.map((doctor) => <SelectItem key={doctor.id} value={doctor.id}>{doctor.name}</SelectItem>)}</SelectContent></Select></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Скасувати</Button><Button type="submit" disabled={saving || !doctorId}>{saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}Зберегти пацієнта</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Xrays() {
  const navigate = useNavigate(); const token = getAdminToken();
  const [step, setStep] = useState<Step>('patient'); const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [lastName, setLastName] = useState(''); const [firstName, setFirstName] = useState(''); const [phone, setPhone] = useState('');
  const [matches, setMatches] = useState<PatientSummary[]>([]); const [hasSearched, setHasSearched] = useState(false); const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null); const [selectedTooth, setSelectedTooth] = useState<number | null>(null); const [session, setSession] = useState<XraySession | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); const [originalUrl, setOriginalUrl] = useState<string | null>(null); const [isStarting, setIsStarting] = useState(false); const [isImageLoading, setIsImageLoading] = useState(false); const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [error, setError] = useState(''); const [zoom, setZoom] = useState(1); const [isFullResOpen, setIsFullResOpen] = useState(false);
  const defaultDoctor = useMemo(() => findDefaultDoctor(doctors), [doctors]); const draft = useMemo(() => buildDraft(lastName, firstName, phone), [lastName, firstName, phone]);
  const canCreate = hasSearched && matches.length === 0 && lastName.trim().length > 0 && firstName.trim().length > 0 && phone.trim().length > 0;

  useEffect(() => { if (!token) return; void api.getSystemDoctors(token).then((data) => setDoctors(Array.isArray(data) ? data.map((doctor) => ({ id: String(doctor.id ?? ''), name: doctor.name ?? doctor.fullName ?? '', specialty: doctor.specialty ?? 'Лікар' })) : [])).catch((e) => setError(e instanceof Error ? e.message : 'Не вдалося завантажити лікарів')); }, [token]);
  useEffect(() => { setHasSearched(false); setMatches([]); }, [lastName, firstName, phone]);
  useEffect(() => {
    if (!token || !session?.id || step !== 'capture' || session.status === 'completed') return;
    const id = window.setInterval(async () => { try { const next = await api.getActiveXraySession(token, session.id); if (next) setSession(next); } catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося оновити статус'); } }, 3000);
    return () => window.clearInterval(id);
  }, [token, session?.id, session?.status, step]);
  useEffect(() => {
    if (!token || !session?.xray) return;
    let cancelled = false; let previewObjectUrl: string | null = null; let originalObjectUrl: string | null = null;
    void (async () => {
      setIsImageLoading(true);
      try {
        const [previewBlob, originalBlob] = await Promise.all([api.getProtectedImageBlob(token, session.xray!.previewUrl), api.getProtectedImageBlob(token, session.xray!.originalUrl)]);
        if (cancelled) return;
        previewObjectUrl = URL.createObjectURL(previewBlob); originalObjectUrl = URL.createObjectURL(originalBlob); setPreviewUrl(previewObjectUrl); setOriginalUrl(originalObjectUrl);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Не вдалося завантажити зображення'); } finally { if (!cancelled) setIsImageLoading(false); }
    })();
    return () => { cancelled = true; if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl); if (originalObjectUrl) URL.revokeObjectURL(originalObjectUrl); };
  }, [token, session?.xray?.id]);

  const runSearch = async () => {
    if (!token) return;
    const queries = [[lastName.trim(), firstName.trim()].filter(Boolean).join(' '), normalizePhone(phone.trim())].filter(Boolean);
    if (!queries.length) { setHasSearched(false); setMatches([]); return; }
    setIsSearching(true);
    try { const results = await Promise.all(queries.map((query) => api.getPatients(token, query))); setMatches(mergePatients(results.flat())); setHasSearched(true); } catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося знайти пацієнтів'); } finally { setIsSearching(false); }
  };
  const pickPatient = (patient: PatientSummary) => { setSelectedPatient(patient); setSelectedTooth(null); setStep('tooth'); };
  const createPatient = async (payload: PatientFormPayload) => {
    if (!token) return;
    try {
      const created = await apiCall<any>('/api/patients', { method: 'POST', body: JSON.stringify({ ...payload, middleName: payload.middleName ?? null, gender: payload.gender ?? null }) }, token);
      pickPatient({ id: Number(created.id), firstName: created.first_name ?? created.firstName ?? '', lastName: created.last_name ?? created.lastName ?? '', middleName: created.middle_name ?? created.middleName ?? '', phone: created.phone ?? '', doctorId: String(created.primary_doctor_user_id ?? payload.doctorId) });
    } catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося створити пацієнта'); throw e; }
  };
  const startCapture = async () => {
    if (!token || !selectedPatient || !selectedTooth) return;
    setError(''); setPreviewUrl(null); setOriginalUrl(null); setZoom(1); setIsStarting(true);
    try { const nextSession = await api.startXraySession(token, { patientId: selectedPatient.id, toothId: selectedTooth }); setSession(nextSession); setStep('capture'); } catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося створити сесію'); } finally { setIsStarting(false); }
  };
  const refreshCapture = async () => { if (!token || !session?.id) return; try { const nextSession = await api.getActiveXraySession(token, session.id); if (nextSession) setSession(nextSession); } catch (e) { setError(e instanceof Error ? e.message : 'Не вдалося оновити статус'); } };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {error && <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

        {step === 'patient' && (
          <section className="mx-auto max-w-3xl rounded-[28px] border border-border/70 bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
            <div className="space-y-2"><h1 className="text-2xl font-semibold">Оберіть пацієнта</h1><p className="text-sm text-muted-foreground">Після виходу з поля прізвища або телефону система шукає збіги по всій базі і показує список нижче.</p></div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="xray-last-name">Прізвище</Label><Input id="xray-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} onBlur={() => void runSearch()} placeholder="Прізвище" /></div>
              <div className="space-y-2"><Label htmlFor="xray-first-name">Ім'я</Label><Input id="xray-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} onBlur={() => void runSearch()} placeholder="Ім'я" /></div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-2"><Label htmlFor="xray-phone">Телефон</Label><Input id="xray-phone" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => void runSearch()} placeholder="+380..." /></div>
              <div className="flex items-end"><Button variant="outline" onClick={() => void runSearch()}>{isSearching ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Знайти</Button></div>
            </div>
            <div className="mt-6 flex items-center justify-between gap-4 rounded-[24px] border border-border/60 bg-muted/20 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Створення доступне одразу. Для активації кнопки заповніть прізвище, ім'я і телефон.
              </p>
              <Button onClick={() => setIsCreatingPatient(true)} disabled={!canCreate}>
                <UserPlus className="mr-2 h-4 w-4" />
                Створити
              </Button>
            </div>

            {hasSearched && (
              <div className="mt-4 rounded-[24px] border border-border/60 bg-muted/20 p-3">
                <p className="mb-3 text-sm font-medium">{matches.length > 0 ? 'Знайдені пацієнти' : 'Збігів не знайдено'}</p>
                {matches.length > 0 ? (
                  <ScrollArea className="h-[260px]"><div className="space-y-2 pr-2">{matches.map((patient) => <button key={patient.id} type="button" onClick={() => pickPatient(patient)} className="w-full rounded-[18px] border border-transparent bg-background px-4 py-3 text-left transition-colors hover:border-border hover:bg-muted/40"><p className="font-medium">{formatPatientName(patient)}</p><p className="mt-1 text-xs text-muted-foreground">{patient.phone || 'Телефон не вказано'}</p></button>)}</div></ScrollArea>
                ) : (
                  <div className="rounded-[18px] bg-background px-4 py-5 text-sm text-muted-foreground">
                    Збігів не знайдено. Можна створити нового пацієнта кнопкою вище.
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {step === 'tooth' && (
          <section className="space-y-5 rounded-[28px] border border-border/70 bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">Пацієнт</p><h1 className="text-2xl font-semibold">{formatPatientName(selectedPatient)}</h1><p className="mt-2 text-sm text-muted-foreground">Оберіть зуб, до якого прив’яжеться знімок.</p></div><Button variant="outline" onClick={() => setStep('patient')}><ArrowLeft className="mr-2 h-4 w-4" />Назад</Button></div>
            <div className="rounded-[24px] border border-border/60 bg-background p-4 sm:p-5">
              <p className="mb-3 text-sm font-semibold">Верхня щелепа</p>
              <div className="overflow-x-auto">
                <div className="flex min-w-[720px] justify-between gap-2">
                  {UPPER_TEETH.map((tooth) => (
                    <ToothButton key={tooth} tooth={tooth} isUpper selected={selectedTooth === tooth} onClick={() => setSelectedTooth(tooth)} />
                  ))}
                </div>
              </div>
              <p className="mb-3 mt-6 text-sm font-semibold">Нижня щелепа</p>
              <div className="overflow-x-auto">
                <div className="flex min-w-[720px] justify-between gap-2">
                  {LOWER_TEETH.map((tooth) => (
                    <ToothButton key={tooth} tooth={tooth} isUpper={false} selected={selectedTooth === tooth} onClick={() => setSelectedTooth(tooth)} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-[20px] border border-border/60 bg-muted/20 px-4 py-3"><p className="text-sm text-muted-foreground">{selectedTooth ? `Обраний зуб: FDI ${selectedTooth}` : 'Оберіть зуб для знімка'}</p><Button onClick={startCapture} disabled={!selectedTooth || isStarting} className="h-12 rounded-2xl px-6 text-base">{isStarting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}Почати знімок</Button></div>
          </section>
        )}

        {step === 'capture' && session && !session.xray && (
          <section className="flex min-h-[72vh] flex-col justify-between rounded-[28px] border border-amber-500/20 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.98))] p-6 md:p-8">
            <div><p className="text-xs uppercase tracking-[0.22em] text-amber-700">Очікування</p><h2 className="mt-2 text-3xl font-semibold">Зробіть знімок у Carestream</h2><p className="mt-3 max-w-2xl text-sm text-muted-foreground">Після появи нового файлу система автоматично прикріпить його до пацієнта, зуба і зубної карти.</p></div>
            <div className="grid gap-4 rounded-[24px] border border-border/70 bg-background/90 p-5 md:grid-cols-3"><div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Пацієнт</p><p className="mt-2 font-medium">{session.patientName}</p></div><div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Зуб</p><p className="mt-2 font-medium">FDI {session.toothId}</p></div><div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Статус</p><div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-500/12 px-3 py-1 text-sm text-amber-700"><LoaderCircle className="h-4 w-4 animate-spin" />Polling кожні 3 сек.</div></div></div>
            <div className="flex items-center justify-between gap-4"><Button variant="outline" onClick={() => setStep('tooth')}><ArrowLeft className="mr-2 h-4 w-4" />Змінити зуб</Button><Button variant="outline" onClick={refreshCapture}><RefreshCw className="mr-2 h-4 w-4" />Оновити зараз</Button></div>
          </section>
        )}

        {step === 'capture' && session?.xray && (
          <section className="space-y-5 rounded-[28px] border border-border/70 bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="text-xs uppercase tracking-[0.22em] text-emerald-700">Результат</p><h2 className="mt-2 text-2xl font-semibold">Знімок отримано</h2><p className="mt-2 text-sm text-muted-foreground">Клік по preview відкриває full resolution. Оригінал не стискався.</p></div><div className="rounded-[20px] border border-border/70 bg-muted/30 px-4 py-3"><p className="text-sm font-medium">{session.patientName}</p><p className="mt-1 text-xs text-muted-foreground">Зуб FDI {session.toothId}</p></div></div>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><label className="flex items-center gap-3 text-sm"><ZoomIn className="h-4 w-4 text-muted-foreground" />Zoom<input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-40" /><span className="w-10 text-right text-muted-foreground">{zoom.toFixed(1)}x</span></label><div className="flex gap-3"><Button variant="outline" onClick={() => navigate('/dental-charts')}>До зубних карт</Button><Button variant="outline" onClick={() => { setStep('patient'); setSession(null); setPreviewUrl(null); setOriginalUrl(null); setSelectedPatient(null); setSelectedTooth(null); setLastName(''); setFirstName(''); setPhone(''); setMatches([]); setHasSearched(false); setIsFullResOpen(false); setZoom(1); }}>Новий знімок</Button></div></div>
            <div className="overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.01))]"><button type="button" onClick={() => setIsFullResOpen(true)} className="flex min-h-[68vh] w-full items-center justify-center overflow-auto p-6">{isImageLoading || !previewUrl ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Завантаження preview...</div> : <img src={previewUrl} alt={`Preview tooth ${session.toothId}`} className="max-w-none rounded-2xl shadow-[0_24px_60px_rgba(15,23,42,0.18)] transition-transform" style={{ transform: `scale(${zoom})` }} />}</button></div>
          </section>
        )}
      </div>

      <PatientModal open={isCreatingPatient} onOpenChange={setIsCreatingPatient} doctors={doctors} defaultDoctorId={defaultDoctor?.id ?? ''} draft={draft} onSubmit={createPatient} />
      <Dialog open={isFullResOpen} onOpenChange={setIsFullResOpen}><DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden"><DialogHeader><DialogTitle>Оригінал без стискання</DialogTitle></DialogHeader><div className="overflow-auto rounded-2xl border border-border/70 bg-muted/20 p-4">{originalUrl ? <img src={originalUrl} alt={session ? `Original tooth ${session.toothId}` : 'Original xray'} className="max-w-none rounded-2xl" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }} /> : <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">Оригінал ще завантажується...</div>}</div></DialogContent></Dialog>
    </AdminLayout>
  );
}
