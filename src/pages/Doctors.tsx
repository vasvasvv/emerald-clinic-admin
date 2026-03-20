import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Plus, Edit2, Trash2, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/auth';

interface Doctor {
  id: number;
  fullName: string;
  position: string;
  specialization: string;
  experience: number;
  description: string;
  photo: string;
}

const emptyForm = { fullName: '', position: '', specialization: '', experience: 0, description: '', photo: '' };

export default function Doctors() {
  const { t } = useI18n();
  const token = getAdminToken();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const items = await api.getSiteDoctors(token);
      setDoctors(items.map((item) => ({
        id: Number(item.id),
        fullName: item.full_name ?? '',
        position: item.position ?? '',
        specialization: item.specialization ?? '',
        experience: Number(item.experience_years ?? 0),
        description: item.description ?? '',
        photo: item.photo_url ?? '',
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (doctor: Doctor) => {
    setForm({
      fullName: doctor.fullName,
      position: doctor.position,
      specialization: doctor.specialization,
      experience: doctor.experience,
      description: doctor.description,
      photo: doctor.photo,
    });
    setEditingId(doctor.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!token || !form.fullName || !form.position) return;
    setSaving(true);
    setError('');
    const payload = {
      full_name: form.fullName,
      position: form.position,
      specialization: form.specialization,
      experience_years: form.experience,
      description: form.description,
      photo_url: form.photo,
      is_published: true,
    };
    try {
      if (editingId !== null) {
        await api.updateSiteDoctor(token, editingId, payload);
      } else {
        await api.createSiteDoctor(token, payload);
      }
      await load();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save doctor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    setError('');
    try {
      await api.deleteSiteDoctor(token, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete doctor');
    }
  };

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

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="glass-panel-sm p-5 text-muted-foreground">{t('loading')}</div>
          ) : doctors.map((doctor, i) => (
            <motion.div
              key={doctor.id}
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
                    <h3 className="font-heading font-semibold text-sm">{doctor.fullName}</h3>
                    <p className="text-xs text-primary">{doctor.position}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(doctor)} className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => void handleDelete(doctor.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="text-muted-foreground"><span className="text-foreground/70">{t('specialization')}:</span> {doctor.specialization}</p>
                <p className="text-muted-foreground"><span className="text-foreground/70">{t('experience')}:</span> {doctor.experience} {t('years')}</p>
                {doctor.description && <p className="text-muted-foreground text-xs mt-2">{doctor.description}</p>}
              </div>
            </motion.div>
          ))}
        </div>

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
                    <input type="number" className="input-glass w-full" value={form.experience} onChange={(e) => setForm({ ...form, experience: parseInt(e.target.value, 10) || 0 })} />
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
                  <button onClick={() => void handleSave()} className="btn-accent" disabled={saving}>{t('save')}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
