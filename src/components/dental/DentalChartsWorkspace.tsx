import { useEffect, useMemo, useRef, useState } from 'react';
import { api, apiCall } from '@/lib/api';
import { getAdminToken } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form043Editor } from '@/components/dental/Form043Editor';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ChangeHistoryEntry, Doctor, Patient, ToothRecord, User, Visit } from '@/types/dental';
import { DENTAL_TEMPLATES, LOWER_TEETH, UPPER_TEETH } from '@/types/dental';
import { uk } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  History,
  MoreVertical,
  Phone,
  Plus,
  Printer,
  Search,
  Stethoscope,
  Trash2,
  User as UserIcon,
} from 'lucide-react';

type RawVisit = Partial<Visit> & {
  visit_at?: string;
  visitDate?: string;
  visit_type?: string;
  reason?: string;
  doctor_user_id?: string | number;
  doctor_id?: string | number;
  doctor_name?: string;
};

type RawToothRecord = Partial<ToothRecord> & {
  tooth_number?: number | string;
  status?: string;
};

type RawChangeHistoryEntry = Partial<ChangeHistoryEntry> & {
  changed_at?: string;
  changed_by_user_id?: string | number;
  changed_by_name?: string;
  entity_type?: string;
};

type RawPatient = Partial<Patient> & {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  date_of_birth?: string;
  primary_doctor_user_id?: string | number;
  primary_doctor_name?: string;
  doctor_id?: string | number;
  dentalChart?: unknown[];
  visits?: unknown[];
  changeHistory?: unknown[];
  created_at?: string;
  updated_at?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeStringId(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  return '';
}

function normalizeRole(role: string | undefined): User['role'] {
  if (role === 'superuser' || role === 'superadmin') return 'super-admin';
  if (role === 'manager' || role === 'admin') return 'admin';
  return 'doctor';
}

function getStoredAdminUser(): User | null {
  const raw = localStorage.getItem('dental_admin_user');
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return {
      id: String(parsed.id ?? ''),
      username: parsed.email ?? '',
      name: parsed.fullName ?? parsed.name ?? '',
      role: normalizeRole(parsed.role),
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function canPerformAction(
  user: User | null,
  action: 'add' | 'edit' | 'delete',
  resource: 'patient' | 'dental' | 'user',
) {
  if (!user) return false;

  const permissions: Record<User['role'], Record<string, string[]>> = {
    'super-admin': {
      patient: ['add', 'edit', 'delete'],
      dental: ['add', 'edit', 'delete'],
      user: ['add', 'edit', 'delete'],
    },
    doctor: {
      patient: ['add', 'edit', 'delete'],
      dental: ['add', 'edit', 'delete'],
      user: ['add', 'edit', 'delete'],
    },
    admin: {
      patient: ['add', 'edit'],
      dental: ['add', 'edit'],
      user: [],
    },
  };

  return permissions[user.role][resource]?.includes(action) ?? false;
}

function normalizeVisit(value: unknown): Visit {
  const record = asRecord(value) as RawVisit;

  return {
    id: normalizeStringId(record.id),
    date: normalizeString(record.visit_at ?? record.visitDate ?? record.date),
    type: (record.visit_type ?? record.type) === 'past' ? 'past' : 'future',
    notes: normalizeString(record.notes ?? record.reason),
    doctorId: normalizeStringId(record.doctor_user_id ?? record.doctor_id ?? record.doctorId),
    doctorName: normalizeString(record.doctor_name ?? record.doctorName),
  };
}

function resolveToothTemplateId(value: string | undefined): string {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return '';

  const matched = DENTAL_TEMPLATES.find((item) => {
    return item.id.toLowerCase() === normalized
      || item.label.toLowerCase() === normalized
      || item.description.toLowerCase() === normalized;
  });

  return matched?.id ?? '';
}

function normalizeTooth(value: unknown): ToothRecord {
  const record = asRecord(value) as RawToothRecord;
  const description = normalizeString(record.description ?? record.status);
  const files = Array.isArray(record.files) ? record.files : [];
  const templateId = normalizeString(record.templateId) || (files.length > 0 ? 'xray' : resolveToothTemplateId(description));

  return {
    toothNumber: Number(record.toothNumber ?? record.tooth_number ?? 0),
    description,
    templateId,
    files,
    notes: normalizeString(record.notes),
    updatedAt: normalizeString(record.updatedAt) || normalizeString(record.updated_at) || new Date().toISOString(),
  };
}

function normalizeChangeHistory(value: unknown): ChangeHistoryEntry {
  const record = asRecord(value) as RawChangeHistoryEntry;

  return {
    id: normalizeStringId(record.id),
    timestamp: normalizeString(record.timestamp ?? record.changed_at),
    userId: normalizeStringId(record.userId ?? record.changed_by_user_id),
    userName: normalizeString(record.userName ?? record.changed_by_name, 'Unknown'),
    action: record.action === 'update' ? 'edit' : (record.action ?? 'edit'),
    target: (record.target ?? record.entity_type ?? 'patient') as ChangeHistoryEntry['target'],
    details: normalizeString(record.details) || `${record.entity_type ?? 'patient'}: ${record.action ?? 'edit'}`,
  };
}

function normalizePatient(value: unknown): Patient {
  const record = asRecord(value) as RawPatient;
  const hasDetailedCollections =
    Array.isArray(record.dentalChart) || Array.isArray(record.visits) || Array.isArray(record.changeHistory);

  return {
    id: normalizeStringId(record.id),
    firstName: normalizeString(record.firstName ?? record.first_name),
    lastName: normalizeString(record.lastName ?? record.last_name),
    middleName: normalizeString(record.middleName ?? record.middle_name),
    gender: record.gender ?? undefined,
    phone: normalizeString(record.phone),
    dateOfBirth: normalizeString(record.dateOfBirth ?? record.date_of_birth),
    doctorId: normalizeStringId(record.primary_doctor_user_id ?? record.doctor_id ?? record.doctorId),
    doctorName: normalizeString(record.primary_doctor_name ?? record.doctor_name ?? record.doctorName),
    dentalChart: Array.isArray(record.dentalChart) ? record.dentalChart.map(normalizeTooth) : [],
    visits: Array.isArray(record.visits) ? record.visits.map(normalizeVisit) : [],
    changeHistory: Array.isArray(record.changeHistory) ? record.changeHistory.map(normalizeChangeHistory) : [],
    createdAt: normalizeString(record.createdAt ?? record.created_at) || new Date().toISOString(),
    updatedAt: normalizeString(record.updatedAt ?? record.updated_at) || new Date().toISOString(),
    detailsLoaded: hasDetailedCollections,
  };
}

function formatPhoneForSave(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('380') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+38${digits}`;
  if (digits.length === 9) return `+380${digits}`;
  return phone;
}

function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('380')) {
    return `+38 (0${digits.slice(3, 5)})-${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
  }
  return phone;
}

function formatPatientName(patient: Patient) {
  return `${patient.lastName} ${patient.firstName} ${patient.middleName ?? ''}`.trim();
}

function parseDate(value: string) {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatVisitDate(value: string) {
  const parsed = parseDate(value);
  if (!parsed) return value || '—';
  return parsed.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const value = window.localStorage.getItem('dental_recent_searches');
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  });

  const updateRecentSearches = (value: string[] | ((previous: string[]) => string[])) => {
    setRecentSearches((previous) => {
      const next = typeof value === 'function' ? value(previous) : value;
      window.localStorage.setItem('dental_recent_searches', JSON.stringify(next));
      return next;
    });
  };

  return [recentSearches, updateRecentSearches] as const;
}

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  selectedDoctorId: string;
  patient?: Patient | null;
  onSubmit: (payload: {
    firstName: string;
    lastName: string;
    middleName?: string;
    gender?: 'male' | 'female';
    phone: string;
    dateOfBirth: string;
    doctorId: string;
    historyDetails?: string;
  }) => Promise<void>;
}

function PatientModal({ isOpen, onClose, doctors, selectedDoctorId, patient, onSubmit }: PatientModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const isEditing = Boolean(patient);

  useEffect(() => {
    if (!isOpen) return;
    if (patient) {
      setFirstName(patient.firstName);
      setLastName(patient.lastName);
      setMiddleName(patient.middleName ?? '');
      setGender(patient.gender ?? '');
      setPhone(patient.phone);
      setDateOfBirth(patient.dateOfBirth);
      setDoctorId(patient.doctorId);
      return;
    }

    setFirstName('');
    setLastName('');
    setMiddleName('');
    setGender('');
    setPhone('');
    setDateOfBirth('');
    setDoctorId(selectedDoctorId === 'all' ? '' : selectedDoctorId);
  }, [isOpen, patient, selectedDoctorId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!doctorId) return;

    const formattedPhone = formatPhoneForSave(phone);
    let historyDetails: string | undefined;

    if (patient) {
      const changes: string[] = [];
      if (patient.firstName !== firstName) changes.push(`Ім'я: ${patient.firstName} → ${firstName}`);
      if (patient.lastName !== lastName) changes.push(`Прізвище: ${patient.lastName} → ${lastName}`);
      if ((patient.middleName ?? '') !== middleName) changes.push(`По-батькові: ${patient.middleName ?? '—'} → ${middleName || '—'}`);
      if (patient.phone !== formattedPhone) changes.push(`Телефон: ${patient.phone} → ${formattedPhone}`);
      if (patient.dateOfBirth !== dateOfBirth) changes.push('Дата народження змінена');
      if (patient.doctorId !== doctorId) changes.push('Лікар змінений');
      if ((patient.gender ?? '') !== gender) changes.push(`Стать: ${patient.gender ?? '—'} → ${gender || '—'}`);
      historyDetails = changes.length > 0 ? changes.join('; ') : undefined;
    }

    await onSubmit({
      firstName,
      lastName,
      middleName: middleName || undefined,
      gender: (gender || undefined) as 'male' | 'female' | undefined,
      phone: formattedPhone,
      dateOfBirth,
      doctorId,
      historyDetails,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEditing ? 'Редагувати пацієнта' : 'Додати нового пацієнта'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient-last-name">Прізвище</Label>
              <Input id="patient-last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-first-name">Ім'я</Label>
              <Input id="patient-first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient-middle-name">По-батькові</Label>
              <Input id="patient-middle-name" value={middleName} onChange={(event) => setMiddleName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Стать</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Ч</SelectItem>
                  <SelectItem value="female">Ж</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="patient-phone">Номер телефону</Label>
            <Input id="patient-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+380 або 0XX..." required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="patient-dob">Дата народження</Label>
            <Input id="patient-dob" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Лікар</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть лікаря" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>{doctor.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="order-2 w-full sm:order-1 sm:w-auto">
              Скасувати
            </Button>
            <Button type="submit" className="order-1 w-full sm:order-2 sm:w-auto" disabled={!doctorId}>
              {isEditing ? 'Зберегти зміни' : 'Додати пацієнта'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  selectedDoctorId: string;
  onSubmit: (payload: { date: string; type: 'past' | 'future'; notes: string; doctorId: string }) => Promise<void>;
}

function VisitModal({ isOpen, onClose, doctors, selectedDoctorId, onSubmit }: VisitModalProps) {
  const [date, setDate] = useState('');
  const [type, setType] = useState<'past' | 'future'>('future');
  const [notes, setNotes] = useState('');
  const [doctorId, setDoctorId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDate('');
    setType('future');
    setNotes('');
    setDoctorId(selectedDoctorId === 'all' ? (doctors[0]?.id ?? '') : selectedDoctorId || doctors[0]?.id || '');
  }, [isOpen, doctors, selectedDoctorId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!doctorId || !date) return;
    await onSubmit({ date, type, notes, doctorId });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Додати візит</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="visit-date">Дата</Label>
            <Input id="visit-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Тип візиту</Label>
            <RadioGroup value={type} onValueChange={(value) => setType(value as 'past' | 'future')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="future" id="future-visit" />
                <Label htmlFor="future-visit" className="cursor-pointer font-normal">Запланований</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="past" id="past-visit" />
                <Label htmlFor="past-visit" className="cursor-pointer font-normal">Завершений</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Лікар</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть лікаря" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>{doctor.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-notes">Примітки</Label>
            <Textarea id="visit-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Додайте примітки до візиту..." rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Скасувати</Button>
            <Button type="submit" disabled={!doctorId || !date}>Додати візит</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ToothModalProps {
  isOpen: boolean;
  onClose: () => void;
  toothNumber: number;
  record?: ToothRecord;
  onSave: (payload: Partial<ToothRecord>) => Promise<void>;
}

function ToothModal({ isOpen, onClose, toothNumber, record, onSave }: ToothModalProps) {
  const [templateId, setTemplateId] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [selectedXrayUrl, setSelectedXrayUrl] = useState<string | null>(null);
  const [isLoadingXrays, setIsLoadingXrays] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTemplateId(record?.templateId ?? '');
    setDescription(record?.description ?? '');
    setNotes(record?.notes ?? '');
  }, [isOpen, record, toothNumber]);

  useEffect(() => {
    if (!isOpen) return;
    const xrayFiles = (record?.files ?? []).filter((file) => file.type === 'xray' && file.data);
    if (xrayFiles.length === 0) {
      setPreviewUrls({});
      return;
    }

    const token = getAdminToken();
    if (!token) return;

    let cancelled = false;
    const createdUrls: string[] = [];

    void (async () => {
      setIsLoadingXrays(true);
      try {
        const entries = await Promise.all(
          xrayFiles.map(async (file) => {
            const blob = await api.getProtectedImageBlob(token, file.data);
            const url = URL.createObjectURL(blob);
            createdUrls.push(url);
            return [file.id, url] as const;
          }),
        );

        if (!cancelled) {
          setPreviewUrls(Object.fromEntries(entries));
        }
      } finally {
        if (!cancelled) setIsLoadingXrays(false);
      }
    })();

    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls({});
      setSelectedXrayUrl(null);
    };
  }, [isOpen, record?.files]);

  const handleTemplateChange = (value: string) => {
    if (value === '__clear__') {
      setTemplateId('');
      setDescription('');
      return;
    }

    setTemplateId(value);
    const template = DENTAL_TEMPLATES.find((item) => item.id === value);
    if (template) setDescription(template.description);
  };

  const handleSave = async () => {
    await onSave({
      toothNumber,
      templateId,
      description,
      notes,
      files: record?.files ?? [],
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  const currentTemplate = DENTAL_TEMPLATES.find((item) => item.id === templateId);
  const xrayFiles = (record?.files ?? []).filter((file) => file.type === 'xray');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{toothNumber}</span>
            Зуб №{toothNumber}
            {currentTemplate && <Badge variant="secondary" className="ml-1 text-xs">{currentTemplate.label}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Стан зуба</Label>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть стан зуба" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">— Очистити —</SelectItem>
                {DENTAL_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>{template.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Опис</Label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Детальний опис стану зуба..." />
          </div>

          <div className="space-y-2">
            <Label>Додаткові примітки</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Примітки до лікування, рекомендації..." />
          </div>

          {xrayFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Знімки</Label>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">Знімки: {xrayFiles.length}</Badge>
                  <Badge variant="outline">Стан: Знімки</Badge>
                </div>
                <div className="space-y-2">
                  {xrayFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => previewUrls[file.id] && setSelectedXrayUrl(previewUrls[file.id])}
                      className="flex w-full items-center gap-3 rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"
                    >
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-muted">
                        {previewUrls[file.id] ? (
                          <img src={previewUrls[file.id]} alt={file.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[11px] text-muted-foreground">{isLoadingXrays ? '...' : 'N/A'}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(file.uploadedAt).toLocaleString('uk-UA')}</p>
                      </div>
                      <Badge variant="outline">Перегляд</Badge>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" type="button" onClick={() => { setTemplateId(''); setDescription(''); setNotes(''); }}>
            Очистити
          </Button>
          <Button variant="outline" type="button" onClick={onClose}>Скасувати</Button>
          <Button type="button" onClick={handleSave}>Зберегти</Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={Boolean(selectedXrayUrl)} onOpenChange={(open) => !open && setSelectedXrayUrl(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Рентген-знімок зуба {toothNumber}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded-2xl border border-border/70 bg-muted/20 p-4">
            {selectedXrayUrl && <img src={selectedXrayUrl} alt={`Xray ${toothNumber}`} className="mx-auto rounded-xl" />}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
}

function HistoryModal({ isOpen, onClose, patient }: HistoryModalProps) {
  const history = [...(patient?.changeHistory ?? [])].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
  const actionIcons = {
    create: <Plus className="h-4 w-4" />,
    edit: <Edit2 className="h-4 w-4" />,
    delete: <Trash2 className="h-4 w-4" />,
  };
  const actionLabels = {
    create: 'Створення',
    edit: 'Редагування',
    delete: 'Видалення',
  };
  const targetLabels = {
    patient: 'Пацієнт',
    tooth: 'Зубна карта',
    visit: 'Візит',
  };
  const actionColors: Record<string, string> = {
    create: 'bg-green-100 text-green-800',
    edit: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Історія змін — {patient ? formatPatientName(patient) : ''}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {history.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Історія змін порожня</div>
          ) : (
            <div className="space-y-3 pr-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex gap-3 rounded-lg border bg-card p-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${actionColors[entry.action]}`}>
                    {actionIcons[entry.action]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">{actionLabels[entry.action]}</Badge>
                      <Badge variant="secondary" className="text-xs">{targetLabels[entry.target]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{entry.details}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{entry.userName}</span>
                      <span>{new Date(entry.timestamp).toLocaleString('uk-UA')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface ToothProps {
  number: number;
  isUpper: boolean;
  record?: ToothRecord;
  onClick: () => void;
  alignBottom?: boolean;
  compact?: boolean;
}

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

function getToothImage(toothNumber: number, isUpper: boolean) {
  const mapped = TOOTH_IMAGE_MAP[toothNumber];
  if (mapped) return mapped;
  return isUpper ? { imageNumber: 8, mirrored: false } : { imageNumber: 18, mirrored: false };
}

function Tooth({ number, isUpper, record, onClick, alignBottom = false, compact = false }: ToothProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasIssue = Boolean(record && (record.description || record.notes || record.files.length > 0));
  const { imageNumber, mirrored } = getToothImage(number, isUpper);
  const imagePath = `/teeth/${imageNumber}.png`;
  const canvasWidth = compact ? 62 : 48;
  const canvasHeight = compact ? 108 : 84;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvasWidth, canvasHeight);

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      context.clearRect(0, 0, canvasWidth, canvasHeight);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      const tempContext = tempCanvas.getContext('2d');
      if (!tempContext) return;

      tempContext.drawImage(image, 0, 0);
      const imageData = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
      let minX = tempCanvas.width;
      let minY = tempCanvas.height;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < tempCanvas.height; y += 1) {
        for (let x = 0; x < tempCanvas.width; x += 1) {
          const index = (y * tempCanvas.width + x) * 4;
          if (imageData[index + 3] > 0) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      if (maxX < minX || maxY < minY) {
        minX = 0;
        minY = 0;
        maxX = tempCanvas.width - 1;
        maxY = tempCanvas.height - 1;
      }

      context.save();
      if (mirrored) {
        context.translate(canvasWidth, 0);
        context.scale(-1, 1);
      }

      context.drawImage(image, minX, minY, maxX - minX + 1, maxY - minY + 1, 0, 0, canvasWidth, canvasHeight);
      context.restore();

      if (hasIssue) {
        const painted = context.getImageData(0, 0, canvasWidth, canvasHeight);
        const data = painted.data;
        for (let index = 0; index < data.length; index += 4) {
          if (data[index + 3] > 0) {
            data[index] = Math.min(255, data[index] * 0.8 + 239 * 0.2);
            data[index + 1] = Math.min(255, data[index + 1] * 0.8 + 68 * 0.2);
            data[index + 2] = Math.min(255, data[index + 2] * 0.8 + 68 * 0.2);
          }
        }
        context.putImageData(painted, 0, 0);
      }

      setIsLoaded(true);
    };

    image.src = imagePath;
  }, [canvasHeight, canvasWidth, hasIssue, imagePath, mirrored]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((event.clientX - rect.left) * scaleX);
    const y = Math.floor((event.clientY - rect.top) * scaleY);
    const pixel = context.getImageData(x, y, 1, 1).data;

    if (pixel[3] > 10) onClick();
  };

  return (
    <div
      className={cn(
        'flex flex-none flex-col items-center',
        compact ? 'w-[30px] md:w-[36px]' : 'w-[18px] md:w-[24px]',
        alignBottom ? 'justify-end' : 'justify-start',
      )}
    >
      {isUpper && <span className={cn('w-full text-center font-medium leading-none text-muted-foreground', compact ? 'text-[10px] md:text-xs' : 'text-[8px] md:text-[10px]')}>{number}</span>}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onClick={handleClick}
        className={cn(
          compact
            ? 'block h-[72px] w-[30px] flex-none cursor-pointer transition-transform duration-200 hover:scale-105 md:h-[96px] md:w-[36px]'
            : 'block h-[56px] w-[18px] flex-none cursor-pointer transition-transform duration-200 hover:scale-105 md:h-[72px] md:w-[24px]',
          !isLoaded && 'opacity-0',
        )}
        style={{ imageRendering: 'auto' }}
      />
      {!isUpper && <span className={cn('w-full text-center font-medium leading-none text-muted-foreground', compact ? 'text-[10px] md:text-xs' : 'text-[8px] md:text-[10px]')}>{number}</span>}
    </div>
  );
}

export function DentalChartsWorkspace() {
  const token = getAdminToken();
  const isMobile = useIsMobile();
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const currentUser = useMemo(() => getStoredAdminUser(), []);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('all');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [newOldFilter, setNewOldFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useRecentSearches();
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [historyPatientId, setHistoryPatientId] = useState<string | null>(null);
  const [deletingPatientId, setDeletingPatientId] = useState<string | null>(null);
  const [showForm043, setShowForm043] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isAddingVisit, setIsAddingVisit] = useState(false);
  const [deletingVisitId, setDeletingVisitId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isMobilePatientViewOpen, setIsMobilePatientViewOpen] = useState(false);

  const loadDoctors = async () => {
    if (!token) return;
    const data = await api.getSystemDoctors(token);
    const normalized = Array.isArray(data)
      ? data.map((doctor) => ({
          id: String(doctor.id ?? ''),
          name: doctor.name ?? doctor.fullName ?? '',
          specialty: doctor.specialty ?? 'Лікар',
        }))
      : [];

    setDoctors(normalized);

    if (currentUser?.role === 'doctor' && currentUser.name) {
      const matched = normalized.find((doctor) => doctor.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
      setSelectedDoctorId(matched?.id ?? normalized[0]?.id ?? 'all');
      return;
    }

    setSelectedDoctorId('all');
  };

  const loadPatients = async (query = '') => {
    if (!token) return;
    const data = await api.getPatients(token, query);
    const normalized = Array.isArray(data) ? data.map(normalizePatient) : [];
    setPatients(normalized);
    setSelectedPatientId((current) => (normalized.some((patient) => patient.id === current) ? current : normalized[0]?.id ?? ''));
  };

  const loadPatientDetails = async (patientId: string) => {
    if (!token || !patientId) return;
    const data = await apiCall(`/api/patients/${patientId}`, {}, token);
    const normalized = normalizePatient(data);
    setPatients((current) =>
      current.map((patient) => (patient.id === patientId ? { ...patient, ...normalized, detailsLoaded: true } : patient)),
    );
  };

  const refresh = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadDoctors(), loadPatients()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити dental charts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [token]);

  useEffect(() => {
    if (!selectedPatientId) return;
    const patient = patients.find((item) => item.id === selectedPatientId);
    if (!patient || patient.detailsLoaded) return;
    void loadPatientDetails(selectedPatientId).catch(() => null);
  }, [selectedPatientId, patients, token]);

  useEffect(() => {
    if (!editingPatientId) return;
    const patient = patients.find((item) => item.id === editingPatientId);
    if (!patient || patient.detailsLoaded) return;
    void loadPatientDetails(editingPatientId).catch(() => null);
  }, [editingPatientId, patients, token]);

  useEffect(() => {
    if (!historyPatientId) return;
    const patient = patients.find((item) => item.id === historyPatientId);
    if (!patient || patient.detailsLoaded) return;
    void loadPatientDetails(historyPatientId).catch(() => null);
  }, [historyPatientId, patients, token]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1279px)');
    const syncCompactLayout = () => {
      setIsCompactLayout(window.innerWidth < 1280);
    };

    syncCompactLayout();
    mediaQuery.addEventListener('change', syncCompactLayout);

    return () => mediaQuery.removeEventListener('change', syncCompactLayout);
  }, []);

  useEffect(() => {
    if (!isCompactLayout) {
      setIsMobilePatientViewOpen(false);
    }
  }, [isCompactLayout]);

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? null;
  const editingPatient = patients.find((patient) => patient.id === editingPatientId) ?? null;
  const historyPatient = patients.find((patient) => patient.id === historyPatientId) ?? null;
  const selectedToothRecord = selectedPatient?.dentalChart.find((item) => item.toothNumber === selectedTooth);

  const filteredPatients = useMemo(() => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    return patients
      .filter((patient) => (selectedDoctorId === 'all' ? true : patient.doctorId === selectedDoctorId))
      .filter((patient) => {
        if (genderFilter !== 'all' && patient.gender !== genderFilter) return false;
        if (newOldFilter === 'new' && new Date(patient.createdAt) < twoWeeksAgo) return false;
        if (newOldFilter === 'old' && new Date(patient.createdAt) >= twoWeeksAgo) return false;
        return true;
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [patients, selectedDoctorId, genderFilter, newOldFilter]);

  const sortedVisits = useMemo(
    () => [...(selectedPatient?.visits ?? [])].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()),
    [selectedPatient],
  );
  const issueCount = selectedPatient?.dentalChart.filter((item) => item.description || item.notes || item.files.length > 0).length ?? 0;
  const pastVisits = sortedVisits.filter((visit) => visit.type === 'past');
  const futureVisits = sortedVisits.filter((visit) => visit.type === 'future');
  const displayedPatients = isCompactLayout ? filteredPatients.slice(0, 10) : filteredPatients;
  const shouldShowCompactPatientDetails = Boolean(isCompactLayout && isMobilePatientViewOpen && selectedPatient);

  useEffect(() => {
    if (isCompactLayout && isMobilePatientViewOpen && !selectedPatient) {
      setIsMobilePatientViewOpen(false);
    }
  }, [isCompactLayout, isMobilePatientViewOpen, selectedPatient]);

  const submitPatient = async (payload: Parameters<PatientModalProps['onSubmit']>[0]) => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      if (editingPatient) {
        await apiCall(
          `/api/patients/${editingPatient.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              ...payload,
              middleName: payload.middleName ?? null,
              gender: payload.gender ?? null,
              historyDetails: payload.historyDetails ?? null,
            }),
          },
          token,
        );
      } else {
        await apiCall(
          '/api/patients',
          {
            method: 'POST',
            body: JSON.stringify({
              ...payload,
              middleName: payload.middleName ?? null,
              gender: payload.gender ?? null,
            }),
          },
          token,
        );
      }

      await loadPatients(searchQuery.trim());
      if (editingPatient?.id) {
        await loadPatientDetails(editingPatient.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти пацієнта');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!token || !deletingPatientId) return;
    setSaving(true);
    setError('');
    try {
      await apiCall(`/api/patients/${deletingPatientId}`, { method: 'DELETE' }, token);
      setDeletingPatientId(null);
      await loadPatients(searchQuery.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося видалити пацієнта');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTooth = async (payload: Partial<ToothRecord>) => {
    if (!token || !selectedPatient || selectedTooth === null) return;
    setSaving(true);
    setError('');
    try {
      await apiCall(
        `/api/patients/${selectedPatient.id}/teeth`,
        {
          method: 'POST',
          body: JSON.stringify({
            tooth_number: selectedTooth,
            status: payload.description ?? '',
            notes: payload.notes ?? '',
          }),
        },
        token,
      );
      await loadPatientDetails(selectedPatient.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти зубну карту');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVisit = async (payload: { date: string; type: 'past' | 'future'; notes: string; doctorId: string }) => {
    if (!token || !selectedPatient) return;
    setSaving(true);
    setError('');
    try {
      await apiCall(
        `/api/patients/${selectedPatient.id}/visits`,
        {
          method: 'POST',
          body: JSON.stringify({
            visitDate: payload.date,
            type: payload.type,
            notes: payload.notes,
            reason: payload.notes,
            doctorId: payload.doctorId,
          }),
        },
        token,
      );
      await loadPatientDetails(selectedPatient.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося додати візит');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVisit = async () => {
    if (!token || !selectedPatient || !deletingVisitId) return;
    setSaving(true);
    setError('');
    try {
      await apiCall(`/api/patients/${selectedPatient.id}/visits/${deletingVisitId}`, { method: 'DELETE' }, token);
      setDeletingVisitId(null);
      await loadPatients(searchQuery.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося видалити візит');
    } finally {
      setSaving(false);
    }
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    setRecentSearches((current) => {
      const filtered = current.filter((item) => item !== searchQuery.trim());
      return [searchQuery.trim(), ...filtered].slice(0, 3);
    });
    setIsSearchFocused(false);
    void loadPatients(searchQuery.trim());
  };

  const canAddOrEditPatient = canPerformAction(currentUser, 'add', 'patient');
  const canEditDental = canPerformAction(currentUser, 'edit', 'dental');
  const canDeletePatient = canPerformAction(currentUser, 'delete', 'patient');

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    if (isCompactLayout) {
      setIsMobilePatientViewOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Зубні карти</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {!shouldShowCompactPatientDetails && <Button variant="outline" onClick={() => void refresh()} disabled={loading || saving}>Оновити</Button>}
          {selectedPatient && !shouldShowCompactPatientDetails && (
            <Button onClick={() => setShowForm043(true)} className="gap-2">
              <Printer className="h-4 w-4" />
              Форма 043
            </Button>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className={cn('grid gap-4', !isCompactLayout && 'xl:grid-cols-[320px_minmax(0,1fr)]')}>
        <section className={cn('glass-panel flex min-h-[720px] flex-col overflow-hidden', shouldShowCompactPatientDetails && 'hidden')}>
          <div className="border-b p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-heading text-lg">Пацієнти</h2>
              {canAddOrEditPatient && (
                <Button size="sm" onClick={() => setIsAddingPatient(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Додати
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Пошук"
                value={searchQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  setSearchQuery(value);
                  if (!value.trim()) {
                    void loadPatients();
                  }
                }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onKeyDown={(event) => event.key === 'Enter' && handleSearchSubmit()}
                className="pl-9"
              />
              {isSearchFocused && !searchQuery && recentSearches.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover p-1 shadow-md">
                  <p className="px-2 py-1 text-[10px] text-muted-foreground">Останні пошуки</p>
                  {recentSearches.map((item, index) => (
                    <button
                      key={`${item}-${index}`}
                      className="w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onMouseDown={() => {
                        setSearchQuery(item);
                        void loadPatients(item);
                        setIsSearchFocused(false);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button variant="ghost" size="sm" className="mt-2 w-full justify-center text-xs text-muted-foreground" onClick={() => setIsAdvancedOpen((current) => !current)}>
              {isAdvancedOpen ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
              Розширений фільтр
            </Button>

            {isAdvancedOpen && (
              <div className="mt-2 space-y-2">
                <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Лікар" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всі лікарі</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>{doctor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger className="h-8 flex-1 text-xs">
                      <SelectValue placeholder="Стать" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Будь-яка стать</SelectItem>
                      <SelectItem value="male">Ч</SelectItem>
                      <SelectItem value="female">Ж</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newOldFilter} onValueChange={setNewOldFilter}>
                    <SelectTrigger className="h-8 flex-1 text-xs">
                      <SelectValue placeholder="Новий/старий" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Будь-коли доданий</SelectItem>
                      <SelectItem value="new">Новий</SelectItem>
                      <SelectItem value="old">Старий</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Завантаження...</div>
              ) : displayedPatients.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Пацієнтів не знайдено</div>
              ) : (
                displayedPatients.map((patient) => {
                  const isSelected = selectedPatientId === patient.id;
                  return (
                    <div key={patient.id} className="animate-fade-in">
                      <div
                        className={cn(
                          'group cursor-pointer rounded-lg p-3 transition-all duration-200 hover:bg-muted/50',
                          isSelected && 'border border-primary/20 bg-primary/10',
                        )}
                        onClick={() => handlePatientSelect(patient.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate font-medium">{formatPatientName(patient)}</h4>
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {formatPhoneForDisplay(patient.phone)}
                              </span>
                            </div>
                          </div>

                          {(canAddOrEditPatient || canDeletePatient) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canAddOrEditPatient && (
                                  <DropdownMenuItem
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setEditingPatientId(patient.id);
                                    }}
                                  >
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    Редагувати
                                  </DropdownMenuItem>
                                )}
                                {(currentUser?.role === 'super-admin' || currentUser?.role === 'doctor') && (
                                  <DropdownMenuItem
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setHistoryPatientId(patient.id);
                                    }}
                                  >
                                    <History className="mr-2 h-4 w-4" />
                                    Історія змін
                                  </DropdownMenuItem>
                                )}
                                {canDeletePatient && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setDeletingPatientId(patient.id);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Видалити
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </section>

        <section className={cn("glass-panel min-h-[720px] overflow-hidden", isCompactLayout && !shouldShowCompactPatientDetails && "hidden")}>
          {!selectedPatient ? (
            <div className="flex h-full min-h-[720px] items-center justify-center">
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <UserIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{'\u041f\u0430\u0446\u0456\u0454\u043d\u0442 \u043d\u0435 \u043e\u0431\u0440\u0430\u043d\u0438\u0439'}</h3>
                <p className="text-muted-foreground">{'\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u043f\u0430\u0446\u0456\u0454\u043d\u0442\u0430 \u0437\u0456 \u0441\u043f\u0438\u0441\u043a\u0443 \u0434\u043b\u044f \u043f\u0435\u0440\u0435\u0433\u043b\u044f\u0434\u0443 \u0437\u0443\u0431\u043d\u043e\u0457 \u043a\u0430\u0440\u0442\u0438.'}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="border-b bg-card/80 p-4 md:p-6">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
                    {isCompactLayout && (
                      <Button variant="ghost" size="sm" className="h-9 px-3 text-muted-foreground" onClick={() => setIsMobilePatientViewOpen(false)}>
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        {'\u0414\u043e \u0441\u043f\u0438\u0441\u043a\u0443 \u043f\u0430\u0446\u0456\u0454\u043d\u0442\u0456\u0432'}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => void refresh()} disabled={loading || saving} className="h-9 px-3">
                      {'\u041e\u043d\u043e\u0432\u0438\u0442\u0438'}
                    </Button>
                    <Button onClick={() => setShowForm043(true)} className="h-9 gap-2 px-3">
                      <Printer className="mr-2 h-4 w-4" />
                      {'\u0424\u043e\u0440\u043c\u0430 043'}
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="font-heading text-xl font-bold">{formatPatientName(selectedPatient)}</h2>
                      <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground md:flex-row md:items-center md:gap-4">
                        {selectedPatient.dateOfBirth && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            {new Date(selectedPatient.dateOfBirth).toLocaleDateString('uk-UA')}
                          </span>
                        )}
                        <span>{formatPhoneForDisplay(selectedPatient.phone)}</span>
                        <span>{selectedPatient.doctorName || doctors.find((doctor) => doctor.id === selectedPatient.doctorId)?.name || '\u2014'}</span>
                      </div>
                    </div>
                    {issueCount > 0 && (
                      <Badge className="h-9 w-fit rounded-md border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-700 hover:bg-amber-50">
                        {issueCount} {'\u043b\u0456\u043a\u0443\u0432\u0430\u043d\u043d\u044f'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-3 md:p-6">
                <div className="min-w-[280px]">
                  <div className="mb-2">
                    <div className="mb-1 text-center text-[10px] font-medium text-muted-foreground md:text-xs">Верхня щелепа</div>
                    <div className="flex flex-nowrap items-end justify-center gap-0 overflow-auto py-[5px]">
                      {UPPER_TEETH.map((number) => (
                        <Tooth
                          key={number}
                          number={number}
                          isUpper
                          record={selectedPatient.dentalChart.find((item) => item.toothNumber === number)}
                          onClick={() => canEditDental && setSelectedTooth(number)}
                          alignBottom
                          compact={isCompactLayout}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex flex-nowrap items-start justify-center gap-0 overflow-auto py-[5px]">
                      {LOWER_TEETH.map((number) => (
                        <Tooth
                          key={number}
                          number={number}
                          isUpper={false}
                          record={selectedPatient.dentalChart.find((item) => item.toothNumber === number)}
                          onClick={() => canEditDental && setSelectedTooth(number)}
                          compact={isCompactLayout}
                        />
                      ))}
                    </div>
                    <div className="mt-1 text-center text-[10px] font-medium text-muted-foreground md:text-xs">Нижня щелепа</div>
                  </div>
                </div>

                <div className="mt-6 border-t pt-4">
                  <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="flex items-center gap-2 justify-start">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-medium">Історія візитів</h3>
                      <Badge variant="secondary" className="text-xs">{selectedPatient.visits.length}</Badge>
                    </div>
                    <div className="flex justify-center">
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => setSelectedDate((current) => current ?? new Date())}>
                        <Stethoscope className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex justify-end">
                      {canEditDental && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsAddingVisit(true)}>
                          <Plus className="mr-1 h-3 w-3" />
                          Додати візит
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex justify-center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={uk}
                        className="rounded-md border pointer-events-auto"
                        modifiers={{
                          future: futureVisits.map((visit) => new Date(visit.date)),
                          past: pastVisits.map((visit) => new Date(visit.date)),
                        }}
                        modifiersClassNames={{
                          future: 'bg-primary/20 text-primary font-medium',
                          past: 'bg-muted text-muted-foreground',
                        }}
                      />
                    </div>

                    <div className="space-y-3">
                      {futureVisits.length > 0 && (
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <Clock className="h-3 w-3 text-primary" />
                            <span className="text-xs font-medium text-primary">Заплановані</span>
                          </div>
                          <ScrollArea className="max-h-36">
                            <div className="space-y-1">
                              {futureVisits.map((visit) => (
                                <div key={visit.id} className="group flex items-center justify-between rounded-md bg-primary/5 p-2 text-xs">
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <CalendarIcon className="h-3 w-3 shrink-0 text-primary" />
                                    <span className="font-medium">{formatVisitDate(visit.date)}</span>
                                    {visit.notes && <span className="truncate text-muted-foreground">— {visit.notes}</span>}
                                  </div>
                                  {canDeletePatient && (
                                    <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100" onClick={() => setDeletingVisitId(visit.id)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {pastVisits.length > 0 && (
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">Минулі</span>
                          </div>
                          <ScrollArea className="max-h-36">
                            <div className="space-y-1">
                              {pastVisits.map((visit) => (
                                <div key={visit.id} className="group flex items-center justify-between rounded-md bg-muted/50 p-2 text-xs">
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <CalendarIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <span className="text-muted-foreground">{formatVisitDate(visit.date)}</span>
                                    {visit.notes && <span className="truncate text-muted-foreground">— {visit.notes}</span>}
                                  </div>
                                  {canDeletePatient && (
                                    <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100" onClick={() => setDeletingVisitId(visit.id)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {sortedVisits.length === 0 && (
                        <div className="py-6 text-center text-muted-foreground">
                          <CalendarIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                          <p className="text-xs">Візитів ще немає</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <PatientModal
        isOpen={isAddingPatient || Boolean(editingPatient)}
        onClose={() => {
          setIsAddingPatient(false);
          setEditingPatientId(null);
        }}
        doctors={doctors}
        selectedDoctorId={selectedDoctorId}
        patient={editingPatient}
        onSubmit={submitPatient}
      />

      <VisitModal
        isOpen={isAddingVisit}
        onClose={() => setIsAddingVisit(false)}
        doctors={doctors}
        selectedDoctorId={selectedPatient?.doctorId || selectedDoctorId}
        onSubmit={handleCreateVisit}
      />

      <ToothModal
        isOpen={selectedTooth !== null}
        onClose={() => setSelectedTooth(null)}
        toothNumber={selectedTooth ?? 0}
        record={selectedToothRecord}
        onSave={handleSaveTooth}
      />

      <HistoryModal isOpen={Boolean(historyPatient)} onClose={() => setHistoryPatientId(null)} patient={historyPatient} />

      <AlertDialog open={Boolean(deletingPatientId)} onOpenChange={() => setDeletingPatientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити пацієнта</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити цього пацієнта? Будуть видалені всі пов'язані стоматологічні записи та візити.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePatient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deletingVisitId)} onOpenChange={() => setDeletingVisitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити візит</AlertDialogTitle>
            <AlertDialogDescription>Ви впевнені, що хочете видалити цей візит? Цю дію неможливо скасувати.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVisit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showForm043 && selectedPatient && (
        <Form043Editor patient={selectedPatient} doctors={doctors} onClose={() => setShowForm043(false)} />
      )}
    </div>
  );
}
