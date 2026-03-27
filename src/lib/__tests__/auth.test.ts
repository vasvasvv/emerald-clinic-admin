import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_CHANGED_EVENT,
  AUTH_FLAG_KEY,
  TOKEN_KEY,
  USER_KEY,
  clearAdminSession,
  getAdminToken,
  getAdminUser,
  isAdminAuthenticated,
  setAdminSession,
} from '../auth';

describe('auth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores session values and reports authenticated state', () => {
    const user = { id: 7, email: 'admin@example.com' };

    setAdminSession('token-123', user);

    expect(localStorage.getItem(AUTH_FLAG_KEY)).toBe('true');
    expect(getAdminToken()).toBe('token-123');
    expect(getAdminUser()).toEqual(user);
    expect(isAdminAuthenticated()).toBe(true);
  });

  it('returns null for invalid stored user json', () => {
    localStorage.setItem(USER_KEY, '{broken');

    expect(getAdminUser()).toBeNull();
  });

  it('clears session values and dispatches auth change event', () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_CHANGED_EVENT, listener);
    setAdminSession('token-123', { id: 1 });

    clearAdminSession();

    expect(localStorage.getItem(AUTH_FLAG_KEY)).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(isAdminAuthenticated()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);

    window.removeEventListener(AUTH_CHANGED_EVENT, listener);
  });
});
