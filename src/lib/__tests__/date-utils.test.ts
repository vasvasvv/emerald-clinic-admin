import { describe, expect, it } from 'vitest';
import { formatDateKey, getDaysInMonth, getMonday } from '../date-utils';

describe('date-utils', () => {
  it('formats date keys as YYYY-MM-DD', () => {
    expect(formatDateKey(new Date(Date.UTC(2026, 2, 27, 10, 15, 0)))).toBe('2026-03-27');
  });

  it('returns the monday for a mid-week date', () => {
    const monday = getMonday(new Date(2026, 2, 26, 15, 0, 0));

    expect(monday.getFullYear()).toBe(2026);
    expect(monday.getMonth()).toBe(2);
    expect(monday.getDate()).toBe(23);
    expect(monday.getDay()).toBe(1);
    expect(monday.getHours()).toBe(0);
  });

  it('treats sunday as part of the previous week', () => {
    const monday = getMonday(new Date(2026, 2, 29, 9, 0, 0));

    expect(monday.getFullYear()).toBe(2026);
    expect(monday.getMonth()).toBe(2);
    expect(monday.getDate()).toBe(23);
    expect(monday.getDay()).toBe(1);
  });

  it('builds every day in the target month', () => {
    const days = getDaysInMonth(2026, 1);

    expect(days).toHaveLength(28);
    expect(days[0].getFullYear()).toBe(2026);
    expect(days[0].getMonth()).toBe(1);
    expect(days[0].getDate()).toBe(1);
    expect(days[27].getFullYear()).toBe(2026);
    expect(days[27].getMonth()).toBe(1);
    expect(days[27].getDate()).toBe(28);
  });
});
