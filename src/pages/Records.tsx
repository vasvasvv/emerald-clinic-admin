import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { AdminLayout } from '@/components/AdminLayout';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface AppointmentRecord {
  id: number;
  clientName: string;
  phone: string;
  date: string;
  time: string;
  doctor: string;
}

const mockDoctors = ['Др. Іваненко', 'Др. Шевченко', 'Др. Бондаренко', 'Др. Кравченко'];

const mockRecords: AppointmentRecord[] = [
  { id: 1, clientName: 'Олена Петренко', phone: '+380991234567', date: '2026-03-16', time: '10:00', doctor: 'Др. Іваненко' },
  { id: 2, clientName: 'Максим Коваль', phone: '+380991234568', date: '2026-03-16', time: '11:30', doctor: 'Др. Шевченко' },
  { id: 3, clientName: 'Анна Мельник', phone: '+380991234569', date: '2026-03-17', time: '14:00', doctor: 'Др. Бондаренко' },
  { id: 4, clientName: 'Дмитро Ткаченко', phone: '+380991234570', date: '2026-03-17', time: '09:30', doctor: 'Др. Іваненко' },
  { id: 5, clientName: 'Марія Сидоренко', phone: '+380991234571', date: '2026-03-18', time: '12:00', doctor: 'Др. Шевченко' },
  { id: 6, clientName: 'Ігор Литвин', phone: '+380991234572', date: '2026-03-18', time: '15:00', doctor: 'Др. Кравченко' },
  { id: 7, clientName: 'Тетяна Бойко', phone: '+380991234573', date: '2026-03-19', time: '10:00', doctor: 'Др. Іваненко' },
  { id: 8, clientName: 'Віктор Гончар', phone: '+380991234574', date: '2026-03-19', time: '13:00', doctor: 'Др. Бондаренко' },
  { id: 9, clientName: 'Наталія Кузь', phone: '+380991234575', date: '2026-03-19', time: '16:30', doctor: 'Др. Шевченко' },
  { id: 10, clientName: 'Олег Романюк', phone: '+380991234576', date: '2026-03-20', time: '09:00', doctor: 'Др. Кравченко' },
  { id: 11, clientName: 'Юлія Дорош', phone: '+380991234577', date: '2026-03-20', time: '11:00', doctor: 'Др. Іваненко' },
  { id: 12, clientName: 'Сергій Мороз', phone: '+380991234578', date: '2026-03-21', time: '10:30', doctor: 'Др. Шевченко' },
  { id: 13, clientName: 'Катерина Лис', phone: '+380991234579', date: '2026-03-21', time: '14:00', doctor: 'Др. Бондаренко' },
  { id: 14, clientName: 'Павло Ярош', phone: '+380991234580', date: '2026-03-22', time: '09:00', doctor: 'Др. Іваненко' },
  { id: 15, clientName: 'Оксана Шульга', phone: '+380991234581', date: '2026-03-23', time: '11:00', doctor: 'Др. Кравченко' },
  { id: 16, clientName: 'Артем Власюк', phone: '+380991234582', date: '2026-03-24', time: '10:00', doctor: 'Др. Шевченко' },
  { id: 17, clientName: 'Людмила Савчук', phone: '+380991234583', date: '2026-03-25', time: '15:00', doctor: 'Др. Бондаренко' },
];

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

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

