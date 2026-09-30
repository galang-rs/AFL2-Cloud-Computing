import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  getDatabase,
  connectDatabaseEmulator,
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  off,
  type Database,
  type Unsubscribe,
  type DataSnapshot
} from 'firebase/database';
import type { TodoItem, CreateTodoDto, UpdateTodoDto } from '../types/todo';

export const RTDB_BASE_URL = (import.meta.env?.VITE_FIREBASE_DATABASE_URL || '').replace(/\/$/, '');

export const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: RTDB_BASE_URL,
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || '',
};

// Initialize or retrieve Firebase App singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth & Database instances
export const auth = getAuth(app);
export const database: Database = getDatabase(app);

// Re-export getAuth and getDatabase
export { getAuth, getDatabase };

// Support emulator connection if VITE_USE_EMULATORS is set to true
const useEmulators =
  import.meta.env?.VITE_USE_EMULATORS === 'true' ||
  import.meta.env?.VITE_USE_EMULATORS === true;

let emulatorsConnected = false;

export function setupEmulators(): void {
  if (useEmulators && !emulatorsConnected) {
    try {
      const authHost = import.meta.env?.VITE_FIREBASE_AUTH_EMULATOR_HOST || 'http://127.0.0.1:9099';
      connectAuthEmulator(auth, authHost, { disableWarnings: true });

      const rtdbHost = import.meta.env?.VITE_FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1';
      const rtdbPort = Number(import.meta.env?.VITE_FIREBASE_DATABASE_EMULATOR_PORT || 9000);
      connectDatabaseEmulator(database, rtdbHost, rtdbPort);

      emulatorsConnected = true;
      console.info('[FirebaseClient] Connected to Firebase Emulators:', { authHost, rtdbHost, rtdbPort });
    } catch (err) {
      console.warn('[FirebaseClient] Emulator initialization skipped or already active:', err);
    }
  }
}

if (useEmulators) {
  setupEmulators();
}

/**
 * 5 Data Tugas Nyata (Real Todo Items) untuk Mahasiswa & Evaluator
 * Menggunakan konteks akademik & proyek nyata dengan 10 atribut lengkap.
 */
export function getDefaultSeedTodos(userId: string): TodoItem[] {
  const now = Date.now();
  return [
    {
      id: `task-1`,
      userId,
      title: 'Mengerjakan Laporan Proyek AFL2 Pemrograman Web',
      description: 'Menyusun laporan implementasi sistem, arsitektur NoSQL Firebase Realtime Database, dan dokumentasi fitur Kanban.',
      completed: true,
      priority: 'high',
      category: 'academic',
      color: 'amber',
      dueDate: '2026-09-30',
      createdAt: new Date(now - 3600000 * 8).toISOString(),
      updatedAt: new Date(now - 3600000 * 2).toISOString(),
    },
    {
      id: `task-2`,
      userId,
      title: 'Persiapan Demonstrasi Proyek ke Dosen Penguji',
      description: 'Menyiapkan skenario uji coba fitur autentikasi, pembuatan sticky note baru, filter prioritas, dan live sync.',
      completed: true,
      priority: 'urgent',
      category: 'work',
      color: 'rose',
      dueDate: '2026-10-01',
      createdAt: new Date(now - 3600000 * 6).toISOString(),
      updatedAt: new Date(now - 3600000 * 1).toISOString(),
    },
    {
      id: `task-3`,
      userId,
      title: 'Review Materi Kuliah Cloud Database & BaaS',
      description: 'Mempelajari kembali konsep sinkronisasi WebSocket, struktur JSON tree, dan security rules pada Firebase.',
      completed: false,
      priority: 'high',
      category: 'academic',
      color: 'sky',
      dueDate: '2026-10-03',
      createdAt: new Date(now - 3600000 * 4).toISOString(),
      updatedAt: new Date(now - 3600000 * 4).toISOString(),
    },
    {
      id: `task-4`,
      userId,
      title: 'Diskusi Koordinasi Finalisasi Antarmuka Kanban',
      description: 'Memastikan estetika visual papan sticky notes, animasi drag & drop, serta mode gelap dan terang berfungsi sempurna.',
      completed: false,
      priority: 'medium',
      category: 'work',
      color: 'emerald',
      dueDate: '2026-10-05',
      createdAt: new Date(now - 3600000 * 2).toISOString(),
      updatedAt: new Date(now - 3600000 * 2).toISOString(),
    },
    {
      id: `task-5`,
      userId,
      title: 'Membeli Buku Referensi Web Development Modern',
      description: 'Membeli buku pegangan perancangan antarmuka komponen Svelte dan Tailwind CSS untuk referensi belajar.',
      completed: false,
      priority: 'low',
      category: 'personal',
      color: 'yellow',
      dueDate: '2026-10-08',
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    },
  ];
}

/**
 * Fetch todos from Firebase Realtime Database with guaranteed REST primary call
 */
