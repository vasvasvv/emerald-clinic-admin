import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Plus, Edit2, Trash2, X, Search, Calendar, Clock3, Stethoscope, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as DateCalendar } from '@/components/ui/calendar';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/auth';

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

interface DoctorOption {
  id: number;
  name: string;
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

const statusColors: Record<string, string> = {
  scheduled: 'bg-info/20 text-info',
  completed: 'bg-success/20 text-success',
  cancelled: 'bg-destructive/20 text-destructive',
};

const splitPatientName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { lastName: parts[0] ?? '', firstName: parts.slice(1).join(' ') };
};
const buildPatientName = (lastName: string, firstName: string) => `${lastName.trim()} ${firstName.trim()}`.trim();
const parseDateValue = (value: string) => (value ? new Date(`${value}T00:00:00`) : undefined);

export default function Appointments() {
  const { t, lang } = useI18n();
  const token = getAdminToken();
  const locale = lang === 'uk' ? uk : enUS;
  const patientLabel = lang === 'uk' ? 'Пацієнт' : 'Patient';
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterDate, setFilterDate] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [items, doctors] = await Promise.all([api.getAppointments(token), api.getSystemDoctors(token)]);
      setAppointments(
        items.map((item) => {
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
            doctor: item.doctor_name ?? 'Без лікаря',
            comment: item.notes ?? '',
            status: item.status ?? 'scheduled',
          };
        }),
      );
      setDoctorOptions(doctors.map((doctor) => ({ id: Number(doctor.id), name: doctor.name })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const filtered = useMemo(
    () =>
      appointments.filter((appointment) => {
        if (filterDate && appointment.date !== filterDate) return false;
        if (selectedDoctor && appointment.doctor !== selectedDoctor) return false;
        if (searchQuery && !appointment.clientName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      }),
    [appointments, filterDate, selectedDoctor, searchQuery],
  );

  const groupedAppointments = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    filtered.forEach((appointment) => {
      const doctor = appointment.doctor || 'Без лікаря';
      if (!groups.has(doctor)) groups.set(doctor, []);
      groups.get(doctor)?.push(appointment);
    });
    return Array.from(groups.entries()).map(([doctor, items]) => ({
      doctor,
      items: items.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    }));
  }, [filtered]);

  const accordionValue = selectedDoctor || groupedAppointments[0]?.doctor || undefined;

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
    if (!token || !form.firstName || !form.lastName || !form.phone || !form.date || !form.time || !form.doctor) return;
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
      if (editingId !== null) await api.updateAppointment(token, editingId, payload);
      else await api.createAppointment(token, payload);
      await load();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save appointment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    setError('');
    try {
      await api.deleteAppointment(token, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete appointment');
    }
  };

  const DateField = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <Popover>
      <PopoverTrigger asChild>
        <button className="input-glass flex w-full items-center justify-between text-left">
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{value ? format(parseDateValue(value)!, 'dd MMMM yyyy', { locale }) : t('date')}</span>
          <Calendar className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 glass-panel overflow-hidden border-glass-border" align="start">
        <DateCalendar
          mode="single"
          selected={parseDateValue(value)}
          onSelect={(date) => onChange(date ? format(date, 'yyyy-MM-dd') : '')}
          className="bg-card/95"
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">{t('appointments')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Керування прийомами по лікарях та датах</p>
          </div>
          <button onClick={openNew} className="btn-accent flex items-center gap-2 self-start">
            <Plus className="w-4 h-4" />
            {t('newAppointment')}
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="glass-panel p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.9fr_0.9fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder={t('search')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-glass w-full pl-10" />
            </div>
            <select className="input-glass" value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
              <option value="">{t('allDoctors')}</option>
              {doctorOptions.map((doctor) => (
                <option key={doctor.id} value={doctor.name}>
                  {doctor.name}
                </option>
              ))}
            </select>
            <DateField value={filterDate} onChange={setFilterDate} />
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
          ) : groupedAppointments.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>{t('noAppointments')}</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="divide-y divide-border/40" defaultValue={accordionValue}>
              {groupedAppointments.map((group) => (
                <AccordionItem key={group.doctor} value={group.doctor} className="border-0">
                  <AccordionTrigger className="appointment-accordion-trigger px-5 py-5 hover:no-underline">
                    <div className="flex flex-1 items-center gap-4 text-left">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-heading text-base font-semibold text-foreground">{group.doctor}</p>
                        <p className="text-sm text-muted-foreground">{group.items.length} запис(ів)</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-0">
                    <div className="space-y-3">
                      {group.items.map((appointment) => (
                        <div key={appointment.id} className="rounded-2xl border border-border/60 bg-secondary/18 px-4 py-4 transition-all duration-300 hover:border-primary/25 hover:bg-secondary/28">
                          <div className="grid gap-3 lg:grid-cols-[110px_1.1fr_1.2fr_1fr_130px_auto] lg:items-center">
                            <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                              <Clock3 className="h-4 w-4" />
                              {appointment.time}
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Лікар</p>
                              <p className="text-sm font-medium text-foreground">{appointment.doctor}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{patientLabel}</p>
                              <p className="text-sm font-medium text-foreground">{appointment.clientName}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t('phone')}</p>
                              <p className="text-sm text-foreground">{appointment.phone}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t('date')}</p>
                              <p className="text-sm text-foreground">{appointment.date}</p>
                            </div>
                            <div className="flex items-center gap-2 lg:justify-end">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[appointment.status]}`}>{t(appointment.status)}</span>
                              <button onClick={() => openEdit(appointment)} className="p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => void handleDelete(appointment.id)} className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {appointment.comment && <p className="mt-3 text-sm text-muted-foreground">{appointment.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
              <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} className="glass-panel w-full max-w-xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h2 className="font-heading font-semibold text-lg">{editingId ? t('edit') : t('newAppointment')}</h2>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('lastName')}</label>
                    <input className="input-glass w-full" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value, clientName: buildPatientName(e.target.value, form.firstName) })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('firstName')}</label>
                    <input className="input-glass w-full" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value, clientName: buildPatientName(form.lastName, e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('phone')}</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input className="input-glass w-full pl-10" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('date')}</label>
                    <DateField value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('time')}</label>
                    <input type="time" className="input-glass w-full" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">{t('doctor')}</label>
                    <select className="input-glass w-full" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })}>
                      <option value="">-</option>
                      {doctorOptions.map((doctor) => (
                        <option key={doctor.id} value={doctor.name}>
                          {doctor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">{t('comment')}</label>
                    <textarea className="input-glass w-full resize-none" rows={3} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
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
      </div>
    </AdminLayout>
  );
}
