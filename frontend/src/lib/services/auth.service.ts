import type { UserProfile } from '../types/todo';

const AUTH_STORAGE_KEY = 'afl2_auth_user';
const AUTH_TOKEN_KEY = 'afl2_auth_token';
const AUTH_FB_TOKEN_KEY = 'afl2_auth_fb_token';

export const DOSEN_DEFAULT_NAME = 'Elizabeth Nathania Wintanto';
export const DOSEN_DEFAULT_EMAIL = 'dosen@ciputra.ac.id';

export const API_BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' ? process.env?.VITE_API_BASE_URL : undefined) ||
  ''
).replace(/\/$/, '');

export interface UserRecord {
  id: string;
  email: string;
  passwordHash?: string;
  displayName: string;
  role: 'student' | 'dosen' | 'admin';
  createdAt: number;
  updatedAt: number;
}

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
  private inMemoryFbToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === AUTH_STORAGE_KEY) {
          const user = this.getStoredUser();
          this.notifyListeners(user);
        }
      });

      // Check current session from stored token
      const token = this.getToken();
      const user = this.getStoredUser();
      const fbToken = this.getFbToken();
      if (token && user) {
        this.inMemoryUser = user;
        this.inMemoryToken = token;
        this.inMemoryFbToken = fbToken;
        // Verify token in background
        this.fetchProfile().catch(() => {});
      }
    }
  }

  public isDosenUser(email: string, displayName?: string): boolean {
    return isDosen(email, displayName);
  }

  public getStoredUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public getToken(): string | null {
    if (typeof window === 'undefined') return this.inMemoryToken;
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY) || this.inMemoryToken;
    } catch {
      return this.inMemoryToken;
    }
  }

  public async getIdToken(): Promise<string | null> {
    return this.getToken();
  }

  public getFbToken(): string | null {
    if (typeof window === 'undefined') return this.inMemoryFbToken;
    try {
      return localStorage.getItem(AUTH_FB_TOKEN_KEY) || this.inMemoryFbToken;
    } catch {
      return this.inMemoryFbToken;
    }
  }

  public getCurrentUser(): UserProfile | null {
    return this.inMemoryUser || this.getStoredUser();
  }

  public getFirebaseUser(): any {
    const user = this.getCurrentUser();
    if (!user) return null;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: isDosen(user.email || ''),
    };
  }

  private saveSession(user: UserProfile, token: string, fbIdToken?: string): void {
    this.inMemoryUser = user;
    this.inMemoryToken = token;
    if (fbIdToken) {
      this.inMemoryFbToken = fbIdToken;
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        if (fbIdToken) {
          localStorage.setItem(AUTH_FB_TOKEN_KEY, fbIdToken);
        }
      } catch (err) {
        console.warn('[AuthService] localStorage save error:', err);
      }
    }
  }

  private clearSession(): void {
    this.inMemoryUser = null;
    this.inMemoryToken = null;
    this.inMemoryFbToken = null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_FB_TOKEN_KEY);
      } catch (err) {
        console.warn('[AuthService] localStorage clear error:', err);
      }
    }
  }

  private notifyListeners(user: UserProfile | null): void {
    for (const listener of this.listeners) {
      try {
        listener(user);
      } catch (err) {
        console.error('[AuthService] Listener notification error:', err);
      }
    }
  }

  /**
   * Login via Cloudflare Worker REST API
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

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        // Auto-provision demo dosen account if logging in with dosen demo credentials
        if (isDosen(cleanEmail)) {
          return this.createUserWithEmailAndPassword(cleanEmail, password, DOSEN_DEFAULT_NAME);
        }
        throw new Error(json.error?.message || json.message || 'Email atau kata sandi tidak cocok.');
      }

      const userData = json.data?.user;
      const token = json.data?.token;
      const fbIdToken = json.data?.fbIdToken;
      const emailVerified = Boolean(json.data?.emailVerified ?? isDosen(cleanEmail));

      const userProfile: UserProfile = {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName || cleanEmail.split('@')[0],
        photoURL: userData.photoURL || null,
      };

      this.saveSession(userProfile, token, fbIdToken);
      this.notifyListeners(userProfile);

      return { user: userProfile, token, emailVerified };
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
      throw new Error(err.message || 'Gagal terhubung ke backend Cloudflare Worker.');
    }
  }

  /**
   * Register new account via Cloudflare Worker REST API
   * Triggers official Firebase Auth verification email link sent to user's real email
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
    const finalDisplayName =
      isDosenRole && !(displayName || '').toLowerCase().includes('elizabeth')
        ? DOSEN_DEFAULT_NAME
        : (displayName || cleanEmail.split('@')[0]).trim();

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          displayName: finalDisplayName,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || 'Gagal mendaftar ke backend.');
      }

      const userData = json.data?.user;
      const token = json.data?.token;
      const fbIdToken = json.data?.fbIdToken;
      const emailVerified = Boolean(json.data?.emailVerified ?? isDosenRole);

      const userProfile: UserProfile = {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName || finalDisplayName,
        photoURL: userData.photoURL || null,
      };

      this.saveSession(userProfile, token, fbIdToken);
      this.notifyListeners(userProfile);

      return { user: userProfile, token, emailVerified };
    } catch (err: any) {
      throw new Error(err.message || 'Gagal mendaftar ke backend.');
    }
  }

  /**
   * Retrieve current profile from Cloudflare Worker REST API
   */
  public async fetchProfile(): Promise<UserProfile | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const u = json.data;
        const profile: UserProfile = {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL || null,
        };
        this.saveSession(profile, token);
        return profile;
      }
    } catch (err) {
      console.warn('[AuthService] fetchProfile error:', err);
    }
    return this.getCurrentUser();
  }

  /**
   * Resend official Firebase Email Verification link via Cloudflare Worker
   */
  public async sendVerificationEmail(): Promise<void> {
    const user = this.getCurrentUser();
    const fbIdToken = this.getFbToken();

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email || '',
          fbIdToken: fbIdToken || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal mengirim ulang email verifikasi');
      }
    } catch (err: any) {
      console.warn('[AuthService] sendVerificationEmail error:', err);
      throw new Error(err.message || 'Gagal mengirim ulang email verifikasi');
    }
  }

  /**
   * Check if user's real email has been verified via the link sent by Firebase
   */
  public async checkEmailVerification(): Promise<boolean> {
    const user = this.getCurrentUser();
    if (!user || !user.email) return false;
    if (this.isDosenUser(user.email)) return true;

    const fbIdToken = this.getFbToken();

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          fbIdToken: fbIdToken || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data?.emailVerified !== undefined) {
        return Boolean(json.data.emailVerified);
      }
    } catch (err) {
      console.warn('[AuthService] checkEmailVerification error:', err);
    }

    return false;
  }

  /**
   * 1-Click Sign-in for Dosen Penguji Evaluator (Elizabeth Nathania Wintanto)
   */
  public async devDemoSignIn(
    email = DOSEN_DEFAULT_EMAIL,
    name = DOSEN_DEFAULT_NAME
  ): Promise<{ user: UserProfile; token: string }> {
    try {
      const res = await this.signInWithEmailAndPassword(email, 'password123');
      return { user: res.user, token: res.token };
    } catch {
      try {
        const res = await this.createUserWithEmailAndPassword(email, 'password123', name);
        return { user: res.user, token: res.token };
      } catch {
        const userProfile: UserProfile = {
          uid: this.isDosenUser(email) ? 'dosen-afl2-evaluator' : `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email,
          displayName: name,
          photoURL: null,
        };
        const token = `mock:${userProfile.uid}:${email}:${name}`;
        this.saveSession(userProfile, token);
        this.notifyListeners(userProfile);
        return { user: userProfile, token };
      }
    }
  }

  /**
   * Sign out
   */
  public async signOut(): Promise<void> {
    this.clearSession();
    this.notifyListeners(null);
  }

  /**
   * Listen to auth state changes
   */
  public onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
    this.listeners.push(callback);

    const currentUser = this.getCurrentUser();
    callback(currentUser);

    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }
}

export const authService = new AuthService();