export async function getTodosFromRtdb(userId: string): Promise<TodoItem[]> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/users/${encodeURIComponent(userId)}/todos.json`);
    const val = await res.json();
    if (val && typeof val === 'object') {
      return mapRtdbDictToTodoList(val, userId);
    }
  } catch (err) {
    console.warn('[FirebaseClient] REST getTodos warning:', err);
  }

  // SDK fallback
  try {
    const todosRef = ref(database, `users/${userId}/todos`);
    const snapshot = await get(todosRef);
    const val = snapshot.val();
    if (val && typeof val === 'object') {
      return mapRtdbDictToTodoList(val, userId);
    }
  } catch {}

  return [];
}

function mapRtdbDictToTodoList(val: Record<string, any>, defaultUserId: string): TodoItem[] {
  const items: TodoItem[] = Object.entries(val).map(([key, rawItem]: [string, any]) => {
    const createdAtVal = rawItem.createdAt;
    const updatedAtVal = rawItem.updatedAt;

    return {
      id: rawItem.id || key,
      userId: rawItem.userId || defaultUserId,
      title: rawItem.title || '',
      description: rawItem.description || '',
      completed: Boolean(rawItem.completed ?? (rawItem.status === 'completed')),
      priority: rawItem.priority || 'medium',
      category: rawItem.category || 'general',
      color: rawItem.color || 'amber',
      dueDate: rawItem.dueDate || null,
      createdAt:
        typeof createdAtVal === 'number'
          ? new Date(createdAtVal).toISOString()
          : createdAtVal || new Date().toISOString(),
      updatedAt:
        typeof updatedAtVal === 'number'
          ? new Date(updatedAtVal).toISOString()
          : updatedAtVal || new Date().toISOString(),
    };
  });

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items;
}

/**
 * Subscribe to real-time changes in a user's todo collection in Firebase Realtime Database.
 */
export function listenToUserTodos(
  userId: string,
  onUpdate: (todos: TodoItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const todosRef = ref(database, `users/${userId}/todos`);

  const handleValue = (snapshot: DataSnapshot) => {
    try {
      const val = snapshot.val();
      if (!val) {
        onUpdate([]);
        return;
      }
      const items = mapRtdbDictToTodoList(val, userId);
      onUpdate(items);
    } catch (err) {
      if (onError && err instanceof Error) {
        onError(err);
      }
    }
  };

  const handleError = (error: Error) => {
    if (onError) {
      onError(error);
    } else {
      console.warn('[RTDB Listener]:', error.message);
    }
  };

  return onValue(todosRef, handleValue, handleError);
}

/**
 * Cleanly detach RTDB listeners
 */
export function stopListeningToUserTodos(userId: string): void {
  try {
    const todosRef = ref(database, `users/${userId}/todos`);
    off(todosRef);
  } catch (err) {
    console.warn('[RTDB off]:', err);
  }
}

/**
 * Save / Create a new todo in Firebase Realtime Database directly with guaranteed REST
 */
export async function createTodoInRtdb(userId: string, dto: CreateTodoDto): Promise<TodoItem> {
  const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const item: TodoItem = {
    id,
    userId,
    title: dto.title.trim(),
    description: dto.description || '',
    completed: Boolean(dto.completed),
    priority: dto.priority || 'medium',
    category: dto.category || 'general',
    color: dto.color || 'amber',
    dueDate: dto.dueDate || null,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Direct guaranteed REST write to Firebase Realtime Database cloud
  const res = await fetch(`${RTDB_BASE_URL}/users/${encodeURIComponent(userId)}/todos/${id}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });

  if (!res.ok) {
    throw new Error(`Gagal menyimpan ke Realtime Database (Status ${res.status})`);
  }

  // 2. Also notify SDK cache
  try {
    const itemRef = ref(database, `users/${userId}/todos/${id}`);
    set(itemRef, item).catch(() => {});
  } catch {}

  return item;
}

/**
 * Update an existing todo in Firebase Realtime Database directly with guaranteed REST
 */
export async function updateTodoInRtdb(
  userId: string,
  id: string,
  dto: UpdateTodoDto
): Promise<Partial<TodoItem>> {
  const updates: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (dto.title !== undefined) updates.title = dto.title;
  if (dto.description !== undefined) updates.description = dto.description;
  if (dto.completed !== undefined) updates.completed = dto.completed;
  if (dto.priority !== undefined) updates.priority = dto.priority;
  if (dto.category !== undefined) updates.category = dto.category;
  if (dto.color !== undefined) updates.color = dto.color;
  if (dto.dueDate !== undefined) updates.dueDate = dto.dueDate;

  // 1. Direct guaranteed REST update to Firebase Realtime Database cloud
  const res = await fetch(`${RTDB_BASE_URL}/users/${encodeURIComponent(userId)}/todos/${encodeURIComponent(id)}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    throw new Error(`Gagal memperbarui ke Realtime Database (Status ${res.status})`);
  }

  // 2. Also notify SDK cache
  try {
    const todoRef = ref(database, `users/${userId}/todos/${id}`);
    update(todoRef, updates).catch(() => {});
  } catch {}

  return updates;
}

/**
 * Delete a todo from Firebase Realtime Database directly with guaranteed REST
 */
export async function deleteTodoInRtdb(userId: string, id: string): Promise<void> {
  // 1. Direct guaranteed REST delete from Firebase Realtime Database cloud
  const res = await fetch(`${RTDB_BASE_URL}/users/${encodeURIComponent(userId)}/todos/${encodeURIComponent(id)}.json`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error(`Gagal menghapus dari Realtime Database (Status ${res.status})`);
  }

  // 2. Also notify SDK cache
  try {
    const todoRef = ref(database, `users/${userId}/todos/${id}`);
    remove(todoRef).catch(() => {});
  } catch {}
}

/**
 * Seed initial default 5 realistic tasks to Firebase Realtime Database
 */
export async function seedDefaultTodosInRtdb(userId: string): Promise<TodoItem[]> {
  const seeds = getDefaultSeedTodos(userId);
  const dict: Record<string, any> = {};
  for (const item of seeds) {
    dict[item.id] = item;
  }

  // 1. Direct guaranteed REST write to Firebase Realtime Database cloud
  await fetch(`${RTDB_BASE_URL}/users/${encodeURIComponent(userId)}/todos.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dict),
  });

  // 2. Also notify SDK cache
  try {
    const todosRef = ref(database, `users/${userId}/todos`);
    update(todosRef, dict).catch(() => {});
  } catch {}

  return seeds;
}
