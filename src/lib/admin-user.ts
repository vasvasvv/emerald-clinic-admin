import type { ApiDoctor, ApiUser, DoctorOption } from '@/types/api';
import type { Doctor } from '@/types/dental';

function normalizeName(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function toNameParts(value: string | null | undefined) {
  return normalizeName(value)
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);
}

function namesMatch(doctorName: string | null | undefined, userName: string | null | undefined) {
  const normalizedDoctor = normalizeName(doctorName);
  const normalizedUser = normalizeName(userName);
  if (!normalizedDoctor || !normalizedUser) return false;
  if (normalizedDoctor === normalizedUser) return true;

  const doctorParts = toNameParts(doctorName);
  const userParts = toNameParts(userName);
  if (doctorParts.length < 2 || userParts.length < 2) return false;

  const doctorKey = [doctorParts[0], doctorParts[1]].sort().join('|');
  const userKey = [userParts[0], userParts[1]].sort().join('|');
  return doctorKey === userKey;
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
  return doctors.find((doctor) => namesMatch(doctor.name, userName)) ?? null;
}

export function findDentalDoctorForUser(doctors: Doctor[], user: ApiUser | null | undefined) {
  if (!isDoctorUser(user)) return null;
  const userName = normalizeName(user?.fullName);
  if (!userName) return null;
  return doctors.find((doctor) => namesMatch(doctor.name, userName)) ?? null;
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
