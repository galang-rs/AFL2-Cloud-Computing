import type { UserProfile } from '../types/todo';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  sendEmailVerification,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, RTDB_BASE_URL, seedDefaultTodosInRtdb } from '../firebase/client';

const AUTH_STORAGE_KEY = 'afl2_auth_user';
const AUTH_TOKEN_KEY = 'afl2_auth_token';

export const DOSEN_DEFAULT_NAME = 'Elizabeth Nathania Wintanto';
export const DOSEN_DEFAULT_EMAIL = 'dosen@ciputra.ac.id';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: 'student' | 'dosen' | 'admin';
  createdAt: number;
  updatedAt: number;
}

/**
 * Encode email into safe Realtime Database key, matching functions/src/repositories/user.firebase.repository.ts
 */
export function encodeEmailKey(email: string): string {
  return email.toLowerCase().trim().replace(/\./g, '_dot_').replace(/@/g, '_at_');
}

/**
 * Business rule from functions/src/services/auth.service.ts: determine if account is Dosen evaluator
 */
export function isDosen(email: string, displayName?: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedName = (displayName || '').toLowerCase().trim();

  return (
    normalizedEmail.includes('dosen') ||
    normalizedEmail.includes('elizabeth') ||
    normalizedEmail.includes('wintanto') ||
    normalizedEmail.startsWith('evaluasi') ||
    normalizedEmail === DOSEN_DEFAULT_EMAIL ||
    normalizedName.includes('dosen') ||
    normalizedName.includes('penguji') ||
    normalizedName.includes('elizabeth') ||
    normalizedName.includes('wintanto')
  );
}

