import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { ChevronLeft, ChevronRight, Users, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NewRecordForm } from '@/components/NewRecordForm';
import { formatDateKey, getMonday } from '@/lib/date-utils';
import { useCreateAppointment, useAppointments } from '@/hooks/use-appointments';
import { useSystemDoctors } from '@/hooks/use-doctors';
import { useAuth } from '@/lib/auth-context';
import { findDoctorOptionForUser, mapDoctorOptions, resolveDoctorIdForAppointment } from '@/lib/admin-user';
import { buildPatientName } from '@/lib/patient-utils';
import type { DoctorOption } from '@/types/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [doctorFilterInitialized, setDoctorFilterInitialized] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AppointmentRecord | null>(null);
  const [selectedDayTab, setSelectedDayTab] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { data: appointmentItems = [], isLoading: loading, error: appointmentsError } = useAppointments();
  const { data: doctorItems = [], error: doctorsError } = useSystemDoctors();
  const createAppointment = useCreateAppointment();

  const monday = useMemo(() => getMonday(currentDate), [currentDate]);

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

  useEffect(() => {
    const todayStr = formatDateKey(new Date());
    const todayInWeek = weekDays.find((d) => formatDateKey(d) === todayStr);
    setSelectedDayTab(todayInWeek ? todayStr : formatDateKey(weekDays[0]));
  }, [monday]);

  const filteredRecords = useMemo(
    () => records.filter((record) => !selectedDoctor || record.doctor === selectedDoctor),
    [records, selectedDoctor],
  );

  const getRecordsForDate = (dateStr: string) =>
    filteredRecords.filter((record) => record.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));

  const navigateWeek = (direction: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + direction * 7);
    setCurrentDate(next);
  };

  const locale = lang === 'uk' ? 'uk-UA' : 'en-US';
  const weekRangeLabel =
    lang === 'uk'
      ? `${weekDays[0].getDate()}-${weekDays[5].getDate()} ${weekDays[5].toLocaleDateString(locale, { month: 'long' })} ${weekDays[5].getFullYear()}р.`
      : `${weekDays[0].getDate()}-${weekDays[5].getDate()} ${weekDays[5].toLocaleDateString(locale, { month: 'long' })} ${weekDays[5].getFullYear()}`;
  const today = formatDateKey(new Date());
  const selectedDayTabRecords = getRecordsForDate(selectedDayTab);

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
        <div className="space-y-4 sm:space-y-5">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-heading font-bold">{t('records')}</h1>
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => navigateWeek(-1)}
                  className="p-1.5 rounded-xl border border-border/70 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-heading font-semibold text-sm capitalize min-w-[160px] sm:min-w-[180px] text-center">
                  {weekRangeLabel}
                </span>
                <button
                  onClick={() => navigateWeek(1)}
                  className="p-1.5 rounded-xl border border-border/70 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="input-glass text-sm py-1.5 pr-2 h-9"
                >
                  <option value="">{t('allDoctors')}</option>
                  {doctorOptions.map((doctor) => (
                    <option key={doctor.id} value={doctor.name}>
                      {doctor.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowNewForm(true)}
                className="btn-accent flex items-center gap-2 py-2 px-3 text-sm"
                disabled={saving}
              >
                <Plus className="w-4 h-4" />
                {t('newRecord')}
              </button>
            </div>
          </div>

          <div className="flex sm:hidden items-center justify-center gap-1">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-1.5 rounded-xl border border-border/70 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-heading font-semibold text-sm capitalize min-w-[160px] text-center">
              {weekRangeLabel}
            </span>
            <button
              onClick={() => navigateWeek(1)}
              className="p-1.5 rounded-xl border border-border/70 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {(error || loadError) && (
            <p className="text-sm text-destructive">
              {error || (loadError instanceof Error ? loadError.message : 'Failed to load records')}
            </p>
          )}

          {/* Desktop: 6-column weekly grid */}
          <motion.div
            key={monday.getTime()}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:block glass-panel overflow-hidden"
          >
            <div className="grid grid-cols-6 border-b border-border/50">
              {weekDays.map((day, index) => {
                const dateStr = formatDateKey(day);
                const isToday = dateStr === today;
                return (
                  <div
                    key={dateStr}
                    className={`px-2 py-3 text-center border-r border-border/35 last:border-r-0 ${isToday ? 'bg-primary/[0.07]' : ''}`}
                  >
                    <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                      {dayNames[lang]?.[index] ?? dayNames.en[index]}
                    </div>
                    <div className={`font-heading font-bold text-[18px] mt-0.5 ${isToday ? 'text-primary' : ''}`}>
                      {day.getDate()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {day.toLocaleDateString(locale, { month: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-6 min-h-[260px]">
              {weekDays.map((day) => {
                const dateStr = formatDateKey(day);
                const dayRecords = getRecordsForDate(dateStr);
                const isToday = dateStr === today;
                return (
                  <div
                    key={dateStr}
                    className={`p-1.5 border-r border-border/20 last:border-r-0 flex flex-col gap-1 ${isToday ? 'bg-primary/[0.025]' : ''}`}
                  >
                    {loading ? null : dayRecords.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full border border-dashed border-border/40" />
                      </div>
                    ) : (
                      dayRecords.map((record) => (
                        <button
                          key={record.id}
                          onClick={() => setSelectedRecord(record)}
                          className="w-full text-left px-1.5 py-1.5 rounded-lg text-[11px] cursor-pointer hover:bg-secondary/40 border-l-2 border-accent/55 bg-secondary/18 transition-colors"
                        >
                          <span className="font-semibold text-accent">{record.time}</span>
                          <span className="ml-1 text-foreground/85 truncate block leading-tight">
                            {record.clientName}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Mobile: day tabs + record list */}
          <div className="md:hidden space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
              {weekDays.map((day, index) => {
                const dateStr = formatDateKey(day);
                const isActive = selectedDayTab === dateStr;
                const isToday = dateStr === today;
                const cnt = getRecordsForDate(dateStr).length;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDayTab(dateStr)}
                    className={`flex-shrink-0 px-3 py-2.5 rounded-xl text-center outline-none transition-all min-w-[52px] ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-card/60 border border-border/50 text-muted-foreground'
                    }`}
                  >
                    <div className={`text-[10px] font-semibold ${!isActive && isToday ? 'text-primary' : ''}`}>
                      {dayNames[lang]?.[index] ?? dayNames.en[index]}
                    </div>
                    <div className={`text-base font-heading font-bold ${!isActive && isToday ? 'text-primary' : ''}`}>
                      {day.getDate()}
                    </div>
                    {cnt > 0 && (
                      <div
                        className={`w-4 h-[3px] rounded-full mx-auto mt-1 ${isActive ? 'bg-primary-foreground/40' : 'bg-accent/60'}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="glass-panel overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">{t('loading')}</div>
              ) : selectedDayTabRecords.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">{t('noRecords')}</div>
              ) : (
                <div className="divide-y divide-border/40">
                  {selectedDayTabRecords.map((record) => {
                    return (
                      <button
                        key={record.id}
                        onClick={() => setSelectedRecord(record)}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors"
                      >
                        <span className="text-sm font-semibold text-accent w-12 shrink-0">{record.time}</span>
                        <span className="text-sm text-foreground">{record.clientName}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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

      <Dialog open={Boolean(selectedRecord)} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[85vh] overflow-hidden p-0">
          <div className="flex max-h-[85vh] flex-col">
            <DialogHeader className="border-b border-border px-4 py-4 sm:px-6">
              <DialogTitle className="font-heading text-base sm:text-lg">{selectedRecord?.clientName}</DialogTitle>
              <DialogDescription>
                {selectedRecord &&
                  new Date(`${selectedRecord.date}T00:00:00`).toLocaleDateString(locale, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto px-4 py-4 sm:px-6">
              {selectedRecord ? (
                <div className="rounded-2xl border border-border bg-card/70 p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-semibold">{selectedRecord.clientName}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{selectedRecord.phone || '-'}</p>
                    </div>
                    <span className="text-sm font-semibold text-accent">{selectedRecord.time}</span>
                  </div>
                  <div className="mt-3 rounded-xl bg-secondary/40 px-3 py-2">
                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                      {lang === 'uk' ? 'Коментар' : 'Comment'}
                    </p>
                    <p className="mt-1 text-xs sm:text-sm break-words">
                      {selectedRecord.comment?.trim() || (lang === 'uk' ? 'Без коментаря' : 'No comment')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">{t('noRecords')}</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
