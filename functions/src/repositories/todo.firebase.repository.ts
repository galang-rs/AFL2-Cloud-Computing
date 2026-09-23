import { Database } from 'firebase-admin/database';
import { ITodo, TodoEntity } from '../models/todo.model';
import { ITodoRepository } from './todo.repository.interface';
import { getAdminDatabase } from '../config/firebase';

export class TodoFirebaseRepository implements ITodoRepository {
  private db: Database;

  constructor(customDb?: Database) {
    this.db = customDb || getAdminDatabase();
  }

  public async create(userId: string, todoData: Omit<ITodo, 'id'>): Promise<ITodo> {
    const todosRef = this.db.ref(`users/${userId}/todos`);
    const newRef = todosRef.push();
    const id = newRef.key || crypto.randomUUID();

    const entity = new TodoEntity({
      ...todoData,
      id,
      userId
    });

    const dataToSave = {
      id: entity.id,
      userId: entity.userId,
      title: entity.title,
      description: entity.description,
      completed: entity.completed,
      priority: entity.priority,
      category: entity.category,
      color: entity.color,
      dueDate: entity.dueDate,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };

    await newRef.set(dataToSave);
    return entity.toJSON();
  }

  public async findAll(userId: string): Promise<ITodo[]> {
    const todosRef = this.db.ref(`users/${userId}/todos`);
    const snapshot = await todosRef.once('value');

    if (!snapshot.exists()) {
      return [];
    }

    const val = snapshot.val() || {};
    const items: ITodo[] = Object.entries(val).map(([key, raw]: [string, any]) => {
      return new TodoEntity({
        id: String(raw.id || key),
        userId: String(raw.userId || userId),
        title: String(raw.title || ''),
        description: String(raw.description || ''),
        completed: Boolean(raw.completed ?? (raw.status === 'completed')),
        priority: raw.priority || 'medium',
        category: raw.category || 'general',
        color: raw.color || 'amber',
        dueDate: raw.dueDate || null,
        createdAt: Number(raw.createdAt) || Date.now(),
        updatedAt: Number(raw.updatedAt) || Date.now()
      }).toJSON();
    });

    // Sort by createdAt descending
    items.sort((a, b) => b.createdAt - a.createdAt);
    return items;
  }

  public async findById(userId: string, id: string): Promise<ITodo | null> {
    const todoRef = this.db.ref(`users/${userId}/todos/${id}`);
    const snapshot = await todoRef.once('value');

    if (!snapshot.exists()) {
      return null;
    }

    const raw = snapshot.val();
    return new TodoEntity({
      id: String(raw.id || id),
      userId: String(raw.userId || userId),
      title: String(raw.title || ''),
      description: String(raw.description || ''),
      completed: Boolean(raw.completed ?? (raw.status === 'completed')),
      priority: raw.priority || 'medium',
      category: raw.category || 'general',
      color: raw.color || 'amber',
      dueDate: raw.dueDate || null,
      createdAt: Number(raw.createdAt) || Date.now(),
      updatedAt: Number(raw.updatedAt) || Date.now()
    }).toJSON();
  }

  public async update(userId: string, id: string, data: Partial<ITodo>): Promise<ITodo | null> {
    const todoRef = this.db.ref(`users/${userId}/todos/${id}`);
    const snapshot = await todoRef.once('value');

    if (!snapshot.exists()) {
      return null;
    }

    const current = snapshot.val();
    const updatedAt = Date.now();

    const updatePayload: Record<string, any> = {
      ...data,
      updatedAt
    };

    // Remove undefined values to avoid Firebase RTDB errors
    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    });

    await todoRef.update(updatePayload);

    const merged = {
      ...current,
      ...updatePayload,
      id,
      userId
    };

    return new TodoEntity({
      id: String(merged.id),
      userId: String(merged.userId),
      title: String(merged.title),
      description: String(merged.description || ''),
      completed: Boolean(merged.completed),
      priority: merged.priority,
      category: merged.category,
      color: merged.color,
      dueDate: merged.dueDate || null,
      createdAt: Number(merged.createdAt),
      updatedAt: Number(merged.updatedAt)
    }).toJSON();
  }

  public async delete(userId: string, id: string): Promise<boolean> {
    const todoRef = this.db.ref(`users/${userId}/todos/${id}`);
    const snapshot = await todoRef.once('value');

    if (!snapshot.exists()) {
      return false;
    }

    await todoRef.remove();
    return true;
  }

  public async deleteAll(userId: string): Promise<boolean> {
    const todosRef = this.db.ref(`users/${userId}/todos`);
    await todosRef.remove();
    return true;
  }
}
