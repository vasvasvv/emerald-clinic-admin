import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Clock, CalendarPlus, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

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

export default function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
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
            onClick={() => navigate('/appointments')}
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

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stat-card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{t('todayAppointments')}</p>
            </div>
            <p className="text-3xl font-heading font-bold">{todayAppointments.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="stat-card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground">{t('tomorrowAppointments')}</p>
            </div>
            <p className="text-3xl font-heading font-bold">{tomorrowAppointments.length}</p>
          </motion.div>
        </div>

        {/* Tomorrow's appointments detail */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-panel"
        >
          <div className="p-5 border-b border-border">
            <h2 className="font-heading font-semibold text-lg">
              {t('tomorrowAppointments')} — {tomorrow.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
            </h2>
          </div>
          {tomorrowAppointments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">{t('noAppointments')}</div>
          ) : (
            <div className="divide-y divide-border/50">
              {tomorrowAppointments.map((apt) => (
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
  );
}
