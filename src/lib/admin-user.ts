import type { ApiDoctor, ApiUser, DoctorOption } from '@/types/api';
import type { Doctor } from '@/types/dental';

function normalizeName(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isDoctorUser(user: ApiUser | null | undefined) {
  return user?.role === 'doctor';
}

export function canAccessSiteManagement(user: ApiUser | null | undefined) {
  if (!isDoctorUser(user)) return true;
  return normalizeName(user?.fullName).startsWith('верховський олександр');
}

export function findDoctorOptionForUser(doctors: DoctorOption[], user: ApiUser | null | undefined) {
  if (!isDoctorUser(user)) return null;
  const userName = normalizeName(user?.fullName);
  if (!userName) return null;
  return doctors.find((doctor) => normalizeName(doctor.name) === userName) ?? null;
}

export function findDentalDoctorForUser(doctors: Doctor[], user: ApiUser | null | undefined) {
  if (!isDoctorUser(user)) return null;
  const userName = normalizeName(user?.fullName);
  if (!userName) return null;
  return doctors.find((doctor) => normalizeName(doctor.name) === userName) ?? null;
}

export function mapDoctorOptions(doctors: ApiDoctor[]): DoctorOption[] {
  return doctors
    .map((doctor) => ({
      id: Number(doctor.id),
      name: (doctor.name || doctor.fullName || '').trim(),
    }))
    .filter((doctor) => doctor.name.length > 0);
}

export function resolveDoctorIdForAppointment(
  doctorOptions: DoctorOption[],
  selectedDoctorName: string,
  user: ApiUser | null | undefined,
) {
  const doctor = doctorOptions.find((item) => normalizeName(item.name) === normalizeName(selectedDoctorName));
  if (doctor) return doctor.id;
  if (isDoctorUser(user)) return user.id;
  return null;
}