const dayNames: Record<string, string[]> = {
  uk: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export default function Records() {
  const { t, lang } = useI18n();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');

  const monday = getMonday(currentDate);

  const weekDays = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [monday.getTime()]);

  const filteredRecords = useMemo(() => {
    return mockRecords.filter((r) => !selectedDoctor || r.doctor === selectedDoctor);
  }, [selectedDoctor]);

  const getRecordsForDate = (dateStr: string) => {
    return filteredRecords
      .filter((r) => r.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const navigateWeek = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const navigateMonth = (dir: number) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const monthDays = useMemo(() => {
    return getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  const weekRangeLabel = `${weekDays[0].toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-US', { day: 'numeric', month: 'short' })} — ${weekDays[5].toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const monthLabel = currentDate.toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-US', { month: 'long', year: 'numeric' });

  const today = formatDate(new Date());

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-heading font-bold">{t('records')}</h1>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Doctor filter */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="input-glass text-sm py-1.5 pr-8"
              >
                <option value="">{t('allDoctors')}</option>
                {mockDoctors.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* View toggle */}
            <div className="flex rounded-xl overflow-hidden border border-border">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary/60'
                }`}
              >
                {t('week')}
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary/60'
                }`}
              >
                {t('month')}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => viewMode === 'week' ? navigateWeek(-1) : navigateMonth(-1)}
            className="p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-heading font-semibold text-lg capitalize">
            {viewMode === 'week' ? weekRangeLabel : monthLabel}
          </span>
          <button
            onClick={() => viewMode === 'week' ? navigateWeek(1) : navigateMonth(1)}
            className="p-2 rounded-xl hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar */}
        {viewMode === 'week' ? (
          <motion.div
            key={monday.getTime()}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {weekDays.map((day, i) => {
              const dateStr = formatDate(day);
              const dayRecords = getRecordsForDate(dateStr);
              const isToday = dateStr === today;

              return (
                <div
                  key={dateStr}
                  className={`glass-panel overflow-hidden ${isToday ? 'ring-1 ring-primary/50' : ''}`}
                >
                  <div className={`px-4 py-3 border-b border-border flex items-center gap-2 ${isToday ? 'bg-primary/10' : ''}`}>
                    <span className="text-xs text-muted-foreground font-medium">
                      {dayNames[lang]?.[i] || dayNames.en[i]}
                    </span>
                    <span className={`font-heading font-semibold ${isToday ? 'text-primary' : ''}`}>
                      {day.toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-US', { day: 'numeric', month: 'short' })}
                    </span>
                    {isToday && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium ml-auto">
                        {t('today')}
                      </span>
                    )}
                  </div>
                  {dayRecords.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground/60">
                      {t('noRecords')}
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {dayRecords.map((rec) => (
                        <div key={rec.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
                          <span className="text-sm font-semibold text-accent w-12 shrink-0">{rec.time}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{rec.clientName}</p>
                            <p className="text-xs text-muted-foreground">{rec.phone}</p>
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
            {/* Month grid header */}
            <div className="grid grid-cols-7 border-b border-border">
              {(dayNames[lang] || dayNames.en).concat(lang === 'uk' ? 'Нд' : 'Sun').map((name) => (
                <div key={name} className="px-2 py-2 text-center text-xs text-muted-foreground font-medium">
                  {name}
                </div>
              ))}
            </div>
            {/* Month grid */}
            <div className="grid grid-cols-7">
              {/* Empty cells for offset */}
              {Array.from({ length: (monthDays[0]?.getDay() || 7) - 1 }, (_, i) => (
                <div key={`empty-${i}`} className="border-b border-r border-border/30 min-h-[80px]" />
              ))}
              {monthDays.map((day) => {
                const dateStr = formatDate(day);
                const dayRecords = getRecordsForDate(dateStr);
                const isToday = dateStr === today;
                const isSunday = day.getDay() === 0;

                return (
                  <div
                    key={dateStr}
                    className={`border-b border-r border-border/30 min-h-[80px] p-1.5 ${isToday ? 'bg-primary/5' : ''} ${isSunday ? 'opacity-50' : ''}`}
                  >
                    <span className={`text-xs font-medium ${isToday ? 'bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md' : 'text-muted-foreground'}`}>
                      {day.getDate()}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayRecords.slice(0, 3).map((rec) => (
                        <div key={rec.id} className="text-[10px] bg-accent/15 text-accent rounded px-1 py-0.5 truncate">
                          {rec.time} {rec.clientName.split(' ')[0]}
                        </div>
                      ))}
                      {dayRecords.length > 3 && (
                        <div className="text-[10px] text-muted-foreground pl-1">+{dayRecords.length - 3}</div>
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
  );
}
