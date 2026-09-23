export type UserRole = 'student' | 'dosen' | 'admin';

export interface IUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}

export interface UserResponseProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL: string | null;
}

export class UserEntity implements IUser {
  public id: string;
  public email: string;
  public passwordHash: string;
  public displayName: string;
  public role: UserRole;
  public createdAt: number;
  public updatedAt: number;

  constructor(data: IUser) {
    this.id = data.id;
    this.email = data.email.toLowerCase().trim();
    this.passwordHash = data.passwordHash;
    this.displayName = data.displayName.trim();
    this.role = data.role || 'student';
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
  }

  public toProfile(): UserResponseProfile {
    return {
      uid: this.id,
      email: this.email,
      displayName: this.displayName,
      role: this.role,
      photoURL: null
    };
  }

  public toJSON(): IUser {
    return {
      id: this.id,
      email: this.email,
      passwordHash: this.passwordHash,
      displayName: this.displayName,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
