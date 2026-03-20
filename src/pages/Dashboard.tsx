import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Clock, CalendarPlus, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { NewRecordForm } from '@/components/NewRecordForm';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/auth';

type ViewMode = 'today' | 'tomorrow';

interface AppointmentCard {
  id: number;
  client: string;
  doctor: string;
  time: string;
  phone: string;
  date: string;
}

interface DoctorOption {
  id: number;
  name: string;
}

function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

export default function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const token = getAdminToken();
  const [activeView, setActiveView] = useState<ViewMode>('tomorrow');
  const [showNewForm, setShowNewForm] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentCard[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [items, doctorItems] = await Promise.all([api.getAppointments(token), api.getSystemDoctors(token)]);
      setAppointments(
        items.map((item) => {
          const normalized = String(item.appointment_at ?? '').replace(' ', 'T');
          const [date = '', time = ''] = normalized.split('T');
          return {
            id: Number(item.id),
            client: item.patient_name ?? '',
            doctor: item.doctor_name ?? '',
            time: time.slice(0, 5),
            phone: item.phone ?? '',
            date,
          };
        }),
      );
      setDoctors(doctorItems.map((doctor) => ({ id: Number(doctor.id), name: doctor.name })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayKey = formatDateKey(today);
  const tomorrowKey = formatDateKey(tomorrow);

  const todayAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.date === todayKey),
    [appointments, todayKey],
  );
  const tomorrowAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.date === tomorrowKey),
    [appointments, tomorrowKey],
  );

  const displayedAppointments = activeView === 'today' ? todayAppointments : tomorrowAppointments;
  const displayDate = activeView === 'today' ? today : tomorrow;

  const handleCreateRecord = async (record: {
    clientName: string;
    phone: string;
    date: string;
    time: string;
    doctor: string;
    comment: string;
  }) => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const doctor = doctors.find((item) => item.name === record.doctor);
      await api.createAppointment(token, {
        patient_name: record.clientName,
        phone: record.phone,
        appointment_at: `${record.date}T${record.time}:00`,
        doctor_user_id: doctor?.id ?? null,
        notes: record.comment,
        status: 'scheduled',
      });
      await load();
      setShowNewForm(false);
      setActiveView(record.date === todayKey ? 'today' : 'tomorrow');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create appointment');
      throw err;
    } finally {
      setSaving(false);
    }
  };

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

          {error && <p className="text-sm text-destructive">{error}</p>}

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

          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel"
          >
            <div className="p-5 border-b border-border">
              <h2 className="font-heading font-semibold text-lg">
                {activeView === 'today' ? t('todayAppointments') : t('tomorrowAppointments')} - {displayDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
              </h2>
            </div>
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">{t('loading')}</div>
            ) : displayedAppointments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">{t('noAppointments')}</div>
            ) : (
              <div className="divide-y divide-border/50">
                {displayedAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="text-sm font-medium text-accent w-14">{appointment.time}</span>
                    <span className="text-sm font-medium flex-1">{appointment.client}</span>
                    <span className="text-sm text-muted-foreground hidden sm:block">{appointment.doctor || '-'}</span>
                    <span className="text-sm text-muted-foreground">{appointment.phone}</span>
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
            onClose={() => !saving && setShowNewForm(false)}
            onSave={handleCreateRecord}
            existingRecords={appointments.map((appointment) => ({
              date: appointment.date,
              time: appointment.time,
              doctor: appointment.doctor,
            }))}
            doctors={doctors.map((doctor) => doctor.name)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
