import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Plus, Edit2, Trash2, X, Search, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/auth';

interface Appointment {
  id: number;
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

export default function Appointments() {
  const { t } = useI18n();
  const token = getAdminToken();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [items, doctors] = await Promise.all([
        api.getAppointments(token),
        api.getSystemDoctors(token),
      ]);
      setAppointments(
        items.map((item) => {
          const normalized = String(item.appointment_at ?? '').replace(' ', 'T');
          const [date = '', timeWithZone = ''] = normalized.split('T');
          return {
            id: Number(item.id),
            clientName: item.patient_name ?? '',
            phone: item.phone ?? '',
            date,
            time: timeWithZone.slice(0, 5),
            doctor: item.doctor_name ?? '',
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
        if (searchQuery && !appointment.clientName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      }),
    [appointments, filterDate, searchQuery],
  );

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (appointment: Appointment) => {
    setForm({ ...appointment });
    setEditingId(appointment.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!token || !form.clientName || !form.phone || !form.date || !form.time || !form.doctor) return;
    setSaving(true);
    setError('');
    const doctor = doctorOptions.find((item) => item.name === form.doctor);
    const payload = {
      patient_name: form.clientName,
      phone: form.phone,
      appointment_at: `${form.date}T${form.time}:00`,
      doctor_user_id: doctor?.id ?? null,
      notes: form.comment,
      status: form.status,
    };
    try {
      if (editingId !== null) {
        await api.updateAppointment(token, editingId, payload);
      } else {
        await api.createAppointment(token, payload);
      }
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-heading font-bold">{t('appointments')}</h1>
          <button onClick={openNew} className="btn-accent flex items-center gap-2 self-start">
            <Plus className="w-4 h-4" />
            {t('newAppointment')}
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-glass w-full pl-10"
            />
          </div>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="input-glass" />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('all')}
            </button>
          )}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">{t('loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>{t('noAppointments')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {[t('clientName'), t('phone'), t('date'), t('time'), t('doctor'), t('status'), t('actions')].map((header) => (
                      <th key={header} className="text-left text-xs text-muted-foreground font-medium px-5 py-3">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((appointment) => (
                    <tr key={appointment.id} className="table-row-hover border-b border-border/50 last:border-0">
                      <td className="px-5 py-3.5 text-sm font-medium">{appointment.clientName}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{appointment.phone}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{appointment.date}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{appointment.time}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{appointment.doctor}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[appointment.status]}`}>
                          {t(appointment.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(appointment)} className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => void handleDelete(appointment.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-panel w-full max-w-lg p-6 space-y-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-heading font-semibold text-lg">{editingId ? t('edit') : t('newAppointment')}</h2>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('clientName')}</label>
                    <input className="input-glass w-full" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('phone')}</label>
                    <input className="input-glass w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('date')}</label>
                    <input type="date" className="input-glass w-full" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
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
