import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Plus, Edit2, Trash2, X, Search, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const mockDoctors = ['Др. Іваненко', 'Др. Шевченко', 'Др. Бондаренко', 'Др. Кравченко'];

const initialAppointments: Appointment[] = [
  { id: 1, clientName: 'Олена Петренко', phone: '+380991234567', date: '2026-03-19', time: '10:00', doctor: 'Др. Іваненко', comment: 'Планова перевірка', status: 'scheduled' },
  { id: 2, clientName: 'Максим Коваль', phone: '+380991234568', date: '2026-03-19', time: '11:30', doctor: 'Др. Шевченко', comment: 'Встановлення коронки', status: 'completed' },
  { id: 3, clientName: 'Анна Мельник', phone: '+380991234569', date: '2026-03-20', time: '14:00', doctor: 'Др. Бондаренко', comment: '', status: 'scheduled' },
  { id: 4, clientName: 'Дмитро Ткаченко', phone: '+380991234570', date: '2026-03-19', time: '15:30', doctor: 'Др. Іваненко', comment: 'Відбілювання', status: 'cancelled' },
];

const emptyForm: Omit<Appointment, 'id'> = {
  clientName: '', phone: '', date: '', time: '', doctor: '', comment: '', status: 'scheduled',
};

const statusColors: Record<string, string> = {
  scheduled: 'bg-info/20 text-info',
  completed: 'bg-success/20 text-success',
  cancelled: 'bg-destructive/20 text-destructive',
};

export default function Appointments() {
  const { t } = useI18n();
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = appointments.filter((a) => {
    if (filterDate && a.date !== filterDate) return false;
    if (searchQuery && !a.clientName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (apt: Appointment) => {
    setForm({ clientName: apt.clientName, phone: apt.phone, date: apt.date, time: apt.time, doctor: apt.doctor, comment: apt.comment, status: apt.status });
    setEditingId(apt.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.clientName || !form.phone || !form.date || !form.time || !form.doctor) return;
    if (editingId !== null) {
      setAppointments((prev) => prev.map((a) => (a.id === editingId ? { ...a, ...form } : a)));
    } else {
      setAppointments((prev) => [...prev, { id: Date.now(), ...form }]);
    }
    setShowForm(false);
  };

  const handleDelete = (id: number) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-heading font-bold">{t('appointments')}</h1>
        </div>

        {/* Filters */}
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
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input-glass"
          />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('all')}
            </button>
          )}
        </div>

        {/* Table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>{t('noAppointments')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {[t('clientName'), t('phone'), t('date'), t('time'), t('doctor'), t('status'), t('actions')].map((h) => (
                      <th key={h} className="text-left text-xs text-muted-foreground font-medium px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((apt) => (
                    <tr key={apt.id} className="table-row-hover border-b border-border/50 last:border-0">
                      <td className="px-5 py-3.5 text-sm font-medium">{apt.clientName}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{apt.phone}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{apt.date}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{apt.time}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{apt.doctor}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[apt.status]}`}>
                          {t(apt.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(apt)} className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(apt.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
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

        {/* Modal */}
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
                  <h2 className="font-heading font-semibold text-lg">
                    {editingId ? t('edit') : t('newAppointment')}
                  </h2>
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
                      <option value="">—</option>
                      {mockDoctors.map((d) => <option key={d} value={d}>{d}</option>)}
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
                  <button onClick={handleSave} className="btn-accent">
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
