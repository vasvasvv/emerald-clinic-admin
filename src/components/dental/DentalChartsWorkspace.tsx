import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Form043Editor } from '@/components/dental/Form043Editor';
import { HistoryModal } from '@/components/dental/HistoryModal';
import { PatientDetails } from '@/components/dental/PatientDetails';
import { PatientList } from '@/components/dental/PatientList';
import { PatientModal, type PatientModalProps } from '@/components/dental/PatientModal';
import { ToothModal } from '@/components/dental/ToothModal';
import { VisitModal } from '@/components/dental/VisitModal';
import { useDentalCharts } from '@/hooks/use-dental-charts';
import { useI18n } from '@/lib/i18n';
import { canPerformAction, getStoredAdminUser } from '@/lib/dental-charts-utils';
import { cn } from '@/lib/utils';
import type { ToothRecord } from '@/types/dental';
import { Printer } from 'lucide-react';

function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const value = window.localStorage.getItem('dental_recent_searches');
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  });

  const updateRecentSearches = (value: string[] | ((previous: string[]) => string[])) => {
    setRecentSearches((previous) => {
      const next = typeof value === 'function' ? value(previous) : value;
      window.localStorage.setItem('dental_recent_searches', JSON.stringify(next));
      return next;
    });
  };

  return [recentSearches, updateRecentSearches] as const;
}

