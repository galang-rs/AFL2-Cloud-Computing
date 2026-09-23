import { IUser } from '../models/user.model';

export interface IUserRepository {
  create(user: Omit<IUser, 'id'>): Promise<IUser>;
  findByEmail(email: string): Promise<IUser | null>;
  findById(id: string): Promise<IUser | null>;
}
