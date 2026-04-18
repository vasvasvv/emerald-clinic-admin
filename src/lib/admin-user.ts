import type { ApiUser, DoctorOption } from '@/types/api';
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
