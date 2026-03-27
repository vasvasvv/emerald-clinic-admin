import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPatientName, formatPhoneForDisplay } from '@/lib/dental-charts-utils';
import { cn } from '@/lib/utils';
import type { Doctor, Patient, User } from '@/types/dental';
import { ChevronDown, ChevronUp, Edit2, History, MoreVertical, Phone, Plus, Search, Trash2 } from 'lucide-react';

interface PatientListProps {
  canAddOrEditPatient: boolean;
  canDeletePatient: boolean;
  currentUser: User | null;
  displayedPatients: Patient[];
  doctors: Doctor[];
  genderFilter: string;
  isAdvancedOpen: boolean;
  isSearchFocused: boolean;
  loading: boolean;
  newOldFilter: string;
  recentSearches: string[];
  searchQuery: string;
  selectedDoctorId: string;
  selectedPatientId: string;
  shouldHide: boolean;
  onDeletePatient: (patientId: string) => void;
  onEditPatient: (patientId: string) => void;
  onHistoryPatient: (patientId: string) => void;
  onPatientSelect: (patientId: string) => void;
  onSearchChange: (value: string) => void;
  onSearchFocusChange: (focused: boolean) => void;
  onSearchSubmit: () => void;
  onRecentSearchSelect: (value: string) => void;
  onSetAdvancedOpen: (open: boolean | ((current: boolean) => boolean)) => void;
  onSetGenderFilter: (value: string) => void;
  onSetSelectedDoctorId: (value: string) => void;
  onSetNewOldFilter: (value: string) => void;
  onAddPatient: () => void;
}

export function PatientList({
  canAddOrEditPatient,
  canDeletePatient,
  currentUser,
  displayedPatients,
  doctors,
  genderFilter,
  isAdvancedOpen,
  isSearchFocused,
  loading,
  newOldFilter,
  recentSearches,
  searchQuery,
  selectedDoctorId,
  selectedPatientId,
  shouldHide,
  onDeletePatient,
  onEditPatient,
  onHistoryPatient,
  onPatientSelect,
  onSearchChange,
  onSearchFocusChange,
  onSearchSubmit,
  onRecentSearchSelect,
  onSetAdvancedOpen,
  onSetGenderFilter,
  onSetSelectedDoctorId,
  onSetNewOldFilter,
  onAddPatient,
}: PatientListProps) {
  return (
    <section className={cn('glass-panel flex min-h-[720px] flex-col overflow-hidden', shouldHide && 'hidden')}>
      <div className="border-b p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg">Пацієнти</h2>
          {canAddOrEditPatient && (
            <Button size="sm" onClick={onAddPatient}>
              <Plus className="mr-1 h-4 w-4" />
              Додати
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            onFocus={() => onSearchFocusChange(true)}
            onBlur={() => setTimeout(() => onSearchFocusChange(false), 200)}
            onKeyDown={(event) => event.key === 'Enter' && onSearchSubmit()}
            className="pl-9"
          />
          {isSearchFocused && !searchQuery && recentSearches.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover p-1 shadow-md">
              <p className="px-2 py-1 text-[10px] text-muted-foreground">Останні пошуки</p>
              {recentSearches.map((item, index) => (
                <button
                  key={`${item}-${index}`}
                  className="w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onMouseDown={() => onRecentSearchSelect(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button variant="ghost" size="sm" className="mt-2 w-full justify-center text-xs text-muted-foreground" onClick={() => onSetAdvancedOpen((current) => !current)}>
          {isAdvancedOpen ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
          Розширений фільтр
        </Button>

        {isAdvancedOpen && (
          <div className="mt-2 space-y-2">
            <Select value={selectedDoctorId} onValueChange={onSetSelectedDoctorId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Лікар" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всі лікарі</SelectItem>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>{doctor.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Select value={genderFilter} onValueChange={onSetGenderFilter}>
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder="Стать" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Будь-яка стать</SelectItem>
                  <SelectItem value="male">Ч</SelectItem>
                  <SelectItem value="female">Ж</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newOldFilter} onValueChange={onSetNewOldFilter}>
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder="Новий/старий" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Будь-коли доданий</SelectItem>
                  <SelectItem value="new">Новий</SelectItem>
                  <SelectItem value="old">Старий</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Завантаження...</div>
          ) : displayedPatients.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Пацієнтів не знайдено</div>
          ) : (
            displayedPatients.map((patient) => {
              const isSelected = selectedPatientId === patient.id;
              return (
                <div key={patient.id} className="animate-fade-in">
                  <div
                    className={cn(
                      'group cursor-pointer rounded-lg p-3 transition-all duration-200 hover:bg-muted/50',
                      isSelected && 'border border-primary/20 bg-primary/10',
                    )}
                    onClick={() => onPatientSelect(patient.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-medium">{formatPatientName(patient)}</h4>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhoneForDisplay(patient.phone)}
                          </span>
                        </div>
                      </div>

                      {(canAddOrEditPatient || canDeletePatient) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canAddOrEditPatient && (
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onEditPatient(patient.id);
                                }}
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Редагувати
                              </DropdownMenuItem>
                            )}
                            {(currentUser?.role === 'super-admin' || currentUser?.role === 'doctor') && (
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onHistoryPatient(patient.id);
                                }}
                              >
                                <History className="mr-2 h-4 w-4" />
                                Історія змін
                              </DropdownMenuItem>
                            )}
                            {canDeletePatient && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDeletePatient(patient.id);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Видалити
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
