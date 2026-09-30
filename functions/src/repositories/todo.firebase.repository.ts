import { ITodo, TodoEntity } from '../models/todo.model';
import { ITodoRepository } from './todo.repository.interface';
import { getFirebaseDatabaseUrl } from '../config/firebase';

export class TodoFirebaseRepository implements ITodoRepository {
  private databaseUrl: string;
  private inMemoryCache: Map<string, Map<string, ITodo>> = new Map();

  constructor(customUrl?: string) {
    this.databaseUrl = getFirebaseDatabaseUrl(customUrl);
  }

  private getUserCache(userId: string): Map<string, ITodo> {
    if (!this.inMemoryCache.has(userId)) {
      this.inMemoryCache.set(userId, new Map());
    }
    return this.inMemoryCache.get(userId)!;
  }

  public async create(userId: string, todoData: Omit<ITodo, 'id'>): Promise<ITodo> {
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const entity = new TodoEntity({
      ...todoData,
      id,
      userId
    });

    const dataToSave = entity.toJSON();

    // Cache in memory
    const userCache = this.getUserCache(userId);
    userCache.set(id, dataToSave);

    // Save to Firebase Realtime Database via REST API
    try {
      await fetch(
        `${this.databaseUrl}/users/${encodeURIComponent(userId)}/todos/${encodeURIComponent(id)}.json`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSave)
        }
      );
    } catch (err) {
      console.warn('[TodoFirebaseRepository] RTDB create error:', err);
    }

    return dataToSave;
  }

  public async findAll(userId: string): Promise<ITodo[]> {
    const userCache = this.getUserCache(userId);

    try {
      const res = await fetch(`${this.databaseUrl}/users/${encodeURIComponent(userId)}/todos.json`);
      if (res.ok) {
        const val = await res.json();
        if (val && typeof val === 'object') {
          const items: ITodo[] = Object.entries(val).map(([key, raw]: [string, any]) => {
            const item = new TodoEntity({
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

            userCache.set(item.id, item);
            return item;
          });

          items.sort((a, b) => b.createdAt - a.createdAt);
          return items;
        } else {
          return Array.from(userCache.values()).sort((a, b) => b.createdAt - a.createdAt);
        }
      }
    } catch (err) {
      console.warn('[TodoFirebaseRepository] RTDB findAll error:', err);
    }

    // Fallback to in-memory cache
    return Array.from(userCache.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public async findById(userId: string, id: string): Promise<ITodo | null> {
    const userCache = this.getUserCache(userId);

    try {
      const res = await fetch(
        `${this.databaseUrl}/users/${encodeURIComponent(userId)}/todos/${encodeURIComponent(id)}.json`
      );
      if (res.ok) {
        const raw = (await res.json()) as any;
        if (raw && typeof raw === 'object') {
          const item = new TodoEntity({
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

          userCache.set(id, item);
          return item;
        }
      }
    } catch (err) {
      console.warn('[TodoFirebaseRepository] RTDB findById error:', err);
    }

    return userCache.get(id) || null;
  }

  public async update(userId: string, id: string, data: Partial<ITodo>): Promise<ITodo | null> {
    const current = await this.findById(userId, id);
    if (!current) {
      return null;
    }

    const updatedAt = Date.now();
    const updatePayload: Record<string, any> = {
      ...data,
      updatedAt
    };

    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    });

    const userCache = this.getUserCache(userId);
    const merged: ITodo = {
      ...current,
      ...updatePayload,
      id,
      userId
    };
    userCache.set(id, merged);

    try {
      await fetch(
        `${this.databaseUrl}/users/${encodeURIComponent(userId)}/todos/${encodeURIComponent(id)}.json`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        }
      );
    } catch (err) {
      console.warn('[TodoFirebaseRepository] RTDB update error:', err);
    }

    return merged;
  }

  public async delete(userId: string, id: string): Promise<boolean> {
    const userCache = this.getUserCache(userId);
    userCache.delete(id);

    try {
      const res = await fetch(
        `${this.databaseUrl}/users/${encodeURIComponent(userId)}/todos/${encodeURIComponent(id)}.json`,
        { method: 'DELETE' }
      );
      return res.ok;
    } catch (err) {
      console.warn('[TodoFirebaseRepository] RTDB delete error:', err);
      return true;
    }
  }

  public async deleteAll(userId: string): Promise<boolean> {
    const userCache = this.getUserCache(userId);
    userCache.clear();

    try {
      const res = await fetch(
        `${this.databaseUrl}/users/${encodeURIComponent(userId)}/todos.json`,
        { method: 'DELETE' }
      );
      return res.ok;
    } catch (err) {
      console.warn('[TodoFirebaseRepository] RTDB deleteAll error:', err);
      return true;
    }
  }
}
