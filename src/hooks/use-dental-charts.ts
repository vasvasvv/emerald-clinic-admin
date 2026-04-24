import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, apiCall } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { normalizeDoctors, normalizePatient, resolveDoctorFilter } from '@/lib/dental-charts-utils';
import type { Doctor, Patient, ToothRecord, User } from '@/types/dental';

export interface DentalPatientPayload {
  firstName: string;
  lastName: string;
  middleName?: string;
  gender?: 'male' | 'female';
  phone: string;
  dateOfBirth: string;
  doctorId: string;
  historyDetails?: string;
}

export interface DentalVisitPayload {
  date: string;
  type: 'past' | 'future';
  notes: string;
  doctorId: string;
}

interface UseDentalChartsOptions {
  currentUser: User | null;
}

export function useDentalCharts({ currentUser }: UseDentalChartsOptions) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Зберігаємо деталі пацієнтів які вже завантажено щоб не перезавантажувати
  const patientDetailsCache = useRef<Set<string>>(new Set());

  const loadDoctors = useCallback(async () => {
    if (!token) return;
    const data = await api.getSystemDoctors(token);
    const normalized = normalizeDoctors(data);
    setDoctors(normalized);
    setSelectedDoctorId(resolveDoctorFilter(normalized, currentUser));
  }, [currentUser, token]);

  const loadPatients = useCallback(
    async (query = '') => {
      if (!token) return;
      const data = await api.getPatients(token, query);
      const normalized = Array.isArray(data) ? data.map(normalizePatient) : [];
      setPatients(normalized);
    },
    [token],
  );

  const loadPatientDetails = useCallback(
    async (patientId: string, force = false) => {
      if (!token || !patientId) return;
      // Не завантажуємо повторно якщо вже є в кеші (якщо не force)
      if (!force && patientDetailsCache.current.has(patientId)) return;
      const data = await apiCall(`/api/patients/${patientId}`, {}, token);
      const normalized = normalizePatient(data);
      patientDetailsCache.current.add(patientId);
      setPatients((current) =>
        current.map((patient) =>
          patient.id === patientId ? { ...patient, ...normalized, detailsLoaded: true } : patient,
        ),
      );
    },
    [token],
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      // При refresh скидаємо кеш деталей — дані могли змінитись
      patientDetailsCache.current.clear();
      await Promise.all([loadDoctors(), loadPatients()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити dental charts');
    } finally {
      setLoading(false);
    }
  }, [loadDoctors, loadPatients, token]);

  const submitPatient = async (payload: DentalPatientPayload, searchQuery: string, editingPatient: Patient | null) => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      if (editingPatient) {
        await apiCall(
          `/api/patients/${editingPatient.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              ...payload,
              middleName: payload.middleName ?? null,
              gender: payload.gender ?? null,
              historyDetails: payload.historyDetails ?? null,
            }),
          },
          token,
        );
        // Інвалідуємо кеш деталей цього пацієнта щоб при наступному відкритті дані оновились
        if (editingPatient.id) patientDetailsCache.current.delete(editingPatient.id);
      } else {
        await apiCall(
          '/api/patients',
          {
            method: 'POST',
            body: JSON.stringify({
              ...payload,
              middleName: payload.middleName ?? null,
              gender: payload.gender ?? null,
            }),
          },
          token,
        );
      }

      await loadPatients(searchQuery.trim());
      // Деталі редагованого пацієнта завантажуємо примусово (force=true)
      if (editingPatient?.id) {
        await loadPatientDetails(editingPatient.id, true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти пацієнта');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const deletePatient = async (patientId: string, searchQuery: string) => {
    if (!token || !patientId) return;
    setSaving(true);
    setError('');
    try {
      await apiCall(`/api/patients/${patientId}`, { method: 'DELETE' }, token);
      await loadPatients(searchQuery.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося видалити пацієнта');
    } finally {
      setSaving(false);
    }
  };

  const saveTooth = async (patientId: string, toothNumber: number, payload: Partial<ToothRecord>) => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await apiCall(
        `/api/patients/${patientId}/teeth`,
        {
          method: 'POST',
          body: JSON.stringify({
            tooth_number: toothNumber,
            status: payload.description ?? '',
            notes: payload.notes ?? '',
          }),
        },
        token,
      );
      patientDetailsCache.current.delete(patientId);
      await loadPatientDetails(patientId, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти зубну карту');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const uploadToothImage = async (patientId: string, toothNumber: number, file: File) => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await api.uploadToothImage(token, patientId, toothNumber, file);
      await loadPatientDetails(patientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити зображення зуба');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const createVisit = async (patientId: string, payload: DentalVisitPayload) => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await apiCall(
        `/api/patients/${patientId}/visits`,
        {
          method: 'POST',
          body: JSON.stringify({
            visitDate: payload.date,
            type: payload.type,
            notes: payload.notes,
            reason: payload.notes,
            doctorId: payload.doctorId,
          }),
        },
        token,
      );
      patientDetailsCache.current.delete(patientId);
      await loadPatientDetails(patientId, true);
      // Інвалідуємо тільки записи за датою нового візиту
      const visitDate = payload.date?.slice(0, 10);
      if (visitDate) {
        await queryClient.invalidateQueries({ queryKey: ['appointments', visitDate] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося додати візит');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const deleteVisit = async (patientId: string, visitId: string, searchQuery: string) => {
    if (!token || !visitId) return;
    setSaving(true);
    setError('');
    try {
      await apiCall(`/api/patients/${patientId}/visits/${visitId}`, { method: 'DELETE' }, token);
      patientDetailsCache.current.delete(patientId);
      // Оновлюємо список пацієнтів і деталі паралельно
      await Promise.all([loadPatients(searchQuery.trim()), loadPatientDetails(patientId, true)]);
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося видалити візит');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    doctors,
    error,
    loading,
    patients,
    saving,
    selectedDoctorId,
    setError,
    setPatients,
    setSelectedDoctorId,
    createVisit,
    deletePatient,
    deleteVisit,
    loadPatientDetails,
    loadPatients,
    refresh,
    saveTooth,
    submitPatient,
    uploadToothImage,
  };
}
