import { IUser, UserEntity } from '../models/user.model';
import { IUserRepository } from './user.repository.interface';
import { getFirebaseDatabaseUrl, getFirebaseApiKey } from '../config/firebase';

export class UserFirebaseRepository implements IUserRepository {
  private databaseUrl: string;
  private apiKey: string;
  private inMemoryUsers: Map<string, IUser> = new Map();
  private inMemoryEmailIndex: Map<string, string> = new Map();

  constructor(customUrl?: string, customApiKey?: string) {
    this.databaseUrl = getFirebaseDatabaseUrl(customUrl);
    this.apiKey = getFirebaseApiKey(customApiKey);
  }

  private encodeEmail(email: string): string {
    return email.toLowerCase().trim().replace(/\./g, '_dot_').replace(/@/g, '_at_');
  }

  public async create(userData: Omit<IUser, 'id'>): Promise<IUser> {
    const id = crypto.randomUUID();
    const entity = new UserEntity({
      ...userData,
      id
    });

    const userProfile = entity.toJSON();

    // Cache in-memory
    this.inMemoryUsers.set(id, userProfile);
    const encoded = this.encodeEmail(entity.email);
    this.inMemoryEmailIndex.set(encoded, id);

    // Persist to Firebase Realtime Database via REST API
    try {
      await Promise.all([
        fetch(`${this.databaseUrl}/users/${encodeURIComponent(id)}/profile.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userProfile)
        }),
        fetch(`${this.databaseUrl}/email_index/${encodeURIComponent(encoded)}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(id)
        })
      ]);
    } catch (err) {
      console.warn('[UserFirebaseRepository] RTDB write error:', err);
    }

    return userProfile;
  }

  public async findByEmail(email: string): Promise<IUser | null> {
    const encoded = this.encodeEmail(email);

    // 1. Try Firebase Realtime Database REST API
    try {
      const res = await fetch(`${this.databaseUrl}/email_index/${encodeURIComponent(encoded)}.json`);
      if (res.ok) {
        const userId = await res.json();
        if (userId && typeof userId === 'string') {
          return await this.findById(userId);
        }
      }
    } catch (err) {
      console.warn('[UserFirebaseRepository] RTDB findByEmail error:', err);
    }

    // Fallback to in-memory cache
    const cachedId = this.inMemoryEmailIndex.get(encoded);
    if (cachedId) {
      return this.findById(cachedId);
    }

    return null;
  }

  public async findById(id: string): Promise<IUser | null> {
    // 1. Try Firebase Realtime Database REST API
    try {
      const res = await fetch(`${this.databaseUrl}/users/${encodeURIComponent(id)}/profile.json`);
      if (res.ok) {
        const row = (await res.json()) as any;
        if (row && typeof row === 'object') {
          const user = new UserEntity({
            id: String(row.id || id),
            email: String(row.email),
            passwordHash: String(row.passwordHash || ''),
            displayName: String(row.displayName || ''),
            role: (row.role || 'student') as any,
            createdAt: Number(row.createdAt) || Date.now(),
            updatedAt: Number(row.updatedAt) || Date.now()
          }).toJSON();

          this.inMemoryUsers.set(id, user);
          return user;
        }
      }
    } catch (err) {
      console.warn('[UserFirebaseRepository] RTDB findById error:', err);
    }

    // Fallback to in-memory cache
    return this.inMemoryUsers.get(id) || null;
  }
}
