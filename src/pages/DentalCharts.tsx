import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { apiCall } from '@/lib/api';
import { getAdminToken } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Search, UserRound, CalendarDays, Plus, Printer, Save, Trash2, FileText } from 'lucide-react';

type VisitType = 'past' | 'future';

type ToothRecord = {
  toothNumber: number;
  description: string;
  notes: string;
  updatedAt: string;
};

type Visit = {
  id: string;
  date: string;
  type: VisitType;
  notes: string;
  doctorId: string;
  doctorName?: string;
};

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  dateOfBirth: string;
  doctorId: string;
  doctorName?: string;
  dentalChart: ToothRecord[];
  visits: Visit[];
};

const UPPER_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const LOWER_TEETH = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];

const TOOTH_TEMPLATES = [
  { id: 'healthy', label: 'Healthy', description: 'No issues detected' },
  { id: 'cavity', label: 'Cavity', description: 'Caries requiring treatment' },
  { id: 'filling', label: 'Filling', description: 'Existing or required filling' },
  { id: 'crown', label: 'Crown', description: 'Crown installed or required' },
  { id: 'root-canal', label: 'Root canal', description: 'Endodontic treatment' },
  { id: 'implant', label: 'Implant', description: 'Dental implant' },
  { id: 'extraction', label: 'Extraction', description: 'Removed or planned for removal' },
  { id: 'missing', label: 'Missing', description: 'Missing tooth' },
];

function normalizeVisit(value: any): Visit {
  return {
    id: String(value.id ?? ''),
    date: value.visit_at ?? value.visitDate ?? value.date ?? '',
    type: (value.visit_type ?? value.type) === 'past' ? 'past' : 'future',
    notes: value.notes ?? value.reason ?? '',
    doctorId: String(value.doctor_user_id ?? value.doctor_id ?? value.doctorId ?? ''),
    doctorName: value.doctorName ?? value.doctor_name ?? '',
  };
}

function normalizeTooth(value: any): ToothRecord {
  return {
    toothNumber: Number(value.toothNumber ?? value.tooth_number ?? 0),
    description: value.description ?? value.status ?? '',
    notes: value.notes ?? '',
    updatedAt: value.updatedAt ?? value.updated_at ?? new Date().toISOString(),
  };
}

function normalizePatient(value: any): Patient {
  return {
    id: String(value.id ?? ''),
    firstName: value.firstName ?? value.first_name ?? '',
    lastName: value.lastName ?? value.last_name ?? '',
    middleName: value.middleName ?? value.middle_name ?? '',
    phone: value.phone ?? '',
    dateOfBirth: value.dateOfBirth ?? value.date_of_birth ?? '',
    doctorId: String(value.primary_doctor_user_id ?? value.doctor_id ?? value.doctorId ?? ''),
    doctorName: value.doctor_name ?? value.doctorName ?? '',
    dentalChart: Array.isArray(value.dentalChart) ? value.dentalChart.map(normalizeTooth) : [],
    visits: Array.isArray(value.visits) ? value.visits.map(normalizeVisit) : [],
  };
}

function formatPatientName(patient: Patient) {
  return [patient.lastName, patient.firstName, patient.middleName].filter(Boolean).join(' ').trim();
}

