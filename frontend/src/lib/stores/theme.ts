import { writable, derived } from 'svelte/store';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'afl2_theme';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // Ignore storage error
  }

  // Check if DOM already has dark class
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark';
  }

  // Check OS / Browser preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

function applyThemeToDOM(mode: ThemeMode) {
  if (typeof document !== 'undefined') {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

function createThemeStore() {
  const initial = getInitialTheme();

  // Ensure DOM is synchronously synchronized with the store on initialization
  applyThemeToDOM(initial);

  const { subscribe, set } = writable<ThemeMode>(initial);

  return {
    subscribe,
    set: (mode: ThemeMode) => {
      applyThemeToDOM(mode);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, mode);
        } catch {
          // Ignore
        }
      }
      set(mode);
    },
    toggle: () => {
      // Determine next based on ACTUAL DOM class to guarantee immediate 1-click toggle
      const isCurrentlyDark =
        typeof document !== 'undefined'
          ? document.documentElement.classList.contains('dark')
          : false;

      const next: ThemeMode = isCurrentlyDark ? 'light' : 'dark';

      applyThemeToDOM(next);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
          // Ignore
        }
      }
      set(next);
    },
  };
}

export const themeStore = createThemeStore();

export const isDarkMode = derived(themeStore, ($theme) => $theme === 'dark');
