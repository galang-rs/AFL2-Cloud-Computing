import { writable, derived } from 'svelte/store';
import { authService } from '../services/auth.service';
import { UserProfile } from '../types/todo';

export interface PendingFormData {
  displayName: string;
  email: string;
}

export interface AuthStoreState {
  currentUser: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  isEmailVerificationPending: boolean;
  isVerificationSuccess: boolean;
  pendingVerificationEmail: string | null;
  resendCooldown: number;
  verificationMessage: string | null;
  pendingFormData: PendingFormData | null;
}

const initialState: AuthStoreState = {
  currentUser: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  isEmailVerificationPending: false,
  isVerificationSuccess: false,
  pendingVerificationEmail: null,
  resendCooldown: 0,
  verificationMessage: null,
  pendingFormData: null,
};

let cooldownInterval: any = null;
let verificationPollInterval: any = null;
let suppressAuthListener = false;

function startCooldown(setSeconds: (sec: number) => void) {
  if (cooldownInterval) clearInterval(cooldownInterval);
  let seconds = 60;
  setSeconds(seconds);

  cooldownInterval = setInterval(() => {
    seconds -= 1;
    if (seconds <= 0) {
      clearInterval(cooldownInterval);
      cooldownInterval = null;
      setSeconds(0);
    } else {
      setSeconds(seconds);
    }
  }, 1000);
  if (cooldownInterval && typeof cooldownInterval.unref === 'function') {
    cooldownInterval.unref();
  }
}

