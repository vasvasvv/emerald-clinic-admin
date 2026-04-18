import type { ChangeHistoryEntry, Doctor, Patient, ToothRecord, User, Visit } from '@/types/dental';
import { DENTAL_TEMPLATES } from '@/types/dental';

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

export function normalizeRole(role: string | undefined): User['role'] {
  if (role === 'superuser' || role === 'superadmin') return 'super-admin';
  if (role === 'manager' || role === 'admin') return 'admin';
  return 'doctor';
}

export function getStoredAdminUser(): User | null {
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

export function canPerformAction(
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

export function resolveToothTemplateId(value: string | undefined): string {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return '';

  const matched = DENTAL_TEMPLATES.find((item) => {
    return (
      item.id.toLowerCase() === normalized ||
      item.label.toLowerCase() === normalized ||
      item.description.toLowerCase() === normalized
    );
  });

  return matched?.id ?? '';
}

export function normalizeVisit(value: unknown): Visit {
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

export function normalizeTooth(value: unknown): ToothRecord {
  const record = asRecord(value) as RawToothRecord;
  const description = normalizeString(record.description ?? record.status);
  const files = Array.isArray(record.files) ? record.files : [];
  const templateId =
    normalizeString(record.templateId) || (files.length > 0 ? 'xray' : resolveToothTemplateId(description));

  return {
    toothNumber: Number(record.toothNumber ?? record.tooth_number ?? 0),
    description,
    templateId,
    files,
    notes: normalizeString(record.notes),
    updatedAt: normalizeString(record.updatedAt) || normalizeString(record.updated_at) || new Date().toISOString(),
  };
}

export function normalizeChangeHistory(value: unknown): ChangeHistoryEntry {
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

export function normalizePatient(value: unknown): Patient {
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

export function normalizeDoctor(value: unknown): Doctor {
  const record = asRecord(value);

  return {
    id: normalizeStringId(record.id),
    name: normalizeString(record.name ?? record.fullName),
    specialty: normalizeString(record.specialty, 'Лікар'),
  };
}

export function normalizeDoctors(items: unknown): Doctor[] {
  return Array.isArray(items) ? items.map(normalizeDoctor) : [];
}

export function resolveDoctorFilter(normalized: Doctor[], currentUser: User | null): string {
  if (currentUser?.role === 'doctor' && currentUser.name) {
    const matched = normalized.find(
      (doctor) => doctor.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase(),
    );
    return matched?.id ?? 'all';
  }

  return 'all';
}

export function formatPhoneForSave(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('380') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+38${digits}`;
  if (digits.length === 9) return `+380${digits}`;
  return phone;
}

export function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('380')) {
    return `+38 (0${digits.slice(3, 5)})-${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
  }
  return phone;
}

export function formatPatientName(patient: Patient) {
  return `${patient.lastName} ${patient.firstName} ${patient.middleName ?? ''}`.trim();
}

export function parseDate(value: string) {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatVisitDate(value: string) {
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
