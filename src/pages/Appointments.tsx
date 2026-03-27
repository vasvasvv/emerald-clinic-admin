import { useMemo, useState } from 'react';
import { format, type Locale } from 'date-fns';
import { enUS, uk } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock3, Edit2, Phone, Plus, Search, Trash2, UserRound, X } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Calendar as DateCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSystemDoctors } from '@/hooks/use-doctors';
import {
  useAppointments,
  useCreateAppointment,
  useDeleteAppointment,
  useUpdateAppointment,
} from '@/hooks/use-appointments';
import { useI18n } from '@/lib/i18n';
import { buildPatientName, splitPatientName } from '@/lib/patient-utils';
import type { DoctorOption } from '@/types/api';

interface Appointment {
  id: number;
  firstName: string;
  lastName: string;
  clientName: string;
  phone: string;
  date: string;
  time: string;
  doctor: string;
  comment: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

const emptyForm: Omit<Appointment, 'id'> = {
  firstName: '',
  lastName: '',
  clientName: '',
  phone: '',
  date: '',
  time: '',
  doctor: '',
  comment: '',
  status: 'scheduled',
};

const statusColors: Record<Appointment['status'], string> = {
  scheduled: 'bg-info/20 text-info',
  completed: 'bg-success/20 text-success',
  cancelled: 'bg-destructive/20 text-destructive',
};

const parseDateValue = (value: string) => (value ? new Date(`${value}T00:00:00`) : undefined);

function SelectField({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="input-glass h-11 w-full rounded-2xl border-border/70 bg-[linear-gradient(180deg,rgba(24,56,53,0.92)_0%,rgba(16,39,37,0.96)_100%)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_28px_rgba(0,0,0,0.14)] focus:ring-0 focus:ring-offset-0">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="glass-panel rounded-2xl border-glass-border bg-[linear-gradient(180deg,rgba(24,56,53,0.96)_0%,rgba(16,39,37,0.98)_100%)] text-foreground shadow-[0_22px_50px_rgba(0,0,0,0.28)]">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="rounded-xl py-2.5 text-sm focus:bg-secondary/70 focus:text-foreground"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DateField({
  value,
  onChange,
  locale,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="input-glass flex h-11 w-full items-center justify-between rounded-2xl bg-[linear-gradient(180deg,rgba(24,56,53,0.92)_0%,rgba(16,39,37,0.96)_100%)] px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_28px_rgba(0,0,0,0.14)]">
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
            {value ? format(parseDateValue(value)!, 'dd MMMM yyyy', { locale }) : placeholder}
          </span>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden border-glass-border p-0 glass-panel" align="start">
        <DateCalendar
          mode="single"
          selected={parseDateValue(value)}
          onSelect={(date) => onChange(date ? format(date, 'yyyy-MM-dd') : '')}
          className="bg-card/95"
          locale={locale}
        />
      </PopoverContent>
    </Popover>
  );
}

export default function Appointments() {
  const { t, lang } = useI18n();
  const locale = lang === 'uk' ? uk : enUS;
  const patientLabel = lang === 'uk' ? 'Пацієнт' : 'Patient';
  const noDoctorLabel = lang === 'uk' ? 'Без лікаря' : 'No doctor';
  const subtitle =
    lang === 'uk' ? 'Керування прийомами за лікарями та датами.' : 'Manage appointments by doctor and date.';
  const saveErrorText = lang === 'uk' ? 'Не вдалося зберегти прийом' : 'Failed to save appointment';
  const deleteErrorText = lang === 'uk' ? 'Не вдалося видалити прийом' : 'Failed to delete appointment';
  const loadErrorText = lang === 'uk' ? 'Не вдалося завантажити прийоми' : 'Failed to load appointments';

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterDate, setFilterDate] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: appointmentItems = [], isLoading: loading, error: appointmentsError } = useAppointments();
  const { data: doctorItems = [], error: doctorsError } = useSystemDoctors();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();

  const appointments = useMemo<Appointment[]>(
    () =>
      appointmentItems.map((item) => {
        const normalized = String(item.appointment_at ?? '').replace(' ', 'T');
        const [date = '', timeWithZone = ''] = normalized.split('T');
        const split = splitPatientName(item.patient_name ?? '');

        return {
          id: Number(item.id),
          firstName: split.firstName,
          lastName: split.lastName,
          clientName: item.patient_name ?? '',
          phone: item.phone ?? '',
          date,
          time: timeWithZone.slice(0, 5),
          doctor: item.doctor_name ?? noDoctorLabel,
          comment: item.notes ?? '',
          status: item.status ?? 'scheduled',
        };
      }),
    [appointmentItems, noDoctorLabel],
  );

  const doctorOptions = useMemo<DoctorOption[]>(
    () => doctorItems.map((doctor) => ({ id: Number(doctor.id), name: doctor.name })),
    [doctorItems],
  );

  const filterDoctorOptions = useMemo(
    () => [
      { value: '__all__', label: t('allDoctors') },
      ...doctorOptions.map((doctor) => ({ value: doctor.name, label: doctor.name })),
    ],
    [doctorOptions, t],
  );

  const formDoctorOptions = useMemo(
    () => [
      { value: '__placeholder__', label: t('chooseDoctor') },
      ...doctorOptions.map((doctor) => ({ value: doctor.name, label: doctor.name })),
    ],
    [doctorOptions, t],
  );

  const loadError = appointmentsError ?? doctorsError;

  const filtered = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          if (filterDate && appointment.date !== filterDate) return false;
          if (selectedDoctor && appointment.doctor !== selectedDoctor) return false;
          if (searchQuery) {
            const normalizedQuery = searchQuery.trim().toLowerCase();
            const searchTokens = normalizedQuery.split(/\s+/).filter(Boolean);
            const searchableValues = [
              appointment.clientName,
              appointment.firstName,
              appointment.lastName,
              appointment.phone,
              appointment.doctor,
              appointment.comment,
              appointment.date,
              appointment.time,
            ]
              .join(' ')
              .toLowerCase();

            const hasAllMatches = searchTokens.every((token) => searchableValues.includes(token));
            if (!hasAllMatches) return false;
          }
          return true;
        })
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    [appointments, filterDate, searchQuery, selectedDoctor],
  );

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (appointment: Appointment) => {
    const split = splitPatientName(appointment.clientName);
    setForm({ ...appointment, firstName: split.firstName, lastName: split.lastName });
    setEditingId(appointment.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.phone || !form.date || !form.time || !form.doctor) return;

    setSaving(true);
    setError('');
    const doctor = doctorOptions.find((item) => item.name === form.doctor);
    const payload = {
      patient_name: buildPatientName(form.lastName, form.firstName),
      phone: form.phone,
      appointment_at: `${form.date}T${form.time}:00`,
      doctor_user_id: doctor?.id ?? null,
      notes: form.comment,
      status: form.status,
    };

    try {
      if (editingId !== null) {
        await updateAppointment.mutateAsync({ id: editingId, data: payload });
      } else {
        await createAppointment.mutateAsync(payload);
      }
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : saveErrorText);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError('');
    try {
      await deleteAppointment.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : deleteErrorText);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">{t('appointments')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <button onClick={openNew} className="btn-accent flex items-center gap-2 self-start">
            <Plus className="h-4 w-4" />
            {t('newAppointment')}
          </button>
        </div>

        {(error || loadError) && (
          <p className="text-sm text-destructive">
            {error || (loadError instanceof Error ? loadError.message : loadErrorText)}
          </p>
        )}

        <div className="glass-panel p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.9fr_0.9fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-glass w-full pl-10"
              />
            </div>

            <SelectField
              value={selectedDoctor || '__all__'}
              onChange={(value) => setSelectedDoctor(value === '__all__' ? '' : value)}
              placeholder={t('allDoctors')}
              options={filterDoctorOptions}
            />

            <DateField value={filterDate} onChange={setFilterDate} locale={locale} placeholder={t('date')} />

            <button
              onClick={() => {
                setSearchQuery('');
                setFilterDate('');
                setSelectedDoctor('');
              }}
              className="rounded-2xl border border-border/70 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
            >
              {t('all')}
            </button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">{t('loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Calendar className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <p>{t('noAppointments')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/45">
              <div className="hidden grid-cols-[110px_1.2fr_1.3fr_1fr_140px_110px] gap-3 border-b border-border/50 bg-secondary/18 px-5 py-3 text-xs uppercase tracking-[0.16em] text-muted-foreground lg:grid">
                <span>{t('time')}</span>
                <span>{t('doctor')}</span>
                <span>{patientLabel}</span>
                <span>{t('phone')}</span>
                <span>{t('status')}</span>
                <span className="text-right">{t('actions')}</span>
              </div>

              {filtered.map((appointment) => (
                <div
                  key={appointment.id}
                  className="px-4 py-4 transition-colors duration-300 hover:bg-secondary/20 lg:px-5"
                >
                  <div className="grid gap-3 lg:grid-cols-[110px_1.2fr_1.3fr_1fr_140px_110px] lg:items-center">
                    <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                      <Clock3 className="h-4 w-4" />
                      {appointment.time}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground lg:hidden">
                        {t('doctor')}
                      </p>
                      <p className="text-sm font-medium text-foreground">{appointment.doctor}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground lg:hidden">
                        {patientLabel}
                      </p>
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">{appointment.clientName}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground lg:hidden">
                        {t('phone')}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {appointment.phone}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground lg:hidden">
                        {t('status')}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[appointment.status]}`}
                      >
                        {t(appointment.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 lg:justify-end">
                      <button
                        onClick={() => openEdit(appointment)}
                        className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(appointment.id)}
                        className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {appointment.comment && <p className="mt-3 text-sm text-muted-foreground">{appointment.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.97, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.97, opacity: 0 }}
                className="glass-panel w-full max-w-xl space-y-5 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-semibold">{editingId ? t('edit') : t('newAppointment')}</h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/60"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('lastName')}</label>
                    <input
                      className="input-glass w-full"
                      value={form.lastName}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          lastName: e.target.value,
                          clientName: buildPatientName(e.target.value, form.firstName),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('firstName')}</label>
                    <input
                      className="input-glass w-full"
                      value={form.firstName}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          firstName: e.target.value,
                          clientName: buildPatientName(form.lastName, e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('phone')}</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        className="input-glass w-full pl-10"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('date')}</label>
                    <DateField
                      value={form.date}
                      onChange={(value) => setForm({ ...form, date: value })}
                      locale={locale}
                      placeholder={t('date')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('time')}</label>
                    <input
                      type="time"
                      className="input-glass w-full"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">{t('doctor')}</label>
                    <SelectField
                      value={form.doctor || '__placeholder__'}
                      onChange={(value) => setForm({ ...form, doctor: value === '__placeholder__' ? '' : value })}
                      placeholder={t('chooseDoctor')}
                      options={formDoctorOptions}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">{t('comment')}</label>
                    <textarea
                      className="input-glass w-full resize-none"
                      rows={3}
                      value={form.comment}
                      onChange={(e) => setForm({ ...form, comment: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-xl px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60"
                  >
                    {t('cancel')}
                  </button>
                  <button onClick={() => void handleSave()} className="btn-accent" disabled={saving}>
                    {t('save')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ConfirmDialog
          open={deletingId !== null}
          onCancel={() => setDeletingId(null)}
          onConfirm={() => {
            if (deletingId === null) return;
            void handleDelete(deletingId).finally(() => setDeletingId(null));
          }}
          title={lang === 'uk' ? 'Видалити прийом' : 'Delete appointment'}
          description={
            lang === 'uk'
              ? 'Ви впевнені, що хочете видалити цей прийом? Цю дію неможливо скасувати.'
              : 'Are you sure you want to delete this appointment? This action cannot be undone.'
          }
          confirmLabel={lang === 'uk' ? 'Так, видалити' : 'Yes, delete'}
        />
      </div>
    </AdminLayout>
  );
}
