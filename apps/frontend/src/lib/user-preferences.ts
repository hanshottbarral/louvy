'use client';

export type KorusTheme = 'midnight';

export interface UserPreferences {
  theme: KorusTheme;
  displayName?: string;
  avatarUrl?: string;
}

const STORAGE_PREFIX = 'korus:user-preferences:';
export const USER_PREFERENCES_EVENT = 'korus:user-preferences';

export function applyTheme() {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = 'midnight';
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
      theme: 'midnight',
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

  const normalizedPreferences = {
    ...preferences,
    theme: 'midnight' as const,
  };

  window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(normalizedPreferences));
  applyTheme();
  window.dispatchEvent(
    new CustomEvent(USER_PREFERENCES_EVENT, {
      detail: {
        userId,
        preferences: normalizedPreferences,
      },
    }),
  );
}
