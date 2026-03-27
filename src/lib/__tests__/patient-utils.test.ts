import { describe, expect, it } from 'vitest';
import {
  buildPatientName,
  extractFirstName,
  formatPhoneForDisplay,
  normalizePhone,
  splitPatientName,
} from '../patient-utils';

describe('patient-utils', () => {
  describe('normalizePhone', () => {
    it('normalizes 380 format', () => {
      expect(normalizePhone('380501234567')).toBe('+380501234567');
    });

    it('normalizes local 0XX format', () => {
      expect(normalizePhone('0501234567')).toBe('+380501234567');
    });

    it('normalizes nine-digit subscriber number', () => {
      expect(normalizePhone('501234567')).toBe('+380501234567');
    });

    it('returns null for invalid values', () => {
      expect(normalizePhone('123')).toBeNull();
    });
  });

  describe('buildPatientName', () => {
    it('joins last and first name', () => {
      expect(buildPatientName('Шевченко', 'Тарас')).toBe('Шевченко Тарас');
    });

    it('trims whitespace', () => {
      expect(buildPatientName(' Шевченко ', ' Тарас ')).toBe('Шевченко Тарас');
    });
  });

  describe('splitPatientName', () => {
    it('splits the first token as last name', () => {
      expect(splitPatientName('Шевченко Тарас Григорович')).toEqual({
        lastName: 'Шевченко',
        firstName: 'Тарас Григорович',
      });
    });
  });

  describe('extractFirstName', () => {
    it('returns the first name from a full name', () => {
      expect(extractFirstName('Шевченко Тарас Григорович')).toBe('Тарас');
    });

    it('returns the only token when the name has one part', () => {
      expect(extractFirstName('Тарас')).toBe('Тарас');
    });
  });

  describe('formatPhoneForDisplay', () => {
    it('formats normalized Ukrainian numbers', () => {
      expect(formatPhoneForDisplay('+380501234567')).toBe('+38 (050)-123-45-67');
    });

    it('returns original text when the format is unsupported', () => {
      expect(formatPhoneForDisplay('123')).toBe('123');
    });
  });
});
