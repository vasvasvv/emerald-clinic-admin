import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Plus, Edit2, Trash2, X, Flame, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/auth';

interface NewsItem {
  id: number;
  type: 'news' | 'promo';
  label: 'info' | 'news' | 'update';
  title: string;
  description: string;
  expiryDate: string;
  hotOffer: boolean;
}

const emptyForm: Omit<NewsItem, 'id'> = { type: 'news', label: 'info', title: '', description: '', expiryDate: '', hotOffer: false };

const labelColors: Record<string, string> = {
  info: 'bg-info/20 text-info',
  news: 'bg-success/20 text-success',
  update: 'bg-warning/20 text-warning',
};

export default function News() {
  const { t } = useI18n();
  const token = getAdminToken();
  const [news, setNews] = useState<NewsItem[]>([]);
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
      const items = await api.getNews(token);
      setNews(items.map((item) => ({
        id: Number(item.id),
        type: item.kind,
        label: item.label,
        title: item.title,
        description: item.description,
        expiryDate: item.expires_on ?? '',
        hotOffer: Boolean(item.is_hot),
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news');
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
    if (!token || !form.title) return;
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
        await api.updateNews(token, editingId, payload);
      } else {
        await api.createNews(token, payload);
      }
      await load();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save news');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    setError('');
    try {
      await api.deleteNews(token, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete news');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-heading font-bold">{t('news')}</h1>
          <button onClick={openNew} className="btn-accent flex items-center gap-2 self-start">
            <Plus className="w-4 h-4" />
            {t('newArticle')}
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-3">
          {loading ? (
            <div className="glass-panel-sm p-5 text-muted-foreground">{t('loading')}</div>
          ) : news.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel-sm p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${labelColors[item.label]}`}>
                      {t(`${item.label}Label` as 'infoLabel' | 'newsLabel' | 'updateLabel')}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {item.type === 'news' ? t('newsType') : t('promoType')}
                    </span>
                    {item.hotOffer && (
                      <span className="flex items-center gap-1 text-xs text-primary font-medium">
                        <Flame className="w-3 h-3" /> {t('hotOffer')}
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  {item.expiryDate && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {t('expiryDate')}: {item.expiryDate}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => void handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
                  <h2 className="font-heading font-semibold text-lg">{editingId ? t('edit') : t('newArticle')}</h2>
                  <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('type')}</label>
                    <select className="input-glass w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'news' | 'promo' })}>
                      <option value="news">{t('newsType')}</option>
                      <option value="promo">{t('promoType')}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('label')}</label>
                    <select className="input-glass w-full" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value as 'info' | 'news' | 'update' })}>
                      <option value="info">{t('infoLabel')}</option>
                      <option value="news">{t('newsLabel')}</option>
                      <option value="update">{t('updateLabel')}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">{t('title')}</label>
                    <input className="input-glass w-full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm text-muted-foreground">{t('description')}</label>
                    <textarea className="input-glass w-full resize-none" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm text-muted-foreground">{t('expiryDate')}</label>
                    <input type="date" className="input-glass w-full" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, hotOffer: !form.hotOffer })}
                      className={`w-11 h-6 rounded-full transition-colors duration-200 relative ${form.hotOffer ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform duration-200 ${form.hotOffer ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                    <label className="text-sm text-muted-foreground flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> {t('hotOffer')}
                    </label>
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
