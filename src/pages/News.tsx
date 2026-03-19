import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Plus, Edit2, Trash2, X, Flame, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NewsItem {
  id: number;
  type: 'news' | 'promo';
  label: 'info' | 'news' | 'update';
  title: string;
  description: string;
  expiryDate: string;
  hotOffer: boolean;
}

const initialNews: NewsItem[] = [
  { id: 1, type: 'promo', label: 'info', title: 'Знижка 20% на відбілювання', description: 'Акція діє до кінця місяця. Професійне відбілювання зубів зі знижкою.', expiryDate: '2026-04-01', hotOffer: true },
  { id: 2, type: 'news', label: 'news', title: 'Новий лікар у нашій команді', description: 'Раді представити нового спеціаліста з ортодонтії.', expiryDate: '', hotOffer: false },
  { id: 3, type: 'news', label: 'update', title: 'Оновлення графіку роботи', description: 'З 1 квітня клініка працює в новому графіку.', expiryDate: '2026-04-01', hotOffer: false },
];

const emptyForm = { type: 'news' as const, label: 'info' as const, title: '', description: '', expiryDate: '', hotOffer: false };

const labelColors: Record<string, string> = {
  info: 'bg-info/20 text-info',
  news: 'bg-success/20 text-success',
  update: 'bg-warning/20 text-warning',
};

export default function News() {
  const { t } = useI18n();
  const [news, setNews] = useState<NewsItem[]>(initialNews);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (n: NewsItem) => {
    setForm({ type: n.type, label: n.label, title: n.title, description: n.description, expiryDate: n.expiryDate, hotOffer: n.hotOffer });
    setEditingId(n.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title) return;
    if (editingId !== null) {
      setNews((prev) => prev.map((n) => (n.id === editingId ? { ...n, ...form } : n)));
    } else {
      setNews((prev) => [...prev, { id: Date.now(), ...form }]);
    }
    setShowForm(false);
  };

  const handleDelete = (id: number) => setNews((prev) => prev.filter((n) => n.id !== id));

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

        <div className="space-y-3">
          {news.map((item, i) => (
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
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
