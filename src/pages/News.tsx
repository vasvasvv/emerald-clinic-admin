import { useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Plus, Edit2, Trash2, X, Flame, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateNews, useDeleteNews, useNews, useUpdateNews } from '@/hooks/use-news';
import { WheelDateTimeField } from '@/components/ui/wheel-date-time-field';

interface NewsItem {
  id: number;
  type: 'news' | 'promo';
  label: 'info' | 'news' | 'update';
  title: string;
  description: string;
  expiryDate: string;
  hotOffer: boolean;
}

const emptyForm: Omit<NewsItem, 'id'> = {
  type: 'news',
  label: 'info',
  title: '',
  description: '',
  expiryDate: '',
  hotOffer: false,
};

const labelColors: Record<string, string> = {
  info: 'bg-info/20 text-info',
  news: 'bg-success/20 text-success',
  update: 'bg-warning/20 text-warning',
};

export default function News() {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: items = [], isLoading: loading, error: newsError } = useNews();
  const createNews = useCreateNews();
  const updateNews = useUpdateNews();
  const deleteNews = useDeleteNews();

  const news = useMemo<NewsItem[]>(
    () =>
      items.map((item) => ({
        id: Number(item.id),
        type: (item.kind ?? item.type ?? 'news') as 'news' | 'promo',
        label: (item.label ?? 'info') as 'info' | 'news' | 'update',
        title: String(item.title ?? ''),
        description: String(item.description ?? ''),
        expiryDate: String(item.expires_on ?? item.expiry_date ?? ''),
        hotOffer: Boolean(item.is_hot ?? item.hot),
      })),
    [items],
  );

  const loadError = newsError;

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (item: NewsItem) => {
    setForm({
      type: item.type,
      label: item.label,
      title: item.title,
      description: item.description,
      expiryDate: item.expiryDate,
      hotOffer: item.hotOffer,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    setError('');
    const payload = {
      kind: form.type,
      label: form.label,
      title: form.title,
      description: form.description,
      expires_on: form.expiryDate || null,
      is_hot: form.hotOffer,
    };
    try {
      if (editingId !== null) {
        await updateNews.mutateAsync({ id: editingId, data: payload });
      } else {
        await createNews.mutateAsync(payload);
      }
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save news');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError('');
    try {
      await deleteNews.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete news');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-heading font-bold">{t('news')}</h1>
          <button onClick={openNew} className="btn-accent flex items-center gap-2 self-start">
            <Plus className="w-4 h-4" />
            {t('newArticle')}
          </button>
        </div>

        {(error || loadError) && (
          <p className="text-sm text-destructive">
            {error || (loadError instanceof Error ? loadError.message : 'Failed to load news')}
          </p>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="glass-panel-sm p-5 text-muted-foreground">{t('loading')}</div>
          ) : (
            news.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-panel-sm p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${labelColors[item.label]}`}>
                        {t(`${item.label}Label` as 'infoLabel' | 'newsLabel' | 'updateLabel')}
                      </span>
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                        {item.type === 'news' ? t('newsType') : t('promoType')}
                      </span>
                      {item.hotOffer && (
                        <span className="flex items-center gap-1 text-xs font-medium text-primary">
                          <Flame className="w-3 h-3" /> {t('hotOffer')}
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    {item.expiryDate && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Tag className="w-3 h-3" /> {t('expiryDate')}: {item.expiryDate}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 gap-0.5 sm:gap-1">
                    <button
                      onClick={() => openEdit(item)}
                      className="rounded-xl p-2.5 sm:p-1.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(item.id)}
                      className="rounded-xl p-2.5 sm:p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
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
                className="glass-panel w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 sm:space-y-5 p-4 sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-base sm:text-lg font-semibold">
                    {editingId ? t('edit') : t('newArticle')}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/60"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('type')}</label>
                    <select
                      className="input-glass w-full"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as 'news' | 'promo' })}
                    >
                      <option value="news">{t('newsType')}</option>
                      <option value="promo">{t('promoType')}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('label')}</label>
                    <select
                      className="input-glass w-full"
                      value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value as 'info' | 'news' | 'update' })}
                    >
                      <option value="info">{t('infoLabel')}</option>
                      <option value="news">{t('newsLabel')}</option>
                      <option value="update">{t('updateLabel')}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">{t('title')}</label>
                    <input
                      className="input-glass w-full"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">{t('description')}</label>
                    <textarea
                      className="input-glass w-full resize-none"
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('expiryDate')}</label>
                    <WheelDateTimeField
                      mode="date"
                      className="w-full"
                      value={form.expiryDate}
                      onChange={(value) => setForm({ ...form, expiryDate: value })}
                      placeholder={t('expiryDate')}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, hotOffer: !form.hotOffer })}
                      className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${form.hotOffer ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform duration-200 ${form.hotOffer ? 'left-[22px]' : 'left-0.5'}`}
                      />
                    </button>
                    <label className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Flame className="h-3.5 w-3.5" /> {t('hotOffer')}
                    </label>
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
          title="Видалити новину"
          description="Ви впевнені, що хочете видалити цю новину? Цю дію неможливо скасувати."
          confirmLabel="Так, видалити"
        />
      </div>
    </AdminLayout>
  );
}
