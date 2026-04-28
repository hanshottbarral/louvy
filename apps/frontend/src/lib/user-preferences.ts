'use client';

export type KorusTheme = 'midnight' | 'cobalt' | 'graphite' | 'ivory' | 'aurora';

export interface UserPreferences {
  theme: KorusTheme;
  displayName?: string;
  avatarUrl?: string;
}

const STORAGE_PREFIX = 'korus:user-preferences:';
export const USER_PREFERENCES_EVENT = 'korus:user-preferences';

export const themeOptions: Array<{ id: KorusTheme; label: string }> = [
  { id: 'midnight', label: 'Midnight' },
  { id: 'cobalt', label: 'Cobalt' },
  { id: 'graphite', label: 'Graphite' },
  { id: 'ivory', label: 'Ivory' },
  { id: 'aurora', label: 'Aurora' },
];

export function applyTheme(theme: KorusTheme) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
}

export function loadUserPreferences(userId: string): UserPreferences {
  if (typeof window === 'undefined') {
    return {
      theme: 'midnight',
    };
  }

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) {
      return {
        theme: 'midnight',
      };
    }

    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      theme: parsed.theme ?? 'midnight',
      displayName: parsed.displayName,
      avatarUrl: parsed.avatarUrl,
    };
  } catch {
    return {
      theme: 'midnight',
    };
  }
}

export function saveUserPreferences(userId: string, preferences: UserPreferences) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(preferences));
  applyTheme(preferences.theme);
  window.dispatchEvent(
    new CustomEvent(USER_PREFERENCES_EVENT, {
      detail: {
        userId,
        preferences,
      },
    }),
  );
}
