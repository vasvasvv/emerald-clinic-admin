import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooth } from '@/components/dental/Tooth';
import { formatPatientName, formatPhoneForDisplay, formatVisitDate } from '@/lib/dental-charts-utils';
import { cn } from '@/lib/utils';
import type { Doctor, Patient } from '@/types/dental';
import { LOWER_TEETH, UPPER_TEETH } from '@/types/dental';
import { Calendar as CalendarIcon, ChevronLeft, Clock, Plus, Printer, Trash2, User as UserIcon } from 'lucide-react';

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
  onOpenHistory: () => void;
  onOpenVisitModal: () => void;
  onRefresh: () => void;
  onSelectDate: (date: Date | undefined) => void;
  onSelectTooth: (tooth: number) => void;
}

export function PatientDetails({
  canDeletePatient,
  canEditDental,
  futureVisits,
  isCompactLayout,
  issueCount,
  loading,
  pastVisits,
  saving,
  selectedPatient,
  shouldHide,
  sortedVisits,
  onBack,
  onDeleteVisit,
  onOpenForm043,
  onOpenHistory,
  onOpenVisitModal,
  onRefresh,
  onSelectTooth,
}: PatientDetailsProps) {
  const [activeTab, setActiveTab] = useState<'chart' | 'visits'>('chart');

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
          {/* Header */}
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
                <Button variant="outline" onClick={onOpenHistory} className="h-9 shrink-0 px-3">
                  Історія
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

          {/* Tabs */}
          <div className="flex border-b border-border/60 shrink-0">
            {(['chart', 'visits'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-all outline-none border-b-2',
                  activeTab === tab
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab === 'chart' ? 'Зубна карта' : 'Візити'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'chart' ? (
              <div className="p-3 md:p-6">
                <div className="w-full max-w-full">
                  <div className="mb-2">
                    <div className="mb-1 text-center text-[10px] font-medium text-muted-foreground md:text-xs">
                      Верхня щелепа
                    </div>
                    <div className="-mx-1 overflow-hidden">
                      <div className="flex w-full items-end justify-center gap-0 py-[4px] px-1">
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
                    <div className="-mx-1 overflow-hidden">
                      <div className="flex w-full items-start justify-center gap-0 py-[4px] px-1">
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
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {canEditDental && (
                  <Button size="sm" onClick={onOpenVisitModal} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Додати візит
                  </Button>
                )}

                {sortedVisits.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    <CalendarIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    Історія візитів порожня
                  </div>
                ) : (
                  <ScrollArea className="max-h-[480px]">
                    <div className="space-y-2 pr-2">
                      {sortedVisits.map((visit) => (
                        <div
                          key={visit.id}
                          className="group flex items-start justify-between rounded-xl bg-card/50 border border-border/50 p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span
                                className={cn(
                                  'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                                  visit.type === 'future'
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-muted/60 text-muted-foreground',
                                )}
                              >
                                {visit.type === 'future' ? 'Запланований' : 'Минулий'}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatVisitDate(visit.date)}
                              </span>
                            </div>
                            {visit.notes && <p className="text-sm text-foreground leading-snug">{visit.notes}</p>}
                          </div>
                          {canDeletePatient && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 ml-2 opacity-0 group-hover:opacity-100"
                              onClick={() => onDeleteVisit(visit.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