function formatDate(date: string) {
  if (!date) return '—';
  const normalized = date.includes('T') ? date : `${date}T00:00:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('uk-UA');
}

function formatDateTime(date: string) {
  if (!date) return '—';
  const normalized = date.includes('T') ? date : date.replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toothTone(record?: ToothRecord) {
  if (!record?.description && !record?.notes) return 'border-border bg-card text-foreground hover:border-primary/50';
  if (record.description.toLowerCase().includes('healthy')) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
}

export default function DentalCharts() {
  const { t } = useI18n();
  const token = getAdminToken();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [toothDescription, setToothDescription] = useState('');
  const [toothNotes, setToothNotes] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitType, setVisitType] = useState<VisitType>('future');
  const [visitNotes, setVisitNotes] = useState('');
  const [showForm043, setShowForm043] = useState(false);

  const loadPatients = async (keepSelection = true) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiCall<any[]>('/api/patients', {}, token);
      const normalized = Array.isArray(data) ? data.map(normalizePatient) : [];
      setPatients(normalized);
      if (!keepSelection || !normalized.some((patient) => patient.id === selectedPatientId)) {
        setSelectedPatientId(normalized[0]?.id ?? '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dental charts');
    } finally {
      setLoading(false);
    }
  };

  const refreshSelectedPatient = async () => {
    if (!token || !selectedPatientId) return;
    try {
      const data = await apiCall<any>(`/api/patients/${selectedPatientId}`, {}, token);
      const normalized = normalizePatient(data);
      setPatients((current) => current.map((patient) => (
        patient.id === normalized.id ? normalized : patient
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh patient');
    }
  };

  useEffect(() => {
    void loadPatients(false);
  }, [token]);

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((patient) => {
      const haystack = `${formatPatientName(patient)} ${patient.phone}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [patients, search]);

  const patient = patients.find((item) => item.id === selectedPatientId) ?? null;

  const selectedToothRecord = useMemo(() => {
    if (!patient || selectedTooth === null) return null;
    return patient.dentalChart.find((item) => item.toothNumber === selectedTooth) ?? null;
  }, [patient, selectedTooth]);

  useEffect(() => {
    setToothDescription(selectedToothRecord?.description ?? '');
    setToothNotes(selectedToothRecord?.notes ?? '');
  }, [selectedToothRecord]);

  const issueCount = patient?.dentalChart.filter((item) => item.description || item.notes).length ?? 0;
  const sortedVisits = useMemo(() => {
    return [...(patient?.visits ?? [])].sort((left, right) => right.date.localeCompare(left.date));
  }, [patient]);

  const handleSaveTooth = async () => {
    if (!token || !patient || selectedTooth === null) return;
    setSaving(true);
    setError('');
    try {
      await apiCall(`/api/patients/${patient.id}/teeth`, {
        method: 'POST',
        body: JSON.stringify({
          tooth_number: selectedTooth,
          status: toothDescription,
          notes: toothNotes,
        }),
      }, token);
      await refreshSelectedPatient();
      setSelectedTooth(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tooth');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVisit = async () => {
    if (!token || !patient || !visitDate) return;
    setSaving(true);
    setError('');
    try {
      await apiCall(`/api/patients/${patient.id}/visits`, {
        method: 'POST',
        body: JSON.stringify({
          visitDate,
          type: visitType,
          notes: visitNotes,
          reason: visitNotes,
          doctorId: patient.doctorId || null,
        }),
      }, token);
      setVisitDate('');
      setVisitType('future');
      setVisitNotes('');
      await refreshSelectedPatient();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create visit');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVisit = async (visitId: string) => {
    if (!token || !patient) return;
    setSaving(true);
    setError('');
    try {
      await apiCall(`/api/patients/${patient.id}/visits/${visitId}`, { method: 'DELETE' }, token);
      await refreshSelectedPatient();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete visit');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint043 = () => {
    if (!patient) return;
    const visitRows = sortedVisits.slice(0, 8).map((visit) => `
      <tr>
        <td>${formatDateTime(visit.date)}</td>
        <td>${visit.type === 'future' ? 'Запланований' : 'Проведений'}</td>
        <td>${visit.notes || '—'}</td>
      </tr>
    `).join('');
    const issueRows = patient.dentalChart
      .filter((item) => item.description || item.notes)
      .map((item) => `
        <tr>
          <td>${item.toothNumber}</td>
          <td>${item.description || '—'}</td>
          <td>${item.notes || '—'}</td>
        </tr>
      `)
      .join('');

    const printWindow = window.open('', '_blank', 'width=960,height=720');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Форма 043 - ${formatPatientName(patient)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
            h1, h2 { margin: 0 0 12px; }
            p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
            .section { margin-top: 28px; }
          </style>
        </head>
        <body>
          <h1>Форма 043/о</h1>
          <p>Пацієнт: ${formatPatientName(patient)}</p>
          <p>Телефон: ${patient.phone || '—'}</p>
          <p>Дата народження: ${formatDate(patient.dateOfBirth)}</p>
          <p>Лікар: ${patient.doctorName || '—'}</p>
          <div class="section">
            <h2>Зубна карта</h2>
            <table>
              <thead>
                <tr><th>Зуб</th><th>Стан</th><th>Нотатки</th></tr>
              </thead>
              <tbody>${issueRows || '<tr><td colspan="3">Активних записів немає</td></tr>'}</tbody>
            </table>
          </div>
          <div class="section">
            <h2>Візити</h2>
            <table>
              <thead>
                <tr><th>Дата</th><th>Тип</th><th>Нотатки</th></tr>
              </thead>
              <tbody>${visitRows || '<tr><td colspan="3">Візити відсутні</td></tr>'}</tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">{t('dentalCharts')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Вбудована сторінка зубних карт пацієнта з логікою візитів та друком форми 043.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void loadPatients(true)}
              className="rounded-2xl border border-border/70 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
              disabled={loading}
            >
              Оновити
            </button>
            <button
              onClick={() => setShowForm043((value) => !value)}
              className="btn-accent inline-flex items-center gap-2"
              disabled={!patient}
            >
              <FileText className="h-4 w-4" />
              Форма 043
            </button>
            <button
              onClick={handlePrint043}
              className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/20"
              disabled={!patient}
            >
              <span className="inline-flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Друк
              </span>
            </button>
          </div>
        </div>

        {error && <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <section className="glass-panel p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('search')}
                className="input-glass w-full pl-10"
              />
            </div>

            <div className="mt-4 space-y-2">
              {loading ? (
                <div className="rounded-2xl border border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">{t('loading')}</div>
              ) : filteredPatients.length === 0 ? (
                <div className="rounded-2xl border border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">Пацієнтів не знайдено</div>
              ) : (
                filteredPatients.map((item) => {
                  const active = item.id === selectedPatientId;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedPatientId(item.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                        active ? 'border-primary/40 bg-primary/10' : 'border-border/60 hover:bg-secondary/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/70 text-primary">
                          <UserRound className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{formatPatientName(item)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.phone || 'Без телефону'}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Візитів: {item.visits.length}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="space-y-6">
            {!patient ? (
              <div className="glass-panel flex min-h-[420px] items-center justify-center p-8 text-center text-muted-foreground">
                Оберіть пацієнта, щоб відкрити зубну карту.
              </div>
            ) : (
              <>
                <div className="glass-panel p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-xl font-heading font-bold">{formatPatientName(patient)}</h2>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>{patient.phone || 'Без телефону'}</span>
                        <span>Дата народження: {formatDate(patient.dateOfBirth)}</span>
                        <span>Лікар: {patient.doctorName || '—'}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full border border-border/70 px-3 py-1 text-muted-foreground">32 зуби</span>
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-100">Проблем: {issueCount}</span>
                      <span className="rounded-full border border-border/70 px-3 py-1 text-muted-foreground">Візитів: {patient.visits.length}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Зубна карта пацієнта</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Верхня щелепа</p>
                      <div className="grid grid-cols-8 gap-2 md:grid-cols-16">
                        {UPPER_TEETH.map((number) => {
                          const record = patient.dentalChart.find((item) => item.toothNumber === number);
                          return (
                            <button
                              key={number}
                              onClick={() => setSelectedTooth(number)}
                              className={`rounded-2xl border px-2 py-3 text-center text-sm font-semibold transition-colors ${toothTone(record)}`}
                            >
                              <span className="block text-xs text-muted-foreground">{number}</span>
                              <span className="mt-1 block truncate text-[11px]">{record?.description ? 'Запис' : '—'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Нижня щелепа</p>
                      <div className="grid grid-cols-8 gap-2 md:grid-cols-16">
                        {LOWER_TEETH.map((number) => {
                          const record = patient.dentalChart.find((item) => item.toothNumber === number);
                          return (
                            <button
                              key={number}
                              onClick={() => setSelectedTooth(number)}
                              className={`rounded-2xl border px-2 py-3 text-center text-sm font-semibold transition-colors ${toothTone(record)}`}
                            >
                              <span className="block text-xs text-muted-foreground">{number}</span>
                              <span className="mt-1 block truncate text-[11px]">{record?.description ? 'Запис' : '—'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
                  <div className="glass-panel p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">Логіка візитів</h3>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr_150px]">
                      <input
                        type="datetime-local"
                        value={visitDate}
                        onChange={(event) => setVisitDate(event.target.value)}
                        className="input-glass w-full"
                      />
                      <select value={visitType} onChange={(event) => setVisitType(event.target.value as VisitType)} className="input-glass w-full">
                        <option value="future">Запланований</option>
                        <option value="past">Проведений</option>
                      </select>
                    </div>
                    <textarea
                      rows={3}
                      value={visitNotes}
                      onChange={(event) => setVisitNotes(event.target.value)}
                      className="input-glass mt-3 w-full resize-none"
                      placeholder="Нотатки до візиту, причина звернення, план лікування..."
                    />
                    <button onClick={handleCreateVisit} className="btn-accent mt-3 inline-flex items-center gap-2" disabled={saving || !visitDate}>
                      <Plus className="h-4 w-4" />
                      Додати візит
                    </button>

                    <div className="mt-5 space-y-3">
                      {sortedVisits.length === 0 ? (
                        <div className="rounded-2xl border border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">Візити ще не додані</div>
                      ) : (
                        sortedVisits.map((visit) => (
                          <div key={visit.id} className="rounded-2xl border border-border/60 bg-card/50 px-4 py-3">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold">{formatDateTime(visit.date)}</span>
                                  <span className={`rounded-full px-2.5 py-1 text-[11px] ${
                                    visit.type === 'future' ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                                  }`}>
                                    {visit.type === 'future' ? 'Запланований' : 'Проведений'}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">{visit.notes || 'Без нотаток'}</p>
                              </div>
                              <button
                                onClick={() => void handleDeleteVisit(visit.id)}
                                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                disabled={saving}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="glass-panel p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">Форма 043</h3>
                    </div>

                    {showForm043 ? (
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border/60 bg-card/50 px-4 py-3 text-sm">
                          <p><span className="text-muted-foreground">Пацієнт:</span> {formatPatientName(patient)}</p>
                          <p className="mt-1"><span className="text-muted-foreground">Дата народження:</span> {formatDate(patient.dateOfBirth)}</p>
                          <p className="mt-1"><span className="text-muted-foreground">Телефон:</span> {patient.phone || '—'}</p>
                          <p className="mt-1"><span className="text-muted-foreground">Лікар:</span> {patient.doctorName || '—'}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/50 px-4 py-3 text-sm text-muted-foreground">
                          У друковану форму потрапляють активні записи по зубах та останні візити пацієнта. Для повного бланку використайте кнопку друку.
                        </div>
                        <button onClick={handlePrint043} className="btn-accent inline-flex items-center gap-2">
                          <Printer className="h-4 w-4" />
                          Надрукувати форму 043
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
                        Увімкніть блок форми 043, щоб підготувати друковану версію карти пацієнта.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        {selectedTooth !== null && patient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-xl space-y-5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-lg font-semibold">Зуб №{selectedTooth}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Редагування зубної карти пацієнта</p>
                </div>
                <button onClick={() => setSelectedTooth(null)} className="rounded-xl border border-border/70 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
                  Закрити
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Шаблон стану</label>
                <select
                  value={toothDescription}
                  onChange={(event) => setToothDescription(event.target.value)}
                  className="input-glass w-full"
                >
                  <option value="">Оберіть стан</option>
                  {TOOTH_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.description}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Опис</label>
                <textarea
                  rows={3}
                  value={toothDescription}
                  onChange={(event) => setToothDescription(event.target.value)}
                  className="input-glass w-full resize-none"
                  placeholder="Стан зуба, діагноз, план лікування..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Нотатки</label>
                <textarea
                  rows={4}
                  value={toothNotes}
                  onChange={(event) => setToothNotes(event.target.value)}
                  className="input-glass w-full resize-none"
                  placeholder="Додаткові нотатки лікаря..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setToothDescription('');
                    setToothNotes('');
                  }}
                  className="rounded-xl border border-border/70 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                >
                  Очистити
                </button>
                <button onClick={handleSaveTooth} className="btn-accent inline-flex items-center gap-2" disabled={saving}>
                  <Save className="h-4 w-4" />
                  Зберегти
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