export function DentalChartsWorkspace() {
  const { t } = useI18n();
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const currentUser = useMemo(() => getStoredAdminUser(), []);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [newOldFilter, setNewOldFilter] = useState('all');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useRecentSearches();
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [historyPatientId, setHistoryPatientId] = useState<string | null>(null);
  const [deletingPatientId, setDeletingPatientId] = useState<string | null>(null);
  const [showForm043, setShowForm043] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isAddingVisit, setIsAddingVisit] = useState(false);
  const [deletingVisitId, setDeletingVisitId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isMobilePatientViewOpen, setIsMobilePatientViewOpen] = useState(false);
  const {
    doctors,
    error,
    loading,
    patients,
    saving,
    selectedDoctorId,
    setSelectedDoctorId,
    createVisit,
    deletePatient,
    deleteVisit,
    loadPatients,
    refresh,
    saveTooth,
    submitPatient,
  } = useDentalCharts({
    currentUser,
    selectedPatientId,
    editingPatientId,
    historyPatientId,
  });

  useEffect(() => {
    setSelectedPatientId((current) =>
      patients.some((patient) => patient.id === current) ? current : (patients[0]?.id ?? ''),
    );
  }, [patients]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1279px)');
    const syncCompactLayout = () => {
      setIsCompactLayout(window.innerWidth < 1280);
    };

    syncCompactLayout();
    mediaQuery.addEventListener('change', syncCompactLayout);

    return () => mediaQuery.removeEventListener('change', syncCompactLayout);
  }, []);

  useEffect(() => {
    if (!isCompactLayout) {
      setIsMobilePatientViewOpen(false);
    }
  }, [isCompactLayout]);

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? null;
  const editingPatient = patients.find((patient) => patient.id === editingPatientId) ?? null;
  const historyPatient = patients.find((patient) => patient.id === historyPatientId) ?? null;
  const selectedToothRecord = selectedPatient?.dentalChart.find((item) => item.toothNumber === selectedTooth);

  const filteredPatients = useMemo(() => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    return patients
      .filter((patient) => (selectedDoctorId === 'all' ? true : patient.doctorId === selectedDoctorId))
      .filter((patient) => {
        if (genderFilter !== 'all' && patient.gender !== genderFilter) return false;
        if (newOldFilter === 'new' && new Date(patient.createdAt) < twoWeeksAgo) return false;
        if (newOldFilter === 'old' && new Date(patient.createdAt) >= twoWeeksAgo) return false;
        return true;
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [patients, selectedDoctorId, genderFilter, newOldFilter]);

  const sortedVisits = useMemo(
    () =>
      [...(selectedPatient?.visits ?? [])].sort(
        (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
      ),
    [selectedPatient],
  );
  const issueCount =
    selectedPatient?.dentalChart.filter((item) => item.description || item.notes || item.files.length > 0).length ?? 0;
  const pastVisits = sortedVisits.filter((visit) => visit.type === 'past');
  const futureVisits = sortedVisits.filter((visit) => visit.type === 'future');
  const displayedPatients = isCompactLayout ? filteredPatients.slice(0, 10) : filteredPatients;
  const shouldShowCompactPatientDetails = Boolean(isCompactLayout && isMobilePatientViewOpen && selectedPatient);

  useEffect(() => {
    if (isCompactLayout && isMobilePatientViewOpen && !selectedPatient) {
      setIsMobilePatientViewOpen(false);
    }
  }, [isCompactLayout, isMobilePatientViewOpen, selectedPatient]);

  const handleSubmitPatient = async (payload: Parameters<PatientModalProps['onSubmit']>[0]) => {
    await submitPatient(payload, searchQuery, editingPatient);
  };

  const handleDeletePatient = async () => {
    if (!deletingPatientId) return;
    await deletePatient(deletingPatientId, searchQuery);
    setDeletingPatientId(null);
  };

  const handleSaveTooth = async (payload: Partial<ToothRecord>) => {
    if (!selectedPatient || selectedTooth === null) return;
    await saveTooth(selectedPatient.id, selectedTooth, payload);
  };

  const handleCreateVisit = async (payload: {
    date: string;
    type: 'past' | 'future';
    notes: string;
    doctorId: string;
  }) => {
    if (!selectedPatient) return;
    await createVisit(selectedPatient.id, payload);
  };

  const handleDeleteVisit = async () => {
    if (!selectedPatient || !deletingVisitId) return;
    await deleteVisit(selectedPatient.id, deletingVisitId, searchQuery);
    setDeletingVisitId(null);
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    setRecentSearches((current) => {
      const filtered = current.filter((item) => item !== searchQuery.trim());
      return [searchQuery.trim(), ...filtered].slice(0, 3);
    });
    setIsSearchFocused(false);
    void loadPatients(searchQuery.trim());
  };

  const canAddOrEditPatient = canPerformAction(currentUser, 'add', 'patient');
  const canEditDental = canPerformAction(currentUser, 'edit', 'dental');
  const canDeletePatient = canPerformAction(currentUser, 'delete', 'patient');

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    if (isCompactLayout) {
      setIsMobilePatientViewOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">{t('dentalCharts')}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {!shouldShowCompactPatientDetails && (
            <Button variant="outline" onClick={() => void refresh()} disabled={loading || saving}>
              {t('refresh')}
            </Button>
          )}
          {selectedPatient && !shouldShowCompactPatientDetails && (
            <Button onClick={() => setShowForm043(true)} className="gap-2">
              <Printer className="h-4 w-4" />
              {t('form043')}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className={cn('grid gap-4', !isCompactLayout && 'xl:grid-cols-[320px_minmax(0,1fr)]')}>
        <PatientList
          canAddOrEditPatient={canAddOrEditPatient}
          canDeletePatient={canDeletePatient}
          currentUser={currentUser}
          displayedPatients={displayedPatients}
          doctors={doctors}
          genderFilter={genderFilter}
          isAdvancedOpen={isAdvancedOpen}
          isSearchFocused={isSearchFocused}
          loading={loading}
          newOldFilter={newOldFilter}
          recentSearches={recentSearches}
          searchQuery={searchQuery}
          selectedDoctorId={selectedDoctorId}
          selectedPatientId={selectedPatientId}
          shouldHide={shouldShowCompactPatientDetails}
          onDeletePatient={setDeletingPatientId}
          onEditPatient={setEditingPatientId}
          onHistoryPatient={setHistoryPatientId}
          onPatientSelect={handlePatientSelect}
          onSearchChange={(value) => {
            setSearchQuery(value);
            if (!value.trim()) {
              void loadPatients();
            }
          }}
          onSearchFocusChange={setIsSearchFocused}
          onSearchSubmit={handleSearchSubmit}
          onRecentSearchSelect={(value) => {
            setSearchQuery(value);
            void loadPatients(value);
            setIsSearchFocused(false);
          }}
          onSetAdvancedOpen={setIsAdvancedOpen}
          onSetGenderFilter={setGenderFilter}
          onSetSelectedDoctorId={setSelectedDoctorId}
          onSetNewOldFilter={setNewOldFilter}
          onAddPatient={() => setIsAddingPatient(true)}
        />

        <PatientDetails
          canDeletePatient={canDeletePatient}
          canEditDental={canEditDental}
          doctors={doctors}
          futureVisits={futureVisits}
          isCompactLayout={isCompactLayout}
          issueCount={issueCount}
          loading={loading}
          pastVisits={pastVisits}
          saving={saving}
          selectedDate={selectedDate}
          selectedPatient={selectedPatient}
          shouldHide={shouldShowCompactPatientDetails}
          sortedVisits={sortedVisits}
          onBack={() => setIsMobilePatientViewOpen(false)}
          onDeleteVisit={setDeletingVisitId}
          onOpenForm043={() => setShowForm043(true)}
          onOpenVisitModal={() => setIsAddingVisit(true)}
          onRefresh={() => void refresh()}
          onSelectDate={setSelectedDate}
          onSelectTooth={setSelectedTooth}
        />
      </div>

      <PatientModal
        isOpen={isAddingPatient || Boolean(editingPatient)}
        onClose={() => {
          setIsAddingPatient(false);
          setEditingPatientId(null);
        }}
        doctors={doctors}
        selectedDoctorId={selectedDoctorId}
        patient={editingPatient}
        onSubmit={handleSubmitPatient}
      />

      <VisitModal
        isOpen={isAddingVisit}
        onClose={() => setIsAddingVisit(false)}
        doctors={doctors}
        selectedDoctorId={selectedPatient?.doctorId || selectedDoctorId}
        onSubmit={handleCreateVisit}
      />

      <ToothModal
        isOpen={selectedTooth !== null}
        onClose={() => setSelectedTooth(null)}
        toothNumber={selectedTooth ?? 0}
        record={selectedToothRecord}
        onSave={handleSaveTooth}
      />

      <HistoryModal
        isOpen={Boolean(historyPatient)}
        onClose={() => setHistoryPatientId(null)}
        patient={historyPatient}
      />

      <ConfirmDialog
        open={Boolean(deletingPatientId)}
        onCancel={() => setDeletingPatientId(null)}
        onConfirm={() => void handleDeletePatient()}
        title={t('deletePatientTitle')}
        description={t('deletePatientDescription')}
        confirmLabel={t('confirmDeleteAction')}
      />

      <ConfirmDialog
        open={Boolean(deletingVisitId)}
        onCancel={() => setDeletingVisitId(null)}
        onConfirm={() => void handleDeleteVisit()}
        title={t('deleteVisitTitle')}
        description={t('deleteVisitDescription')}
        confirmLabel={t('confirmDeleteAction')}
      />

      {showForm043 && selectedPatient && (
        <Form043Editor patient={selectedPatient} doctors={doctors} onClose={() => setShowForm043(false)} />
      )}
    </div>
  );
}
