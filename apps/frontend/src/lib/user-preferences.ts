'use client';

export type LouvyTheme = 'vinho' | 'grafite' | 'oceano' | 'floresta' | 'areia';

export interface UserPreferences {
  theme: LouvyTheme;
  ministries: string[];
  currentMinistry: string;
  displayName?: string;
  avatarUrl?: string;
}

const STORAGE_PREFIX = 'louvy:user-preferences:';
export const USER_PREFERENCES_EVENT = 'louvy:user-preferences';

export const themeOptions: Array<{ id: LouvyTheme; label: string }> = [
  { id: 'vinho', label: 'Vinho' },
  { id: 'grafite', label: 'Grafite' },
  { id: 'oceano', label: 'Oceano' },
  { id: 'floresta', label: 'Floresta' },
  { id: 'areia', label: 'Areia' },
];

export function applyTheme(theme: LouvyTheme) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
}

export function loadUserPreferences(userId: string): UserPreferences {
  if (typeof window === 'undefined') {
    return {
      theme: 'vinho',
      ministries: ['Ministério principal'],
      currentMinistry: 'Ministério principal',
    };
  }

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) {
      return {
        theme: 'vinho',
        ministries: ['Ministério principal'],
        currentMinistry: 'Ministério principal',
      };
    }

    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      theme: parsed.theme ?? 'vinho',
      ministries: parsed.ministries?.length ? parsed.ministries : ['Ministério principal'],
      currentMinistry: parsed.currentMinistry ?? parsed.ministries?.[0] ?? 'Ministério principal',
      displayName: parsed.displayName,
      avatarUrl: parsed.avatarUrl,
    };
  } catch {
    return {
      theme: 'vinho',
      ministries: ['Ministério principal'],
      currentMinistry: 'Ministério principal',
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
