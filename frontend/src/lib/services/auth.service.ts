import type { UserProfile } from '../types/todo';
import { RTDB_BASE_URL, seedDefaultTodosInRtdb } from '../firebase/client';

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
    }
  }

  /**
   * Login using Firebase Realtime Database with logic matching functions/src/services/auth.service.ts
   */
  public async signInWithEmailAndPassword(
    email: string,
    password: string
  ): Promise<{ user: UserProfile; token: string }> {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      throw new Error('Email wajib diisi!');
    }
    if (!password) {
      throw new Error('Kata sandi wajib diisi!');
    }

    const encoded = encodeEmailKey(cleanEmail);
    const indexUrl = `${RTDB_BASE_URL}/email_index/${encoded}.json`;

    let userId: string | null = null;
    try {
      const idxRes = await fetch(indexUrl);
      userId = await idxRes.json();
    } catch (err: any) {
      console.error('[AuthService] Fetch index error:', err);
      throw new Error('Gagal menghubungi database autentikasi.');
    }

    // If not found in email_index
    if (!userId) {
      // Auto-provision demo dosen account if logging in with dosen credentials (matching functions logic)
      if (isDosen(cleanEmail)) {
        return this.createUserWithEmailAndPassword(cleanEmail, password, DOSEN_DEFAULT_NAME);
      }
      throw new Error('Email atau kata sandi tidak cocok.');
    }

    // Retrieve user profile from users/{userId}/profile
    const profileUrl = `${RTDB_BASE_URL}/users/${encodeURIComponent(userId)}/profile.json`;
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

    // Password verification
    const storedPassword = userRecord.passwordHash;
    if (storedPassword && storedPassword !== password) {
      throw new Error('Email atau kata sandi tidak cocok.');
    }

    const role = userRecord.role || 'student';
    const isDosenAccount = role === 'dosen' || isDosen(cleanEmail, userRecord.displayName);

    // STRICT BUSINESS RULE from functions: For Dosen accounts, RESET & RESEED fresh evaluation tasks on login!
    // For student accounts, DO NOT TOUCH TODOS! Leave them as they are!
    if (isDosenAccount) {
      try {
        await seedDefaultTodosInRtdb(userId);
      } catch (seedErr) {
        console.warn('[AuthService] Dosen seed warning:', seedErr);
      }
    }

    const userProfile: UserProfile = {
      uid: userId,
      email: cleanEmail,
      displayName: userRecord.displayName || cleanEmail.split('@')[0],
      photoURL: null,
    };

    const token = `token-${userId}-${Date.now()}`;
    this.saveSession(userProfile, token);
    this.notifyListeners(userProfile);

    return { user: userProfile, token };
  }

  /**
   * Register new account with logic matching functions/src/services/auth.service.ts
   * Student accounts start COMPLETELY EMPTY (KOSONGAN)!
   */
  public async createUserWithEmailAndPassword(
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ user: UserProfile; token: string }> {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Format alamat email tidak valid!');
    }
    if (!password || password.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter!');
    }

    const encoded = encodeEmailKey(cleanEmail);
    const indexUrl = `${RTDB_BASE_URL}/email_index/${encoded}.json`;

    // 1. Check if email already registered in email_index
    try {
      const checkRes = await fetch(indexUrl);
      const existingUid = await checkRes.json();
      if (existingUid) {
        throw new Error('Email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('sudah terdaftar')) {
        throw err;
      }
    }

    const isDosenRole = isDosen(cleanEmail, displayName);
    const role: 'student' | 'dosen' = isDosenRole ? 'dosen' : 'student';
    const finalDisplayName = isDosenRole && !(displayName || '').toLowerCase().includes('elizabeth')
      ? DOSEN_DEFAULT_NAME
      : (displayName || cleanEmail.split('@')[0]).trim();

    const id = isDosenRole ? 'dosen-afl2-evaluator' : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const userRecord: UserRecord = {
      id,
      email: cleanEmail,
      passwordHash: password,
      displayName: finalDisplayName,
      role,
      createdAt: now,
      updatedAt: now,
    };

    // 2. Save profile to users/{id}/profile
    await fetch(`${RTDB_BASE_URL}/users/${encodeURIComponent(id)}/profile.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userRecord),
    });

    // 3. Save lookup index to email_index/{encoded} = id
    await fetch(indexUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id),
    });

    // STRICT BUSINESS RULE: Only seed tasks for Dosen accounts!
    // Normal students receive KOSONGAN (empty) todo list!
    if (role === 'dosen') {
      try {
        await seedDefaultTodosInRtdb(id);
      } catch (seedErr) {
        console.warn('[AuthService] Dosen seed warning:', seedErr);
      }
    } else {
      // Ensure student todos node starts completely empty
      try {
        await fetch(`${RTDB_BASE_URL}/users/${encodeURIComponent(id)}/todos.json`, {
          method: 'DELETE',
        });
      } catch {}
    }

    const userProfile: UserProfile = {
      uid: id,
      email: cleanEmail,
      displayName: finalDisplayName,
      photoURL: null,
    };

    const token = `token-${id}-${Date.now()}`;
    this.saveSession(userProfile, token);
    this.notifyListeners(userProfile);

    return { user: userProfile, token };
  }

  /**
   * 1-Click Sign-in for Dosen Penguji Evaluator (Elizabeth Nathania Wintanto)
   * Connects to Dosen account and seeds the 5 evaluation tasks.
   */
  public async devDemoSignIn(
    email = DOSEN_DEFAULT_EMAIL,
    name = DOSEN_DEFAULT_NAME
  ): Promise<{ user: UserProfile; token: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const id = 'dosen-afl2-evaluator';
    const now = Date.now();

    const userRecord: UserRecord = {
      id,
      email: cleanEmail,
      passwordHash: 'password123',
      displayName: name,
      role: 'dosen',
      createdAt: now,
      updatedAt: now,
    };

    // Ensure profile and email index are set in RTDB
    const encoded = encodeEmailKey(cleanEmail);
    await fetch(`${RTDB_BASE_URL}/users/${encodeURIComponent(id)}/profile.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userRecord),
    });
    await fetch(`${RTDB_BASE_URL}/email_index/${encoded}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id),
    });

    // Reset & Seed fresh evaluation tasks on login (matching functions logic)
    await seedDefaultTodosInRtdb(id);

    const userProfile: UserProfile = {
      uid: id,
      email: cleanEmail,
      displayName: name,
      photoURL: null,
    };

    const token = `token-${id}-${Date.now()}`;
    this.saveSession(userProfile, token);
    this.notifyListeners(userProfile);

    return { user: userProfile, token };
  }

  /**
   * Sign out current user session
   */
  public async signOut(): Promise<void> {
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
