import { Database } from 'firebase-admin/database';
import { IUser, UserEntity } from '../models/user.model';
import { IUserRepository } from './user.repository.interface';
import { getAdminDatabase } from '../config/firebase';

export class UserFirebaseRepository implements IUserRepository {
  private db: Database;

  constructor(customDb?: Database) {
    this.db = customDb || getAdminDatabase();
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

    const userProfile = {
      id: entity.id,
      email: entity.email,
      passwordHash: entity.passwordHash,
      displayName: entity.displayName,
      role: entity.role,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };

    // Save user profile under users/{id}/profile
    await this.db.ref(`users/${id}/profile`).set(userProfile);

    // Save lookup index by email
    const encoded = this.encodeEmail(entity.email);
    await this.db.ref(`email_index/${encoded}`).set(id);

    return entity.toJSON();
  }

  public async findByEmail(email: string): Promise<IUser | null> {
    const encoded = this.encodeEmail(email);
    const indexSnapshot = await this.db.ref(`email_index/${encoded}`).once('value');

    if (!indexSnapshot.exists()) {
      return null;
    }

    const userId = indexSnapshot.val();
    return this.findById(userId);
  }

  public async findById(id: string): Promise<IUser | null> {
    const profileSnapshot = await this.db.ref(`users/${id}/profile`).once('value');

    if (!profileSnapshot.exists()) {
      return null;
    }

    const row = profileSnapshot.val();
    return new UserEntity({
      id: String(row.id || id),
      email: String(row.email),
      passwordHash: String(row.passwordHash || ''),
      displayName: String(row.displayName || ''),
      role: (row.role || 'student') as any,
      createdAt: Number(row.createdAt) || Date.now(),
      updatedAt: Number(row.updatedAt) || Date.now()
    }).toJSON();
  }
}
