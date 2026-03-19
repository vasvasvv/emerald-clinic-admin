import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Plus, Edit2, Trash2, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Doctor {
  id: number;
  fullName: string;
  position: string;
  specialization: string;
  experience: number;
  description: string;
  photo: string;
}

const initialDoctors: Doctor[] = [
  { id: 1, fullName: 'Іваненко Олексій Петрович', position: 'Головний лікар', specialization: 'Ортодонтія', experience: 15, description: 'Досвідчений спеціаліст з виправлення прикусу', photo: '' },
  { id: 2, fullName: 'Шевченко Марина Іванівна', position: 'Стоматолог-терапевт', specialization: 'Терапевтична стоматологія', experience: 10, description: 'Спеціаліст з лікування карієсу та пульпіту', photo: '' },
  { id: 3, fullName: 'Бондаренко Андрій Вікторович', position: 'Хірург', specialization: 'Хірургічна стоматологія', experience: 12, description: 'Імплантація та видалення зубів', photo: '' },
];

const emptyForm = { fullName: '', position: '', specialization: '', experience: 0, description: '', photo: '' };

export default function Doctors() {
  const { t } = useI18n();
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (d: Doctor) => {
    setForm({ fullName: d.fullName, position: d.position, specialization: d.specialization, experience: d.experience, description: d.description, photo: d.photo });
    setEditingId(d.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.fullName || !form.position) return;
    if (editingId !== null) {
      setDoctors((prev) => prev.map((d) => (d.id === editingId ? { ...d, ...form } : d)));
    } else {
      setDoctors((prev) => [...prev, { id: Date.now(), ...form }]);
    }
    setShowForm(false);
  };

  const handleDelete = (id: number) => setDoctors((prev) => prev.filter((d) => d.id !== id));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-heading font-bold">{t('doctors')}</h1>
          <button onClick={openNew} className="btn-accent flex items-center gap-2 self-start">
            <Plus className="w-4 h-4" />
            {t('newDoctor')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel-sm p-5 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-sm">{doc.fullName}</h3>
                    <p className="text-xs text-primary">{doc.position}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(doc)} className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(doc.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="text-muted-foreground"><span className="text-foreground/70">{t('specialization')}:</span> {doc.specialization}</p>
                <p className="text-muted-foreground"><span className="text-foreground/70">{t('experience')}:</span> {doc.experience} {t('years')}</p>
                {doc.description && <p className="text-muted-foreground text-xs mt-2">{doc.description}</p>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="glass-panel w-full max-w-lg p-6 space-y-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-heading font-semibold text-lg">{editingId ? t('edit') : t('newDoctor')}</h2>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">{t('fullName')}</label>
                    <input className="input-glass w-full" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('position')}</label>
                    <input className="input-glass w-full" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('specialization')}</label>
                    <input className="input-glass w-full" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('experience')}</label>
                    <input type="number" className="input-glass w-full" value={form.experience} onChange={(e) => setForm({ ...form, experience: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('photo')} (URL)</label>
                    <input className="input-glass w-full" value={form.photo} onChange={(e) => setForm({ ...form, photo: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">{t('description')}</label>
                    <textarea className="input-glass w-full resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">{t('cancel')}</button>
                  <button onClick={handleSave} className="btn-accent">{t('save')}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
