import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Clock, CalendarPlus, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { NewRecordForm } from '@/components/NewRecordForm';

const mockDoctors = ['Др. Іваненко', 'Др. Шевченко', 'Др. Бондаренко', 'Др. Кравченко'];

const todayAppointments = [
  { id: 1, client: 'Олена Петренко', doctor: 'Др. Іваненко', time: '10:00', phone: '+380991234567' },
  { id: 2, client: 'Максим Коваль', doctor: 'Др. Шевченко', time: '11:30', phone: '+380991234568' },
  { id: 3, client: 'Анна Мельник', doctor: 'Др. Бондаренко', time: '14:00', phone: '+380991234569' },
  { id: 4, client: 'Дмитро Ткаченко', doctor: 'Др. Іваненко', time: '15:30', phone: '+380991234570' },
];

const tomorrowAppointments = [
  { id: 5, client: 'Марія Сидоренко', doctor: 'Др. Шевченко', time: '09:00', phone: '+380991234571' },
  { id: 6, client: 'Ігор Литвин', doctor: 'Др. Кравченко', time: '12:00', phone: '+380991234572' },
  { id: 7, client: 'Тетяна Бойко', doctor: 'Др. Іваненко', time: '16:00', phone: '+380991234573' },
];

const existingRecords = [
  ...todayAppointments.map(a => ({ date: new Date().toISOString().split('T')[0], time: a.time, doctor: a.doctor })),
  ...tomorrowAppointments.map(a => {
    const t = new Date(); t.setDate(t.getDate() + 1);
    return { date: t.toISOString().split('T')[0], time: a.time, doctor: a.doctor };
  }),
];

type ViewMode = 'today' | 'tomorrow';

export default function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewMode>('tomorrow');
  const [showNewForm, setShowNewForm] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const displayedAppointments = activeView === 'today' ? todayAppointments : tomorrowAppointments;
  const displayDate = activeView === 'today' ? new Date() : tomorrow;

  return (
    <>
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-heading font-bold">{t('dashboard')}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {new Date().toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Big Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setShowNewForm(true)}
              className="btn-accent flex items-center justify-center gap-3 py-6 text-lg font-heading font-semibold rounded-2xl"
            >
              <CalendarPlus className="w-6 h-6" />
              {t('addRecord')}
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => navigate('/notifications')}
              className="glass-panel flex items-center justify-center gap-3 py-6 text-lg font-heading font-semibold rounded-2xl text-foreground hover:bg-secondary/60 transition-colors cursor-pointer border-0"
            >
              <Bell className="w-6 h-6" />
              {t('sendNotification')}
            </motion.button>
          </div>

          {/* Stats row - clickable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => setActiveView('today')}
              className={`stat-card text-left transition-all ${activeView === 'today' ? 'ring-2 ring-primary/50' : ''}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">{t('todayAppointments')}</p>
              </div>
              <p className="text-3xl font-heading font-bold">{todayAppointments.length}</p>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={() => setActiveView('tomorrow')}
              className={`stat-card text-left transition-all ${activeView === 'tomorrow' ? 'ring-2 ring-accent/50' : ''}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <p className="text-sm text-muted-foreground">{t('tomorrowAppointments')}</p>
              </div>
              <p className="text-3xl font-heading font-bold">{tomorrowAppointments.length}</p>
            </motion.button>
          </div>

          {/* Appointments detail - switches based on activeView */}
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel"
          >
            <div className="p-5 border-b border-border">
              <h2 className="font-heading font-semibold text-lg">
                {activeView === 'today' ? t('todayAppointments') : t('tomorrowAppointments')} — {displayDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
              </h2>
            </div>
            {displayedAppointments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">{t('noAppointments')}</div>
            ) : (
              <div className="divide-y divide-border/50">
                {displayedAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="text-sm font-medium text-accent w-14">{apt.time}</span>
                    <span className="text-sm font-medium flex-1">{apt.client}</span>
                    <span className="text-sm text-muted-foreground hidden sm:block">{apt.doctor}</span>
                    <span className="text-sm text-muted-foreground">{apt.phone}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </AdminLayout>

      <AnimatePresence>
        {showNewForm && (
          <NewRecordForm
            onClose={() => setShowNewForm(false)}
            onSave={() => setShowNewForm(false)}
            existingRecords={existingRecords}
            doctors={mockDoctors}
          />
        )}
      </AnimatePresence>
    </>
  );
}
