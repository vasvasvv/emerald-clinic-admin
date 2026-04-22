import { beforeEach, describe, expect, it } from 'vitest';
import {
  canPerformAction,
  formatPatientName,
  formatPhoneForDisplay,
  formatPhoneForSave,
  formatVisitDate,
  getStoredAdminUser,
  normalizeChangeHistory,
  normalizeDoctor,
  normalizeDoctors,
  normalizePatient,
  normalizeRole,
  normalizeTooth,
  normalizeVisit,
  parseDate,
  resolveDoctorFilter,
  resolveToothTemplateId,
} from '../dental-charts-utils';
import type { Doctor, User } from '@/types/dental';

describe('dental-charts-utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes roles used by stored users', () => {
    expect(normalizeRole('superuser')).toBe('super-admin');
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('doctor')).toBe('doctor');
    expect(normalizeRole(undefined)).toBe('doctor');
  });

  it('reads and normalizes stored admin user', () => {
    localStorage.setItem(
      'dental_admin_user',
      JSON.stringify({
        id: 5,
        email: 'doctor@example.com',
        fullName: 'Dr. House',
        role: 'superadmin',
      }),
    );

    expect(getStoredAdminUser()).toEqual({
      id: '5',
      username: 'doctor@example.com',
      name: 'Dr. House',
      role: 'super-admin',
      createdAt: expect.any(String),
    });
  });

  it('checks permissions by role and resource', () => {
    const admin: User = {
      id: '1',
      username: 'admin',
      name: 'Admin User',
      role: 'admin',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const doctor: User = {
      id: '2',
      username: 'doctor',
      name: 'Doctor User',
      role: 'doctor',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    expect(canPerformAction(admin, 'edit', 'patient')).toBe(true);
    expect(canPerformAction(admin, 'delete', 'user')).toBe(false);
    expect(canPerformAction(doctor, 'delete', 'user')).toBe(true);
    expect(canPerformAction(null, 'add', 'patient')).toBe(false);
  });

  it('resolves tooth template ids from labels and descriptions', () => {
    expect(resolveToothTemplateId('Карієс')).toBe('cavity');
    expect(resolveToothTemplateId('Дентальний імплант')).toBe('implant');
    expect(resolveToothTemplateId('unknown')).toBe('');
  });

  it('normalizes visits from api-like payloads', () => {
    expect(
      normalizeVisit({
        id: 7,
        visit_at: '2026-03-27 10:30:00',
        visit_type: 'past',
        reason: 'Follow-up',
        doctor_user_id: 11,
        doctor_name: 'Dr. A',
      }),
    ).toEqual({
      id: '7',
      date: '2026-03-27 10:30:00',
      type: 'past',
      notes: 'Follow-up',
      doctorId: '11',
      doctorName: 'Dr. A',
    });
  });

  it('normalizes tooth records and detects xray template by files', () => {
    expect(
      normalizeTooth({
        tooth_number: '18',
        status: 'Карієс',
        notes: 'Needs work',
        files: [{ id: 'f1' }],
      }),
    ).toEqual({
      toothNumber: 18,
      description: 'Карієс',
      templateId: 'xray',
      files: [{ id: 'f1' }],
      notes: 'Needs work',
      updatedAt: expect.any(String),
    });
  });

  it('normalizes history entries from changed_* fields', () => {
    expect(
      normalizeChangeHistory({
        id: 3,
        changed_at: '2026-03-27T12:00:00.000Z',
        changed_by_user_id: 9,
        changed_by_name: 'Assistant',
        action: 'update',
        entity_type: 'visit',
      }),
    ).toEqual({
      id: '3',
      timestamp: '2026-03-27T12:00:00.000Z',
      userId: '9',
      userName: 'Assistant',
      action: 'edit',
      target: 'visit',
      details: 'visit: update',
    });
  });

  it('normalizes patients with nested collections', () => {
    const patient = normalizePatient({
      id: 14,
      first_name: 'Іван',
      last_name: 'Петренко',
      middle_name: 'Іванович',
      phone: '+380501234567',
      date_of_birth: '1990-05-12',
      primary_doctor_user_id: 2,
      primary_doctor_name: 'Dr. Smile',
      dentalChart: [{ tooth_number: 11, status: 'Healthy' }],
      visits: [{ id: 1, type: 'future', date: '2026-03-28 09:00:00' }],
      changeHistory: [{ id: 1, action: 'create', entity_type: 'patient', changed_by_name: 'Admin' }],
    });

    expect(patient).toMatchObject({
      id: '14',
      firstName: 'Іван',
      lastName: 'Петренко',
      middleName: 'Іванович',
      phone: '+380501234567',
      dateOfBirth: '1990-05-12',
      doctorId: '2',
      doctorName: 'Dr. Smile',
      detailsLoaded: true,
    });
    expect(patient.dentalChart).toHaveLength(1);
    expect(patient.visits).toHaveLength(1);
    expect(patient.changeHistory).toHaveLength(1);
  });

  it('normalizes doctors and resolves doctor filter for doctor users', () => {
    const doctors: Doctor[] = normalizeDoctors([
      { id: 1, name: 'Dr. One', specialty: 'Therapist' },
      { id: 2, fullName: 'Dr. House' },
    ]);

    expect(normalizeDoctor({ id: 9, fullName: 'Dr. X' })).toEqual({
      id: '9',
      name: 'Dr. X',
      specialty: 'Лікар',
    });
    expect(doctors).toHaveLength(2);
    expect(
      resolveDoctorFilter(doctors, {
        id: '2',
        username: 'house',
        name: 'Dr. House',
        role: 'doctor',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe('2');
    expect(resolveDoctorFilter(doctors, null)).toBe('all');
  });

  it('resolves doctor filter when user and doctor names have reversed order', () => {
    const doctors: Doctor[] = normalizeDoctors([
      { id: 5, name: 'Фаримець Олександр', specialty: 'Терапевт' },
      { id: 6, name: 'Інший Лікар', specialty: 'Хірург' },
    ]);

    expect(
      resolveDoctorFilter(doctors, {
        id: '5',
        username: 'far',
        name: 'Олександр Фаримець',
        role: 'doctor',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe('5');
  });

  it('formats phones and patient names for display', () => {
    expect(formatPhoneForSave('0501234567')).toBe('+380501234567');
    expect(formatPhoneForDisplay('+380501234567')).toBe('+38 (050)-123-45-67');
    expect(
      formatPatientName({
        id: '1',
        firstName: 'Іван',
        lastName: 'Петренко',
        middleName: 'Іванович',
        phone: '',
        dateOfBirth: '',
        doctorId: '',
        dentalChart: [],
        visits: [],
        changeHistory: [],
        createdAt: '',
        updatedAt: '',
      }),
    ).toBe('Петренко Іван Іванович');
  });

  it('parses and formats visit dates safely', () => {
    const parsed = parseDate('2026-03-27 10:45:00');

    expect(parsed).toBeInstanceOf(Date);
    expect(parseDate('')).toBeNull();
    expect(formatVisitDate('')).toBe('—');
    expect(formatVisitDate('2026-03-27 10:45:00')).toContain('27.03.2026');
  });
});
