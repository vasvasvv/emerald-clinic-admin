import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { ChevronLeft, ChevronRight, Users, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NewRecordForm } from '@/components/NewRecordForm';
import { formatDateKey, getDaysInMonth, getMonday } from '@/lib/date-utils';
import { useCreateAppointment, useAppointments } from '@/hooks/use-appointments';
import { useSystemDoctors } from '@/hooks/use-doctors';
import { useAuth } from '@/lib/auth-context';
import { findDoctorOptionForUser, mapDoctorOptions, resolveDoctorIdForAppointment } from '@/lib/admin-user';
import { buildPatientName, extractFirstName } from '@/lib/patient-utils';
import type { DoctorOption } from '@/types/api';

interface AppointmentRecord {
  id: number;
  clientName: string;
  phone: string;
  date: string;
  time: string;
  doctor: string;
  comment?: string;
}

const dayNames: Record<string, string[]> = {
  uk: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export default function Records() {
  const { t, lang } = useI18n();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [doctorFilterInitialized, setDoctorFilterInitialized] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { data: appointmentItems = [], isLoading: loading, error: appointmentsError } = useAppointments();
  const { data: doctorItems = [], error: doctorsError } = useSystemDoctors();
  const createAppointment = useCreateAppointment();

  const monday = getMonday(currentDate);
  const records = useMemo<AppointmentRecord[]>(
    () =>
      appointmentItems.map((item) => {
        const normalized = String(item.appointment_at ?? '').replace(' ', 'T');
        const [date = '', time = ''] = normalized.split('T');
        return {
          id: Number(item.id),
          clientName: item.patient_name ?? '',
          phone: item.phone ?? '',
          date,
          time: time.slice(0, 5),
          doctor: item.doctor_name ?? '',
          comment: item.notes ?? '',
        };
      }),
    [appointmentItems],
  );

  const doctorOptions = useMemo<DoctorOption[]>(() => mapDoctorOptions(doctorItems), [doctorItems]);
  const defaultDoctor = useMemo(() => findDoctorOptionForUser(doctorOptions, user), [doctorOptions, user]);

  useEffect(() => {
    if (!defaultDoctor || selectedDoctor || doctorFilterInitialized) return;
    setSelectedDoctor(defaultDoctor.name);
    setDoctorFilterInitialized(true);
  }, [defaultDoctor, doctorFilterInitialized, selectedDoctor]);

  const loadError = appointmentsError ?? doctorsError;

  const weekDays = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + index);
        return day;
      }),
    [monday],
  );

  const filteredRecords = useMemo(
    () => records.filter((record) => !selectedDoctor || record.doctor === selectedDoctor),
    [records, selectedDoctor],
  );

  const getRecordsForDate = (dateStr: string) =>
    filteredRecords.filter((record) => record.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));

  const monthDays = useMemo(() => getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);

  const navigateWeek = (direction: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + direction * 7);
    setCurrentDate(next);
  };

  const navigateMonth = (direction: number) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + direction);
    setCurrentDate(next);
  };

  const locale = lang === 'uk' ? 'uk-UA' : 'en-US';
  const weekRangeLabel = `${weekDays[0].toLocaleDateString(locale, { day: 'numeric', month: 'short' })} - ${weekDays[5].toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const monthLabel = currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const today = formatDateKey(new Date());

  const handleNewRecord = async (record: {
    firstName: string;
    lastName: string;
    phone: string;
    date: string;
    time: string;
    doctor: string;
    comment: string;
  }) => {
    setSaving(true);
    setError('');
    try {
      await createAppointment.mutateAsync({
        patient_name: buildPatientName(record.lastName, record.firstName),
        phone: record.phone,
        appointment_at: `${record.date}T${record.time}:00`,
        doctor_user_id: resolveDoctorIdForAppointment(doctorOptions, record.doctor, user),
        notes: record.comment,
        status: 'scheduled',
      });
      setShowNewForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create record');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <h1 className="text-xl sm:text-2xl font-heading font-bold">{t('records')}</h1>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={() => setShowNewForm(true)}
                className="btn-accent flex items-center gap-2 text-xs sm:text-sm py-2 sm:py-2.5"
                disabled={saving}
              >
                <Plus className="w-4 h-4" />
                {t('newRecord')}
              </button>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="input-glass text-xs sm:text-sm py-1.5 pr-8 h-9 sm:h-10"
                >
                  <option value="">{t('allDoctors')}</option>
                  {doctorOptions.map((doctor) => (
                    <option key={doctor.id} value={doctor.name}>
                      {doctor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex rounded-xl overflow-hidden border border-border">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                    viewMode === 'week'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60'
                  }`}
                >
                  {t('week')}
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                    viewMode === 'month'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60'
                  }`}
                >
                  {t('month')}
                </button>
              </div>
            </div>
          </div>

          {(error || loadError) && (
            <p className="text-sm text-destructive">
              {error || (loadError instanceof Error ? loadError.message : 'Failed to load records')}
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => (viewMode === 'week' ? navigateWeek(-1) : navigateMonth(-1))}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <span className="font-heading font-semibold text-sm sm:text-lg capitalize text-center">
              {viewMode === 'week' ? weekRangeLabel : monthLabel}
            </span>
            <button
              onClick={() => (viewMode === 'week' ? navigateWeek(1) : navigateMonth(1))}
              className="p-1.5 sm:p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {viewMode === 'week' ? (
            <motion.div
              key={monday.getTime()}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"
            >
              {weekDays.map((day, index) => {
                const dateStr = formatDateKey(day);
                const dayRecords = getRecordsForDate(dateStr);
                const isToday = dateStr === today;

                return (
                  <div
                    key={dateStr}
                    className={`glass-panel overflow-hidden ${isToday ? 'ring-1 ring-primary/50' : ''}`}
                  >
                    <div
                      className={`px-3 sm:px-4 py-2 sm:py-3 border-b border-border flex items-center gap-2 ${isToday ? 'bg-primary/10' : ''}`}
                    >
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                        {dayNames[lang]?.[index] || dayNames.en[index]}
                      </span>
                      <span className={`font-heading font-semibold text-sm ${isToday ? 'text-primary' : ''}`}>
                        {day.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                      </span>
                      {isToday && (
                        <span className="text-[10px] sm:text-xs bg-primary/20 text-primary px-1.5 sm:px-2 py-0.5 rounded-full font-medium ml-auto">
                          {t('today')}
                        </span>
                      )}
                    </div>
                    {loading ? (
                      <div className="px-3 sm:px-4 py-4 sm:py-6 text-center text-xs sm:text-sm text-muted-foreground">
                        {t('loading')}
                      </div>
                    ) : dayRecords.length === 0 ? (
                      <div className="px-3 sm:px-4 py-4 sm:py-6 text-center text-xs sm:text-sm text-muted-foreground/60">
                        {t('noRecords')}
                      </div>
                    ) : (
                      <div className="divide-y divide-border/40">
                        {dayRecords.map((record) => (
                          <div
                            key={record.id}
                            className="px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3 hover:bg-secondary/30 transition-colors"
                          >
                            <span className="text-xs sm:text-sm font-semibold text-accent w-10 sm:w-12 shrink-0">
                              {record.time}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-medium truncate">{record.clientName}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">{record.phone}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key={currentDate.getMonth()}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel overflow-hidden"
            >
              <div className="grid grid-cols-7 border-b border-border">
                {(dayNames[lang] || dayNames.en).concat(lang === 'uk' ? 'Нд' : 'Sun').map((name) => (
                  <div
                    key={name}
                    className="px-1 sm:px-2 py-1.5 sm:py-2 text-center text-[10px] sm:text-xs text-muted-foreground font-medium"
                  >
                    {name.slice(0, 2)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: (monthDays[0]?.getDay() || 7) - 1 }, (_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="border-b border-r border-border/30 min-h-[60px] sm:min-h-[80px]"
                  />
                ))}
                {monthDays.map((day) => {
                  const dateStr = formatDateKey(day);
                  const dayRecords = getRecordsForDate(dateStr);
                  const isToday = dateStr === today;
                  const isSunday = day.getDay() === 0;

                  return (
                    <div
                      key={dateStr}
                      className={`border-b border-r border-border/30 min-h-[60px] sm:min-h-[80px] p-1 sm:p-1.5 ${isToday ? 'bg-primary/5' : ''} ${isSunday ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`text-[10px] sm:text-xs font-medium ${isToday ? 'bg-primary text-primary-foreground px-1 sm:px-1.5 py-0.5 rounded-md' : 'text-muted-foreground'}`}
                      >
                        {day.getDate()}
                      </span>
                      <div className="mt-0.5 sm:mt-1 space-y-0.5">
                        {dayRecords.slice(0, 2).map((record) => (
                          <div
                            key={record.id}
                            className="text-[9px] sm:text-[10px] bg-accent/15 text-accent rounded px-0.5 sm:px-1 py-0.5 truncate"
                          >
                            {record.time} {extractFirstName(record.clientName)}
                          </div>
                        ))}
                        {dayRecords.length > 2 && (
                          <div className="text-[9px] sm:text-[10px] text-muted-foreground pl-0.5 sm:pl-1">
                            +{dayRecords.length - 2}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </AdminLayout>

      <AnimatePresence>
        {showNewForm && (
          <NewRecordForm
            onClose={() => !saving && setShowNewForm(false)}
            onSave={handleNewRecord}
            existingRecords={records.map((record) => ({ date: record.date, time: record.time, doctor: record.doctor }))}
            doctors={doctorOptions.map((doctor) => doctor.name)}
            defaultDoctor={defaultDoctor?.name ?? ''}
          />
        )}
      </AnimatePresence>
    </>
  );
}
