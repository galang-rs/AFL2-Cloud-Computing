import { ITodo } from '../models/todo.model';

export interface ITodoRepository {
  create(userId: string, todo: Omit<ITodo, 'id'>): Promise<ITodo>;
  findAll(userId: string): Promise<ITodo[]>;
  findById(userId: string, id: string): Promise<ITodo | null>;
  update(userId: string, id: string, data: Partial<ITodo>): Promise<ITodo | null>;
  delete(userId: string, id: string): Promise<boolean>;
  deleteAll(userId: string): Promise<boolean>;
}
