import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { Clock, CalendarPlus, Bell, Stethoscope, Phone } from 'lucide-react';
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

const doctorBadgePalette = [
  'border-l-[#f4c95d] bg-[#f4c95d]/10 text-[#f8d985]',
  'border-l-[#6ccff6] bg-[#6ccff6]/10 text-[#9fddfa]',
  'border-l-[#8ce99a] bg-[#8ce99a]/10 text-[#b7f1c1]',
  'border-l-[#ff9f6e] bg-[#ff9f6e]/10 text-[#ffc19c]',
  'border-l-[#d0a6ff] bg-[#d0a6ff]/10 text-[#e2c9ff]',
];

function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function buildPatientName(lastName: string, firstName: string) {
  return `${lastName.trim()} ${firstName.trim()}`.trim();
}

function toAppointmentDate(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

export default function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const token = getAdminToken();
  const [activeView, setActiveView] = useState<ViewMode>('today');
  const [showNewForm, setShowNewForm] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentCard[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => new Date());

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

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const today = now;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayKey = formatDateKey(today);
  const tomorrowKey = formatDateKey(tomorrow);

  const doctorAccentMap = useMemo(() => {
    const allDoctors = Array.from(new Set(appointments.map((appointment) => appointment.doctor || 'Без лікаря')));
    return new Map(allDoctors.map((doctor, index) => [doctor, doctorBadgePalette[index % doctorBadgePalette.length]]));
  }, [appointments]);

  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.date === todayKey)
        .filter((appointment) => {
          const appointmentDate = toAppointmentDate(appointment.date, appointment.time);
          return appointmentDate.getTime() + 17 * 60 * 1000 > now.getTime();
        })
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, todayKey, now],
  );

  const tomorrowAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.date === tomorrowKey).sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, tomorrowKey],
  );

  const displayedAppointments = activeView === 'today' ? todayAppointments : tomorrowAppointments;
  const displayDate = activeView === 'today' ? today : tomorrow;

  const handleCreateRecord = async (record: {
    firstName: string;
    lastName: string;
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
        patient_name: buildPatientName(record.lastName, record.firstName),
        phone: record.phone,
        appointment_at: `${record.date}T${record.time}:00`,
        doctor_user_id: doctor?.id ?? null,
        notes: record.comment,
        status: 'scheduled',
      });
      await load();
      setShowNewForm(false);
      setActiveView(record.date === tomorrowKey ? 'tomorrow' : 'today');
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
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date().toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setShowNewForm(true)}
              className="btn-accent flex items-center justify-center gap-3 rounded-2xl py-6 text-lg font-heading font-semibold"
            >
              <CalendarPlus className="h-6 w-6" />
              {t('addRecord')}
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => window.alert('Функція знімка буде підключена пізніше.')}
              className="glass-panel flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-0 py-6 text-lg font-heading font-semibold text-foreground transition-colors hover:bg-secondary/60"
            >
              <Bell className="h-6 w-6" />
              {'Зробити знімок'}
            </motion.button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => setActiveView('today')}
              className={`dashboard-toggle-card text-left ${activeView === 'today' ? 'dashboard-toggle-card-active' : 'dashboard-toggle-card-idle'}`}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                  <Clock className="h-5 w-5 text-primary" />
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
              className={`dashboard-toggle-card text-left ${activeView === 'tomorrow' ? 'dashboard-toggle-card-active' : 'dashboard-toggle-card-idle'}`}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <p className="text-sm text-muted-foreground">{t('tomorrowAppointments')}</p>
              </div>
              <p className="text-3xl font-heading font-bold">{tomorrowAppointments.length}</p>
            </motion.button>
          </div>

          <motion.div key={activeView} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel">
            <div className="border-b border-border p-5">
              <h2 className="font-heading text-lg font-semibold">
                {activeView === 'today' ? t('todayAppointments') : t('tomorrowAppointments')} - {displayDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
              </h2>
            </div>
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">{t('loading')}</div>
            ) : displayedAppointments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">{t('noAppointments')}</div>
            ) : (
              <div className="space-y-3 p-4 sm:p-5">
                {displayedAppointments.map((appointment) => {
                  const doctorAccent = doctorAccentMap.get(appointment.doctor || 'Без лікаря') ?? doctorBadgePalette[0];
                  return (
                    <div key={appointment.id} className="rounded-2xl border border-border/60 bg-secondary/18 px-4 py-4 transition-colors duration-300 hover:bg-secondary/24">
                      <div className="grid gap-3 lg:grid-cols-[90px_1fr_1.2fr_1fr] lg:items-center">
                        <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                          <Clock className="h-4 w-4" />
                          {appointment.time}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Лікар</p>
                          <div className={`mt-1 inline-flex items-center gap-2 rounded-full border border-white/5 border-l-4 px-3 py-1.5 text-xs font-semibold ${doctorAccent}`}>
                            <Stethoscope className="h-3.5 w-3.5" />
                            {appointment.doctor || 'Без лікаря'}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Пацієнт</p>
                          <p className="text-sm font-medium text-foreground">{appointment.client}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Телефон</p>
                          <div className="mt-1 flex items-center gap-2 text-sm text-foreground">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {appointment.phone}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
