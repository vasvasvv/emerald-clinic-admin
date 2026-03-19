import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { ArrowLeft, Clock, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NewRecordFormProps {
  onClose: () => void;
  onSave: (record: { clientName: string; phone: string; date: string; time: string; doctor: string; comment: string }) => void;
  existingRecords: { date: string; time: string; doctor: string }[];
  doctors: string[];
}

const WORK_HOURS_WEEKDAY = Array.from({ length: 9 }, (_, i) => `${String(9 + i).padStart(2, '0')}:00`);
const WORK_HOURS_SATURDAY = Array.from({ length: 5 }, (_, i) => `${String(9 + i).padStart(2, '0')}:00`);

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

const dayNamesMap: Record<string, string[]> = {
  uk: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

function getWorkHours(dateStr: string) {
  const d = new Date(dateStr);
  return d.getDay() === 6 ? WORK_HOURS_SATURDAY : WORK_HOURS_WEEKDAY;
}

export function NewRecordForm({ onClose, onSave, existingRecords, doctors }: NewRecordFormProps) {
  const { t, lang } = useI18n();
  const [step, setStep] = useState<1 | 2>(1);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(doctors[0] || '');
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');

  const monday = getMonday(currentDate);

  const weekDays = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [monday.getTime()]);

  const navigateWeek = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const getOccupiedSlots = (dateStr: string) => {
    return existingRecords
      .filter((r) => r.date === dateStr && r.doctor === selectedDoctor)
      .map((r) => r.time);
  };

  const getFreeSlots = (dateStr: string) => {
    const occupied = getOccupiedSlots(dateStr);
    const hours = getWorkHours(dateStr);
    return hours.filter((h) => !occupied.includes(h));
  };

  const handleSlotClick = (dateStr: string, time: string) => {
    setSelectedDate(dateStr);
    setSelectedTime(time);
    setManualTime(time);
  };

  const handleManualTimeChange = (value: string) => {
    setManualTime(value);
    setSelectedTime(value);
  };

  const handleNext = () => {
    if (selectedDate && selectedTime) setStep(2);
  };

  const handleSave = () => {
    if (!clientName || !phone) return;
    onSave({ clientName, phone, date: selectedDate, time: selectedTime, doctor: selectedDoctor, comment });
  };

  const today = formatDate(new Date());
  const locale = lang === 'uk' ? 'uk-UA' : 'en-US';
  const weekLabel = `${weekDays[0].toLocaleDateString(locale, { day: 'numeric', month: 'long' })} — ${weekDays[5].toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background overflow-auto"
    >
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="max-w-5xl mx-auto p-4 sm:p-5 space-y-3"
          >
            {/* Header with doctor selector */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-heading font-bold">{t('newRecord')}</h1>
                  <p className="text-xs text-muted-foreground">{t('selectTimeSlot')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground hidden sm:inline">{t('doctor')}:</label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="input-glass text-sm py-1.5 pr-8"
                >
                  {doctors.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Week navigation */}
            <div className="flex items-center justify-between">
              <button onClick={() => navigateWeek(-1)} className="p-2 rounded-xl border border-border hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-heading font-semibold text-sm capitalize">{weekLabel}</span>
              <button onClick={() => navigateWeek(1)} className="p-2 rounded-xl border border-border hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekly time slot grid */}
            <motion.div
              key={monday.getTime()}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              {weekDays.map((day, i) => {
                const dateStr = formatDate(day);
                const workHours = getWorkHours(dateStr);
                const freeSlots = getFreeSlots(dateStr);
                const isToday = dateStr === today;
                const isPast = dateStr < today;

                return (
                  <div key={dateStr} className={`glass-panel overflow-hidden ${isToday ? 'ring-1 ring-primary/50' : ''} ${isPast ? 'opacity-50' : ''}`}>
                    <div className={`px-4 py-3 border-b border-border flex items-center gap-2 ${isToday ? 'bg-primary/10' : ''}`}>
                      <span className="text-xs text-muted-foreground font-medium">{dayNamesMap[lang]?.[i] || dayNamesMap.en[i]}</span>
                      <span className={`font-heading font-semibold text-sm ${isToday ? 'text-primary' : ''}`}>
                        {day.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">{freeSlots.length} {t('available')}</span>
                    </div>
                    <div className="p-3 flex flex-wrap gap-1.5">
                      {workHours.map((hour) => {
                        const isFree = freeSlots.includes(hour);
                        const isSelected = selectedDate === dateStr && selectedTime === hour;
                        return (
                          <button
                            key={hour}
                            disabled={!isFree || isPast}
                            onClick={() => handleSlotClick(dateStr, hour)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              isSelected
                                ? 'bg-accent text-accent-foreground ring-2 ring-accent/50'
                                : isFree && !isPast
                                  ? 'bg-secondary/40 text-foreground hover:bg-primary/20 hover:text-primary'
                                  : 'bg-secondary/20 text-muted-foreground/40 cursor-not-allowed line-through'
                            }`}
                          >
                            {hour}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>

            {/* Manual time edit */}
            {selectedDate && (
              <div className="flex items-center gap-3 glass-panel-sm px-4 py-2.5">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{selectedDate}</span>
                <input
                  type="time"
                  value={manualTime}
                  onChange={(e) => handleManualTimeChange(e.target.value)}
                  className="input-glass text-sm py-1 w-28"
                />
              </div>
            )}

            {/* Next button */}
            <div className="pb-4">
              <button
                onClick={handleNext}
                disabled={!selectedDate || !selectedTime}
                className="btn-accent w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('confirm')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="max-w-lg mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen flex flex-col justify-center"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <button onClick={() => setStep(1)} className="p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-heading font-bold">{t('newRecord')}</h1>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate} · {selectedTime} · {selectedDoctor}
                  </p>
                </div>
              </div>

              <div className="glass-panel p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">{t('patientName')}</label>
                  <input
                    className="input-glass w-full"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder={t('patientName')}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">{t('phone')}</label>
                  <input
                    className="input-glass w-full"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+380..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">{t('comment')}</label>
                  <textarea
                    className="input-glass w-full resize-none"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary/60 transition-colors">
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!clientName || !phone}
                  className="btn-accent disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