export class AuthService {
  private listeners: Array<(user: UserProfile | null) => void> = [];
  private inMemoryUser: UserProfile | null = null;
  private inMemoryToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === AUTH_STORAGE_KEY) {
          const user = this.getStoredUser();
          this.notifyListeners(user);
        }
      });

      try {
        onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            const token = await fbUser.getIdToken().catch(() => `token-${fbUser.uid}-${Date.now()}`);
            const userProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User'),
              photoURL: fbUser.photoURL || null,
            };
            this.saveSession(userProfile, token);
            // Always notify so auth store can re-check emailVerified after Firebase initializes
            this.notifyListeners(userProfile);
          }
        });
      } catch (err) {
        console.warn('[AuthService] onAuthStateChanged setup note:', err);
      }
    }
  }

  /**
   * Login using Firebase Authentication with fallback & profile synchronization to RTDB
   */
  public async signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<{ user: UserProfile; token: string; emailVerified: boolean }> {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      throw new Error('Email wajib diisi!');
    }
    if (!password) {
      throw new Error('Kata sandi wajib diisi!');
    }

    let fbUser: FirebaseUser | null = null;
    let uid = '';
    let token = '';
    let fbSuccess = false;
    let emailVerified = true;

    // 1. Official Firebase Auth login
    try {
      const userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      fbUser = userCred.user;
      uid = fbUser.uid;
      emailVerified = fbUser.emailVerified;
      try {
        token = await fbUser.getIdToken();
      } catch {
        token = `token-${uid}-${Date.now()}`;
      }
      fbSuccess = true;
    } catch (fbErr: any) {
      console.warn('[AuthService] Firebase Auth signIn error:', fbErr?.code || fbErr?.message);
      if (fbErr?.code === 'auth/too-many-requests') {
        throw new Error('Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi nanti.');
      }
    }

    // 2. Fallback to RTDB check & auto-migration if Firebase Auth didn't authenticate
    if (!fbSuccess) {
      const encoded = encodeEmailKey(cleanEmail);
      const indexUrl = `${RTDB_BASE_URL}/email_index/${encoded}.json`;

      let rtdbUserId: string | null = null;
      try {
        const idxRes = await fetch(indexUrl);
        rtdbUserId = await idxRes.json();
      } catch (err: any) {
        console.error('[AuthService] Fetch index error:', err);
        throw new Error('Gagal menghubungi database autentikasi.');
      }

      // If not found in email_index
      if (!rtdbUserId) {
        // Auto-provision demo dosen account if logging in with dosen credentials
        if (isDosen(cleanEmail)) {
          return this.createUserWithEmailAndPassword(cleanEmail, password, DOSEN_DEFAULT_NAME);
        }
        throw new Error('Email atau kata sandi tidak cocok.');
      }

      // Retrieve user profile from users/{userId}/profile
      const profileUrl = `${RTDB_BASE_URL}/users/${encodeURIComponent(rtdbUserId)}/profile.json`;
      let userRecord: UserRecord | null = null;
      try {
        const profRes = await fetch(profileUrl);
        userRecord = await profRes.json();
      } catch (err: any) {
        console.error('[AuthService] Fetch profile error:', err);
        throw new Error('Gagal mengambil data profil pengguna.');
      }

      if (!userRecord) {
        throw new Error('Email atau kata sandi tidak cocok.');
      }

      // Password verification for RTDB record
      const storedPassword = userRecord.passwordHash;
      if (storedPassword && storedPassword !== password) {
        throw new Error('Email atau kata sandi tidak cocok.');
      }

      uid = rtdbUserId;
      token = `token-${uid}-${Date.now()}`;

      // Auto-migrate account to Firebase Auth
      try {
        const migrated = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (userRecord.displayName) {
          await updateProfile(migrated.user, { displayName: userRecord.displayName });
        }
        uid = migrated.user.uid;
        token = await migrated.user.getIdToken();
        emailVerified = migrated.user.emailVerified;
      } catch (migErr) {
        console.warn('[AuthService] Auto-migration to Firebase Auth notice:', migErr);
      }
    }

    // 3. Load or sync user profile
    const profileUrl = `${RTDB_BASE_URL}/users/${encodeURIComponent(uid)}/profile.json`;
    let userRecord: UserRecord | null = null;
    try {
      const profRes = await fetch(profileUrl);
      userRecord = await profRes.json();
    } catch {}

    const displayName = userRecord?.displayName || fbUser?.displayName || cleanEmail.split('@')[0];
    const role = userRecord?.role || (isDosen(cleanEmail, displayName) ? 'dosen' : 'student');
    const isDosenAccount = role === 'dosen' || isDosen(cleanEmail, displayName);

    // STRICT BUSINESS RULE: For Dosen accounts, RESET & RESEED fresh evaluation tasks on login!
    if (isDosenAccount) {
      emailVerified = true;
      try {
        await seedDefaultTodosInRtdb(uid);
      } catch (seedErr) {
        console.warn('[AuthService] Dosen seed warning:', seedErr);
      }
    }

    const userProfile: UserProfile = {
      uid,
      email: cleanEmail,
      displayName,
      photoURL: fbUser?.photoURL || null,
    };

    this.saveSession(userProfile, token);
    this.notifyListeners(userProfile);

    return { user: userProfile, token, emailVerified };
  }

  /**
   * Register new account officially in Firebase Authentication and send official Firebase verification email
   */
  public async createUserWithEmailAndPassword(
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ user: UserProfile; token: string; emailVerified: boolean }> {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Format alamat email tidak valid!');
    }
    if (!password || password.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter!');
    }

    const isDosenRole = isDosen(cleanEmail, displayName);
    const role: 'student' | 'dosen' = isDosenRole ? 'dosen' : 'student';
    const finalDisplayName = isDosenRole && !(displayName || '').toLowerCase().includes('elizabeth')
      ? DOSEN_DEFAULT_NAME
      : (displayName || cleanEmail.split('@')[0]).trim();

    let fbUser: FirebaseUser | null = null;
    let uid = '';
    let token = '';
    let emailVerified = false;

    // 1. Official Firebase Auth User Creation
    try {
      const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      fbUser = userCred.user;
      uid = fbUser.uid;
      emailVerified = fbUser.emailVerified;

      try {
        await updateProfile(fbUser, { displayName: finalDisplayName });
      } catch (updErr) {
        console.warn('[AuthService] updateProfile note:', updErr);
      }

      // Send official Firebase email verification
      if (!isDosenRole) {
        try {
          await sendEmailVerification(fbUser);
          console.info('[AuthService] Official Firebase email verification sent to:', cleanEmail);
        } catch (emailErr) {
          console.warn('[AuthService] sendEmailVerification note:', emailErr);
        }
      }

      try {
        token = await fbUser.getIdToken();
      } catch {
        token = `token-${uid}-${Date.now()}`;
      }
    } catch (fbErr: any) {
      if (fbErr?.code === 'auth/email-already-in-use') {
        throw new Error('Email ini sudah terdaftar di Firebase Auth. Silakan masuk atau gunakan email lain.');
      } else if (fbErr?.code === 'auth/invalid-email') {
        throw new Error('Format alamat email tidak valid.');
      } else if (fbErr?.code === 'auth/weak-password') {
        throw new Error('Kata sandi terlalu lemah. Gunakan minimal 6 karakter.');
      } else if (fbErr?.code === 'auth/operation-not-allowed') {
        throw new Error('Penyedia Email/Password belum diaktifkan di panel Firebase Auth.');
      }
      console.warn('[AuthService] Firebase Auth create warning, fallback UID used:', fbErr);
      uid = isDosenRole ? 'dosen-afl2-evaluator' : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      token = `token-${uid}-${Date.now()}`;
    }

    // 2. Synchronize user profile & index to Firebase Realtime Database
    const encoded = encodeEmailKey(cleanEmail);
    const now = Date.now();
    const userRecord: UserRecord = {
      id: uid,
      email: cleanEmail,
      passwordHash: password,
      displayName: finalDisplayName,
      role,
      createdAt: now,
      updatedAt: now,
    };

    try {
      // Save profile to users/{uid}/profile
      await fetch(`${RTDB_BASE_URL}/users/${encodeURIComponent(uid)}/profile.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userRecord),
      });

      // Save lookup index to email_index/{encoded} = uid
      await fetch(`${RTDB_BASE_URL}/email_index/${encoded}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uid),
      });
    } catch (rtdbErr) {
      console.warn('[AuthService] RTDB profile sync warning:', rtdbErr);
    }

    // 3. STRICT BUSINESS RULE: Only seed tasks for Dosen accounts!
    // Normal students receive KOSONGAN (empty) todo list!
    if (role === 'dosen') {
      emailVerified = true;
      try {
        await seedDefaultTodosInRtdb(uid);
      } catch (seedErr) {
        console.warn('[AuthService] Dosen seed warning:', seedErr);
      }
    } else {
      // Ensure student todos node starts completely empty
      try {
        await fetch(`${RTDB_BASE_URL}/users/${encodeURIComponent(uid)}/todos.json`, {
          method: 'DELETE',
        });
      } catch {}
    }

    const userProfile: UserProfile = {
      uid,
      email: cleanEmail,
      displayName: finalDisplayName,
      photoURL: fbUser?.photoURL || null,
    };

    this.saveSession(userProfile, token);
    this.notifyListeners(userProfile);

    return { user: userProfile, token, emailVerified };
  }

  /**
   * Resend official Firebase Email Verification to the current authenticated user
   */
  public async sendVerificationEmail(): Promise<void> {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      console.info('[AuthService] Resent official Firebase verification email.');
    } else {
      throw new Error('Tidak ada akun aktif yang sedang diverifikasi. Silakan masuk terlebih dahulu.');
    }
  }

  /**
   * Checks if current user's email has been verified via Firebase link
   */
  public async checkEmailVerification(): Promise<boolean> {
    if (!auth.currentUser) return false;
    try {
      await auth.currentUser.reload();
      return Boolean(auth.currentUser.emailVerified);
    } catch (err) {
      console.warn('[AuthService] checkEmailVerification reload error:', err);
      return false;
    }
  }

  /**
   * 1-Click Sign-in for Dosen Penguji Evaluator (Elizabeth Nathania Wintanto)
   * Connects to Dosen account in Firebase Auth / RTDB and seeds evaluation tasks.
   */
  public async devDemoSignIn(
    email = DOSEN_DEFAULT_EMAIL,
    name = DOSEN_DEFAULT_NAME
  ): Promise<{ user: UserProfile; token: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const id = 'dosen-afl2-evaluator';
    const now = Date.now();

    let fbUser: FirebaseUser | null = null;
    let uid = id;
    let token = `token-${id}-${Date.now()}`;

    // Try signing in or creating Dosen account in Firebase Auth
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, 'password123');
      fbUser = cred.user;
      uid = fbUser.uid;
      token = await fbUser.getIdToken().catch(() => token);
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, 'password123');
          fbUser = cred.user;
          uid = fbUser.uid;
          await updateProfile(fbUser, { displayName: name });
          token = await fbUser.getIdToken().catch(() => token);
        } catch {}
      }
    }

    const userRecord: UserRecord = {
      id: uid,
      email: cleanEmail,
      passwordHash: 'password123',
      displayName: name,
      role: 'dosen',
      createdAt: now,
      updatedAt: now,
    };

    // Ensure profile and email index are set in RTDB
    const encoded = encodeEmailKey(cleanEmail);
    await fetch(`${RTDB_BASE_URL}/users/${encodeURIComponent(uid)}/profile.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userRecord),
    }).catch(() => null);

    await fetch(`${RTDB_BASE_URL}/email_index/${encoded}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uid),
    }).catch(() => null);

    // Reset & Seed fresh evaluation tasks on login (matching functions logic)
    await seedDefaultTodosInRtdb(uid);

    const userProfile: UserProfile = {
      uid,
      email: cleanEmail,
      displayName: name,
      photoURL: fbUser?.photoURL || null,
    };

    this.saveSession(userProfile, token);
    this.notifyListeners(userProfile);

    return { user: userProfile, token };
  }

  /**
   * Sign out current user session
   */
  public async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('[AuthService] Firebase signOut notice:', err);
    }
    this.clearSession();
    this.notifyListeners(null);
  }

  /**
   * Listen to authentication state changes
   */
  public onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    this.listeners.push(callback);

    const currentUser = this.getCurrentUser();
    callback(currentUser);

    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * Retrieve active JWT Bearer token
   */
  public async getIdToken(): Promise<string | null> {
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken();
      } catch {}
    }
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) return token;
    }
    return this.inMemoryToken;
  }

  /**
   * Get current user profile synchronously
   */
  public getCurrentUser(): UserProfile | null {
    if (this.inMemoryUser) {
      return this.inMemoryUser;
    }
    return this.getStoredUser();
  }

  /**
   * Get the raw Firebase Auth user (for checking emailVerified status, etc.)
   */
  public getFirebaseUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Check if a given email belongs to a Dosen evaluator account
   */
  public isDosenUser(email: string): boolean {
    return isDosen(email);
  }

  // --- Session Storage Helpers ---

  private saveSession(user: UserProfile, token: string): void {
    this.inMemoryUser = user;
    this.inMemoryToken = token;

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        window.localStorage.setItem(AUTH_TOKEN_KEY, token);
      } catch (err) {
        console.error('[AuthService] Failed saving session to localStorage:', err);
      }
    }
  }

  private getStoredUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = window.localStorage.getItem(AUTH_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    this.inMemoryUser = null;
    this.inMemoryToken = null;

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      } catch (err) {
        console.error('[AuthService] Failed clearing session from localStorage:', err);
      }
    }
  }

  private notifyListeners(user: UserProfile | null): void {
    for (const listener of this.listeners) {
      try {
        listener(user);
      } catch (err) {
        console.error('[AuthService] Error in auth listener callback:', err);
      }
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
