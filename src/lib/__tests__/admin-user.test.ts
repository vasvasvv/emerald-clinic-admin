import { describe, expect, it } from 'vitest';
import {
  findDentalDoctorForUser,
  findDoctorOptionForUser,
  mapDoctorOptions,
  resolveDoctorIdForAppointment,
} from '@/lib/admin-user';

describe('admin-user helpers', () => {
  it('maps doctor options with fallback to fullName and drops empty names', () => {
    const options = mapDoctorOptions([
      { id: 1, name: 'Dr. A' },
      { id: 2, name: '', fullName: 'Dr. B' },
      { id: 3, name: '   ' },
    ]);

    expect(options).toEqual([
      { id: 1, name: 'Dr. A' },
      { id: 2, name: 'Dr. B' },
    ]);
  });

  it('resolves doctor id by normalized name and falls back to doctor user id', () => {
    const options = [
      { id: 10, name: 'Dr. John   Smith' },
      { id: 11, name: 'Dr. Jane' },
    ];

    expect(resolveDoctorIdForAppointment(options, ' dr. john smith ', null)).toBe(10);
    expect(
      resolveDoctorIdForAppointment(options, 'unknown', { id: 99, email: 'd@x.com', fullName: 'D', role: 'doctor' }),
    ).toBe(99);
    expect(
      resolveDoctorIdForAppointment(options, 'unknown', { id: 77, email: 'a@x.com', fullName: 'A', role: 'admin' }),
    ).toBeNull();
  });

  it('matches doctor profiles for doctor users even when first and last names are swapped', () => {
    const options = [
      { id: 10, name: 'Фаримець Олександр' },
      { id: 11, name: 'Інший Лікар' },
    ];
    const user = { id: 99, email: 'far@example.com', fullName: 'Олександр Фаримець', role: 'doctor' } as const;

    expect(findDoctorOptionForUser(options, user)).toEqual({ id: 10, name: 'Фаримець Олександр' });
    expect(findDentalDoctorForUser([{ id: '10', name: 'Фаримець Олександр', specialty: '' }], user)).toEqual({
      id: '10',
      name: 'Фаримець Олександр',
      specialty: '',
    });
  });
});
