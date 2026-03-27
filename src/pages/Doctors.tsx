import { useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Plus, Edit2, Trash2, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useCreateSiteDoctor,
  useDeleteSiteDoctor,
  useSiteDoctors,
  useUpdateSiteDoctor,
} from '@/hooks/use-doctors';
import type { ApiSiteDoctor } from '@/types/api';

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
const MAX_DOCTOR_PHOTO_SIZE_MB = 5;

export default function Doctors() {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');

  const { data: items = [], isLoading: loading, error: doctorsError } = useSiteDoctors();
  const createDoctor = useCreateSiteDoctor();
  const updateDoctor = useUpdateSiteDoctor();
  const deleteDoctor = useDeleteSiteDoctor();

  const doctors = useMemo<Doctor[]>(
    () =>
      items.map((item: ApiSiteDoctor & Record<string, unknown>) => ({
        id: Number(item.id),
        fullName: String(item.full_name ?? item.name ?? ''),
        position: String(item.position ?? ''),
        specialization: String(item.specialization ?? ''),
        experience: Number(item.experience_years ?? item.experience ?? 0),
        description: String(item.description ?? ''),
        photo: String(item.photo_url ?? ''),
      })),
    [items],
  );

  const loadError = doctorsError;

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
    if (!form.fullName || !form.position) return;
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
        await updateDoctor.mutateAsync({ id: editingId, data: payload });
      } else {
        await createDoctor.mutateAsync(payload);
      }
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save doctor');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File | null) => {
    if (!file) return;
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    if (file.size > MAX_DOCTOR_PHOTO_SIZE_MB * 1024 * 1024) {
      setError(`Photo is too large. Max size is ${MAX_DOCTOR_PHOTO_SIZE_MB}MB.`);
      return;
    }

    setUploadingPhoto(true);
    try {
      const photoUrl = await import('@/lib/api').then(({ api }) => {
        const token = localStorage.getItem('dental_admin_token');
        if (!token) throw new Error('Missing auth token');
        return api.uploadDoctorPhoto(token, file);
      });
      setForm((prev) => ({ ...prev, photo: photoUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError('');
    try {
      await deleteDoctor.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete doctor');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-heading font-bold">{t('doctors')}</h1>
          <button onClick={openNew} className="btn-accent flex items-center gap-2 self-start">
            <Plus className="w-4 h-4" />
            {t('newDoctor')}
          </button>
        </div>

        {(error || loadError) && (
          <p className="text-sm text-destructive">
            {error || (loadError instanceof Error ? loadError.message : 'Failed to load doctors')}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="glass-panel-sm p-5 text-muted-foreground">{t('loading')}</div>
          ) : doctors.map((doctor, i) => (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel-sm space-y-4 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {doctor.photo ? (
                    <img
                      src={doctor.photo}
                      alt={doctor.fullName}
                      className="h-12 w-12 rounded-xl border border-border/50 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-heading text-sm font-semibold">{doctor.fullName}</h3>
                    <p className="text-xs text-primary">{doctor.position}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(doctor)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => void handleDelete(doctor.id)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="text-muted-foreground"><span className="text-foreground/70">{t('specialization')}:</span> {doctor.specialization}</p>
                <p className="text-muted-foreground"><span className="text-foreground/70">{t('experience')}:</span> {doctor.experience} {t('years')}</p>
                {doctor.description && <p className="mt-2 text-xs text-muted-foreground">{doctor.description}</p>}
              </div>
            </motion.div>
          ))}
        </div>

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
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-panel w-full max-w-lg space-y-5 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-semibold">{editingId ? t('edit') : t('newDoctor')}</h2>
                  <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/60"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('photo')} ({t('upload')})</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="input-glass w-full file:mr-3 file:rounded-lg file:border-0 file:bg-primary/15 file:px-3 file:py-1.5 file:text-xs file:text-primary"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        void handlePhotoUpload(file);
                        e.currentTarget.value = '';
                      }}
                      disabled={uploadingPhoto}
                    />
                    {uploadingPhoto && <p className="text-xs text-muted-foreground">{t('loading')}</p>}
                  </div>
                  {form.photo && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <p className="text-sm text-muted-foreground">{t('photo')} {t('preview').toLowerCase()}</p>
                      <img src={form.photo} alt="Doctor preview" className="h-40 w-full rounded-xl border border-border/50 object-cover" />
                    </div>
                  )}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">{t('description')}</label>
                    <textarea className="input-glass w-full resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowForm(false)} className="rounded-xl px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60">{t('cancel')}</button>
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
