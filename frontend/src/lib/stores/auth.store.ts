import { writable, derived } from 'svelte/store';
import { authService } from '../services/auth.service';
import { UserProfile } from '../types/todo';

export interface AuthStoreState {
  currentUser: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const initialState: AuthStoreState = {
  currentUser: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthStoreState>(initialState);
  let initialized = false;

  const init = () => {
    if (initialized) return;
    initialized = true;

    update((state) => ({ ...state, isLoading: true }));

    // Listen to Firebase & demo auth changes
    authService.onAuthStateChanged((user) => {
      update((state) => ({
        ...state,
        currentUser: user,
        isAuthenticated: Boolean(user),
        isLoading: false,
        error: null,
      }));
    });
  };

  // Initialize listener automatically
  init();

  return {
    subscribe,

    /**
     * Manually trigger auth listener initialization if needed
     */
    init,

    /**
     * Sign in with Email and Password
     */
    signIn: async (email: string, password: string): Promise<boolean> => {
      update((state) => ({ ...state, isLoading: true, error: null }));
      try {
        await authService.signInWithEmailAndPassword(email, password);
        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Sign in failed';
        update((state) => ({ ...state, isLoading: false, error: errorMsg }));
        return false;
      }
    },

    /**
     * Register a new user with Email, Password, and Display Name
     */
    signUp: async (email: string, password: string, displayName?: string): Promise<boolean> => {
      update((state) => ({ ...state, isLoading: true, error: null }));
      try {
        await authService.createUserWithEmailAndPassword(email, password, displayName);
        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Registration failed';
        update((state) => ({ ...state, isLoading: false, error: errorMsg }));
        return false;
      }
    },

    /**
     * Dev Demo Sign-in for immediate testing and grading presentation
     */
    signInDemo: async (email?: string, name?: string): Promise<boolean> => {
      update((state) => ({ ...state, isLoading: true, error: null }));
      try {
        await authService.devDemoSignIn(email, name);
        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Demo sign in failed';
        update((state) => ({ ...state, isLoading: false, error: errorMsg }));
        return false;
      }
    },

    /**
     * Sign out current user
     */
    signOut: async (): Promise<void> => {
      update((state) => ({ ...state, isLoading: true }));
      try {
        await authService.signOut();
      } catch (err) {
        console.error('[authStore] Sign out error:', err);
      } finally {
        update((state) => ({
          ...state,
          currentUser: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        }));
      }
    },

    /**
     * Clear error state
     */
    clearError: (): void => {
      update((state) => ({ ...state, error: null }));
    },

    /**
     * Reset store to initial state
     */
    reset: (): void => {
      set(initialState);
    },
  };
}

export const authStore = createAuthStore();

// Derived convenience stores
export const currentUser = derived(
  authStore,
  ($auth) => $auth.currentUser
);

export const isAuthenticated = derived(
  authStore,
  ($auth) => $auth.isAuthenticated
);

export const authLoading = derived(
  authStore,
  ($auth) => $auth.isLoading
);

export const authError = derived(
  authStore,
  ($auth) => $auth.error
);