function stopPolling() {
  if (verificationPollInterval) {
    clearInterval(verificationPollInterval);
    verificationPollInterval = null;
  }
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthStoreState>(initialState);
  let initialized = false;

  const init = () => {
    if (initialized) return;
    initialized = true;

    update((state) => ({ ...state, isLoading: true }));

    // Listen to Firebase & auth changes
    authService.onAuthStateChanged((user) => {
      // Suppress auth listener during signUp/signIn flow to prevent race condition
      // where isAuthenticated gets set to true before isEmailVerificationPending is set
      if (suppressAuthListener) return;

      // Determine what action to take BEFORE calling update(),
      // so side-effects (startCooldown, startAutoCheckPolling) run OUTSIDE the update callback.
      let needsVerificationRedirect = false;

      if (user) {
        if (typeof window === 'undefined') {
          update((state) => ({
            ...state,
            currentUser: user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          }));
          return;
        }

        const isDosenAccount = authService.isDosenUser(user.email || '');
        if (isDosenAccount) {
          update((state) => ({
            ...state,
            currentUser: user,
            isAuthenticated: true,
            isEmailVerificationPending: false,
            isLoading: false,
            error: null,
          }));
          return;
        }

        const fbUser = authService.getFirebaseUser();

        if (!fbUser) {
          // Firebase hasn't initialized yet — keep loading, wait for second notification
          update((state) => ({
            ...state,
            currentUser: user,
            isAuthenticated: false,
            isLoading: true,
          }));
          return;
        }

        needsVerificationRedirect = !fbUser.emailVerified;
      }

      update((state) => {
        // If verification is already pending, keep the user but don't authenticate
        if (state.isEmailVerificationPending) {
          return {
            ...state,
            currentUser: user,
            isAuthenticated: false,
            isLoading: false,
          };
        }

        if (user && needsVerificationRedirect) {
          return {
            ...state,
            currentUser: user,
            isAuthenticated: false,
            isEmailVerificationPending: true,
            pendingVerificationEmail: user.email || null,
            isLoading: false,
          };
        }

        return {
          ...state,
          currentUser: user,
          isAuthenticated: Boolean(user),
          isLoading: false,
          error: null,
        };
      });

      // Start auto-check polling AFTER the state update has been applied.
      // Only start if not already polling (e.g. signUp/signIn already started it).
      // NOTE: Do NOT start cooldown here — cooldown is only triggered by explicit
      // user actions (signUp, signIn, resendVerificationEmail). This prevents:
      //   1) Double cooldown restart after signUp (Firebase listener fires again)
      //   2) Forced 60s wait after page refresh (user can resend immediately)
      if (needsVerificationRedirect && !verificationPollInterval) {
        startAutoCheckPolling();
      }
    });
  };

  const startAutoCheckPolling = () => {
    stopPolling();
    verificationPollInterval = setInterval(async () => {
      try {
        const isVerified = await authService.checkEmailVerification();
        if (isVerified) {
          stopPolling();
          if (cooldownInterval) clearInterval(cooldownInterval);

          const current = authService.getCurrentUser();
          // Don't set isAuthenticated yet — show success screen first
          update((state) => ({
            ...state,
            isEmailVerificationPending: true,
            isVerificationSuccess: true,
            currentUser: current,
            verificationMessage: 'Email berhasil diverifikasi! Selamat datang.',
            error: null,
          }));
        }
      } catch (err) {
        console.warn('[authStore] Polling verification error:', err);
      }
    }, 3000);
    if (verificationPollInterval && typeof verificationPollInterval.unref === 'function') {
      verificationPollInterval.unref();
    }
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
     * Sign up new user and trigger official Firebase Email Verification
     */
    signUp: async (email: string, password: string, displayName?: string): Promise<boolean> => {
      update((state) => ({ ...state, isLoading: true, error: null, verificationMessage: null }));

      // Suppress onAuthStateChanged listener to prevent race condition:
      // Firebase fires onAuthStateChanged immediately after createUser,
      // before we set isEmailVerificationPending = true, which would
      // incorrectly set isAuthenticated = true and flash to dashboard.
      suppressAuthListener = true;

      try {
        const result = await authService.createUserWithEmailAndPassword(email, password, displayName);
        const cleanEmail = email.toLowerCase().trim();

        // If email is already verified (e.g. Dosen account), enter immediately
        if (result.emailVerified) {
          suppressAuthListener = false;
          update((state) => ({
            ...state,
            isLoading: false,
            isEmailVerificationPending: false,
            isAuthenticated: true,
            currentUser: result.user,
            error: null,
            pendingFormData: null,
          }));
          return true;
        }

        // Show Email Verification screen — set BEFORE releasing the listener
        update((state) => ({
          ...state,
          isLoading: false,
          isEmailVerificationPending: true,
          pendingVerificationEmail: cleanEmail,
          isAuthenticated: false,
          error: null,
          pendingFormData: {
            displayName: displayName || '',
            email: cleanEmail,
          },
        }));

        // Now safe to re-enable the listener (isEmailVerificationPending is already true)
        suppressAuthListener = false;

        startCooldown((sec) => {
          update((s) => ({ ...s, resendCooldown: sec }));
        });

        startAutoCheckPolling();
        return true;
      } catch (err) {
        suppressAuthListener = false;
        const errorMsg = err instanceof Error ? err.message : 'Registration failed';
        update((state) => ({ ...state, isLoading: false, error: errorMsg }));
        return false;
      }
    },

    /**
     * Manually check if user has clicked the Firebase verification link
     */
    checkEmailVerificationStatus: async (): Promise<boolean> => {
      update((state) => ({ ...state, isLoading: true, error: null }));
      try {
        const isVerified = await authService.checkEmailVerification();
        if (isVerified) {
          stopPolling();
          if (cooldownInterval) clearInterval(cooldownInterval);

          const current = authService.getCurrentUser();
          // Don't set isAuthenticated yet — show success screen first
          update((state) => ({
            ...state,
            isLoading: false,
            isEmailVerificationPending: true,
            isVerificationSuccess: true,
            currentUser: current,
            verificationMessage: 'Email berhasil diverifikasi!',
            error: null,
          }));
          return true;
        } else {
          update((state) => ({
            ...state,
            isLoading: false,
            error: 'Email belum diverifikasi. Silakan buka kotak masuk email Anda dan klik link verifikasi dari Firebase.',
          }));
          return false;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Gagal memeriksa status email';
        update((state) => ({ ...state, isLoading: false, error: errorMsg }));
        return false;
      }
    },

    /**
     * Resend official Firebase Email Verification
     */
    resendVerificationEmail: async (): Promise<boolean> => {
      update((state) => ({ ...state, isLoading: true, error: null }));
      try {
        await authService.sendVerificationEmail();
        update((state) => ({
          ...state,
          isLoading: false,
          verificationMessage: 'Email verifikasi baru telah dikirim langsung dari Google Firebase.',
          error: null,
        }));

        startCooldown((sec) => {
          update((s) => ({ ...s, resendCooldown: sec }));
        });

        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Gagal mengirim ulang email verifikasi';
        update((state) => ({ ...state, isLoading: false, error: errorMsg }));
        return false;
      }
    },

    /**
     * Cancel pending verification and return to registration/login
     */
    cancelVerification: async (): Promise<void> => {
      stopPolling();
      if (cooldownInterval) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
      }
      try {
        await authService.signOut();
      } catch {}
      // Note: we do NOT clear pendingFormData here, so the RegisterPage
      // can restore the form fields when the user goes back to the form.
      update((state) => ({
        ...state,
        isEmailVerificationPending: false,
        isVerificationSuccess: false,
        pendingVerificationEmail: null,
        resendCooldown: 0,
        verificationMessage: null,
        error: null,
      }));
    },

    /**
     * Sign in with Email and Password
     */
    signIn: async (email: string, password: string): Promise<boolean> => {
      update((state) => ({ ...state, isLoading: true, error: null }));

      // Suppress listener during signIn to prevent race condition
      suppressAuthListener = true;

      try {
        const result = await authService.signInWithEmailAndPassword(email, password);

        // If email not verified and not Dosen, show verification screen
        if (!result.emailVerified) {
          update((state) => ({
            ...state,
            isLoading: false,
            isEmailVerificationPending: true,
            pendingVerificationEmail: email.toLowerCase().trim(),
            isAuthenticated: false,
            error: null,
          }));

          suppressAuthListener = false;

          startCooldown((sec) => {
            update((s) => ({ ...s, resendCooldown: sec }));
          });

          startAutoCheckPolling();
          return false;
        }

        suppressAuthListener = false;
        update((state) => ({
          ...state,
          isLoading: false,
          isEmailVerificationPending: false,
          isAuthenticated: true,
          currentUser: result.user,
          error: null,
        }));
        return true;
      } catch (err) {
        suppressAuthListener = false;
        const errorMsg = err instanceof Error ? err.message : 'Sign in failed';
        update((state) => ({ ...state, isLoading: false, error: errorMsg }));
        return false;
      }
    },

    /**
     * Dev Demo Sign-in for immediate testing and grading presentation (Dosen Evaluator)
     */
    signInDemo: async (email?: string, name?: string): Promise<boolean> => {
      update((state) => ({ ...state, isLoading: true, error: null }));
      try {
        stopPolling();
        await authService.devDemoSignIn(email, name);
        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Demo sign in failed';
        update((state) => ({ ...state, isLoading: false, error: errorMsg }));
        return false;
      }
    },

    /**
     * Reset Dosen tasks back to fresh 5 default tasks
     */
    resetDosenData: async (): Promise<boolean> => {
      return await authService.resetDosenSeeder();
    },

    /**
     * After verification success screen, proceed to dashboard
     */
    proceedToDashboard: (): void => {
      update((state) => ({
        ...state,
        isEmailVerificationPending: false,
        isVerificationSuccess: false,
        pendingVerificationEmail: null,
        isAuthenticated: true,
        verificationMessage: null,
        error: null,
        pendingFormData: null,
      }));
    },

    /**
     * Sign out current user
     */
    signOut: async (): Promise<void> => {
      stopPolling();
      if (cooldownInterval) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
      }
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
          isEmailVerificationPending: false,
          isVerificationSuccess: false,
          pendingVerificationEmail: null,
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
      stopPolling();
      if (cooldownInterval) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
      }
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

export const isEmailVerificationPending = derived(
  authStore,
  ($auth) => $auth.isEmailVerificationPending
);

export const isVerificationSuccess = derived(
  authStore,
  ($auth) => $auth.isVerificationSuccess
);

export const pendingVerificationEmail = derived(
  authStore,
  ($auth) => $auth.pendingVerificationEmail
);

export const resendCooldown = derived(
  authStore,
  ($auth) => $auth.resendCooldown
);

export const verificationMessage = derived(
  authStore,
  ($auth) => $auth.verificationMessage
);

export const pendingFormData = derived(
  authStore,
  ($auth) => $auth.pendingFormData
);
