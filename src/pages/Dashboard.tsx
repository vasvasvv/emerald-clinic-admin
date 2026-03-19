import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Calendar, Users, Newspaper, Bell, TrendingUp, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const stats = [
  { key: 'totalAppointments' as const, value: 156, icon: Calendar, trend: '+12%' },
  { key: 'todayAppointments' as const, value: 8, icon: Clock, trend: '+3' },
  { key: 'totalDoctors' as const, value: 12, icon: Users, trend: '' },
  { key: 'totalNews' as const, value: 24, icon: Newspaper, trend: '+2' },
];

const recentAppointments = [
  { id: 1, client: 'Олена Петренко', doctor: 'Др. Іваненко', time: '10:00', status: 'scheduled' },
  { id: 2, client: 'Максим Коваль', doctor: 'Др. Шевченко', time: '11:30', status: 'completed' },
  { id: 3, client: 'Анна Мельник', doctor: 'Др. Бондаренко', time: '14:00', status: 'scheduled' },
  { id: 4, client: 'Дмитро Ткаченко', doctor: 'Др. Іваненко', time: '15:30', status: 'cancelled' },
  { id: 5, client: 'Марія Сидоренко', doctor: 'Др. Шевченко', time: '16:00', status: 'scheduled' },
];

const statusColors: Record<string, string> = {
  scheduled: 'bg-info/20 text-info',
  completed: 'bg-success/20 text-success',
  cancelled: 'bg-destructive/20 text-destructive',
};

export default function Dashboard() {
  const { t } = useI18n();

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-heading font-bold">{t('dashboard')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="stat-card"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                {stat.trend && (
                  <span className="flex items-center gap-1 text-xs text-success font-medium">
                    <TrendingUp className="w-3 h-3" />
                    {stat.trend}
                  </span>
                )}
              </div>
              <p className="text-2xl font-heading font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{t(stat.key)}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Appointments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel"
        >
          <div className="p-5 border-b border-border">
            <h2 className="font-heading font-semibold text-lg">{t('recentAppointments')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-muted-foreground font-medium px-5 py-3">{t('clientName')}</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-5 py-3">{t('doctor')}</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-5 py-3">{t('time')}</th>
                  <th className="text-left text-xs text-muted-foreground font-medium px-5 py-3">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {recentAppointments.map((apt) => (
                  <tr key={apt.id} className="table-row-hover border-b border-border/50 last:border-0">
                    <td className="px-5 py-3.5 text-sm font-medium">{apt.client}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{apt.doctor}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{apt.time}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[apt.status]}`}>
                        {t(apt.status as 'scheduled' | 'completed' | 'cancelled')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
