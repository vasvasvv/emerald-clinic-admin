import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooth } from '@/components/dental/Tooth';
import { formatPatientName, formatPhoneForDisplay, formatVisitDate } from '@/lib/dental-charts-utils';
import { cn } from '@/lib/utils';
import type { Doctor, Patient } from '@/types/dental';
import { LOWER_TEETH, UPPER_TEETH } from '@/types/dental';
import { uk } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  Clock,
  Plus,
  Printer,
  Stethoscope,
  Trash2,
  User as UserIcon,
} from 'lucide-react';

interface PatientDetailsProps {
  canDeletePatient: boolean;
  canEditDental: boolean;
  doctors: Doctor[];
  futureVisits: Patient['visits'];
  isCompactLayout: boolean;
  issueCount: number;
  loading: boolean;
  pastVisits: Patient['visits'];
  saving: boolean;
  selectedDate: Date | undefined;
  selectedPatient: Patient | null;
  shouldHide: boolean;
  sortedVisits: Patient['visits'];
  onBack: () => void;
  onDeleteVisit: (visitId: string) => void;
  onOpenForm043: () => void;
  onOpenVisitModal: () => void;
  onRefresh: () => void;
  onSelectDate: (date: Date | undefined) => void;
  onSelectTooth: (tooth: number) => void;
}

export function PatientDetails({
  canDeletePatient,
  canEditDental,
  doctors,
  futureVisits,
  isCompactLayout,
  issueCount,
  loading,
  pastVisits,
  saving,
  selectedDate,
  selectedPatient,
  shouldHide,
  sortedVisits,
  onBack,
  onDeleteVisit,
  onOpenForm043,
  onOpenVisitModal,
  onRefresh,
  onSelectDate,
  onSelectTooth,
}: PatientDetailsProps) {
  return (
    <section
      className={cn(
        'glass-panel min-h-[400px] md:min-h-[720px] overflow-hidden',
        isCompactLayout && !shouldHide && 'hidden',
      )}
    >
      {!selectedPatient ? (
        <div className="flex h-full min-h-[720px] items-center justify-center">
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <UserIcon className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">Пацієнт не обраний</h3>
            <p className="text-muted-foreground">Оберіть пацієнта зі списку для перегляду зубної карти.</p>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="border-b bg-card/80 p-4 md:p-6">
            <div className="flex flex-col gap-3">
              <div
                className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none"
                style={{ scrollbarWidth: 'none' }}
              >
                {isCompactLayout && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 shrink-0 px-3 text-muted-foreground"
                    onClick={onBack}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    До списку
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={onRefresh}
                  disabled={loading || saving}
                  className="h-9 shrink-0 px-3"
                >
                  Оновити
                </Button>
                <Button onClick={onOpenForm043} className="h-9 shrink-0 gap-2 px-3">
                  <Printer className="mr-2 h-4 w-4" />
                  Форма 043
                </Button>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-heading text-xl font-bold">{formatPatientName(selectedPatient)}</h2>
                  <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground md:flex-row md:items-center md:gap-4">
                    {selectedPatient.dateOfBirth && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {new Date(selectedPatient.dateOfBirth).toLocaleDateString('uk-UA')}
                      </span>
                    )}
                    <span>{formatPhoneForDisplay(selectedPatient.phone)}</span>
                    <span>
                      {selectedPatient.doctorName ||
                        doctors.find((doctor) => doctor.id === selectedPatient.doctorId)?.name ||
                        '—'}
                    </span>
                  </div>
                </div>
                {issueCount > 0 && (
                  <Badge className="h-9 w-fit rounded-md border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-700 hover:bg-amber-50">
                    {issueCount} лікування
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3 md:p-6">
            <div className="w-full max-w-full">
              <div className="mb-2">
                <div className="mb-1 text-center text-[10px] font-medium text-muted-foreground md:text-xs">
                  Верхня щелепа
                </div>
                <div className="overflow-x-auto touch-pan-x -mx-1">
                  <div className="flex items-end justify-center gap-0 py-[4px] px-1 min-w-[320px]">
                    {UPPER_TEETH.map((number) => (
                      <Tooth
                        key={number}
                        number={number}
                        isUpper
                        record={selectedPatient.dentalChart.find((item) => item.toothNumber === number)}
                        onClick={() => canEditDental && onSelectTooth(number)}
                        alignBottom
                        compact={isCompactLayout}
                        mobile={isCompactLayout}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div className="overflow-x-auto touch-pan-x -mx-1">
                  <div className="flex items-start justify-center gap-0 py-[4px] px-1 min-w-[320px]">
                    {LOWER_TEETH.map((number) => (
                      <Tooth
                        key={number}
                        number={number}
                        isUpper={false}
                        record={selectedPatient.dentalChart.find((item) => item.toothNumber === number)}
                        onClick={() => canEditDental && onSelectTooth(number)}
                        compact={isCompactLayout}
                        mobile={isCompactLayout}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-1 text-center text-[10px] font-medium text-muted-foreground md:text-xs">
                  Нижня щелепа
                </div>
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex items-center gap-2 justify-start">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">Історія візитів</h3>
                  <Badge variant="secondary" className="text-xs">
                    {selectedPatient.visits.length}
                  </Badge>
                </div>
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => onSelectDate(selectedDate ?? new Date())}
                  >
                    <Stethoscope className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-end">
                  {canEditDental && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onOpenVisitModal}>
                      <Plus className="mr-1 h-3 w-3" />
                      Додати візит
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={onSelectDate}
                    locale={uk}
                    className="rounded-md border pointer-events-auto"
                    modifiers={{
                      future: futureVisits.map((visit) => new Date(visit.date)),
                      past: pastVisits.map((visit) => new Date(visit.date)),
                    }}
                    modifiersClassNames={{
                      future: 'bg-primary/20 text-primary font-medium',
                      past: 'bg-muted text-muted-foreground',
                    }}
                  />
                </div>

                <div className="space-y-3">
                  {futureVisits.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Clock className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-primary">Заплановані</span>
                      </div>
                      <ScrollArea className="max-h-36">
                        <div className="space-y-1">
                          {futureVisits.map((visit) => (
                            <div
                              key={visit.id}
                              className="group flex items-center justify-between rounded-md bg-primary/5 p-2 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3 shrink-0 text-primary" />
                                  <span className="font-medium">{formatVisitDate(visit.date)}</span>
                                  {visit.notes && (
                                    <span className="truncate text-muted-foreground">— {visit.notes}</span>
                                  )}
                                </div>
                              </div>
                              {canDeletePatient && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
                                  onClick={() => onDeleteVisit(visit.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {pastVisits.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Завершені</span>
                      </div>
                      <ScrollArea className="max-h-36">
                        <div className="space-y-1">
                          {pastVisits.map((visit) => (
                            <div
                              key={visit.id}
                              className="group flex items-center justify-between rounded-md bg-muted/50 p-2 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  <span className="text-muted-foreground">{formatVisitDate(visit.date)}</span>
                                  {visit.notes && (
                                    <span className="truncate text-muted-foreground">— {visit.notes}</span>
                                  )}
                                </div>
                              </div>
                              {canDeletePatient && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
                                  onClick={() => onDeleteVisit(visit.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {sortedVisits.length === 0 && (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      <CalendarIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      Історія візитів порожня
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
