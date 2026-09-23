process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthService, DOSEN_DEFAULT_NAME } from '../services/auth.service';
import { IUserRepository } from '../repositories/user.repository.interface';
import { ITodoRepository } from '../repositories/todo.repository.interface';
import { IUser, UserEntity } from '../models/user.model';
import { ITodo, TodoEntity } from '../models/todo.model';
import { AppError } from '../services/todo.service';
import { verifyJwt } from '../utils/crypto.utils';

class InMemoryUserRepository implements IUserRepository {
  public users: Map<string, IUser> = new Map();

  async create(user: Omit<IUser, 'id'>): Promise<IUser> {
    const id = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const entity = new UserEntity({ ...user, id });
    const json = entity.toJSON();
    this.users.set(id, json);
    return json;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const normalized = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email === normalized) {
        return u;
      }
    }
    return null;
  }

  async findById(id: string): Promise<IUser | null> {
    return this.users.get(id) || null;
  }
}

class InMemoryTodoRepository implements ITodoRepository {
  public todos: Map<string, ITodo> = new Map();

  async create(userId: string, todo: Omit<ITodo, 'id'>): Promise<ITodo> {
    const id = `todo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const entity = new TodoEntity({ ...todo, id, userId });
    const json = entity.toJSON();
    this.todos.set(id, json);
    return json;
  }

  async findAll(userId: string): Promise<ITodo[]> {
    return Array.from(this.todos.values()).filter((t) => t.userId === userId);
  }

  async findById(userId: string, id: string): Promise<ITodo | null> {
    return this.todos.get(id) || null;
  }

  async update(userId: string, id: string, data: Partial<ITodo>): Promise<ITodo | null> {
    const item = this.todos.get(id);
    if (!item) return null;
    const updated = { ...item, ...data };
    this.todos.set(id, updated);
    return updated;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    return this.todos.delete(id);
  }

  async deleteAll(userId: string): Promise<boolean> {
    for (const [id, t] of this.todos.entries()) {
      if (t.userId === userId) {
        this.todos.delete(id);
      }
    }
    return true;
  }
}

test('1. AuthService - Normal student registration creates account with ZERO dummy data', async () => {
  const userRepo = new InMemoryUserRepository();
  const todoRepo = new InMemoryTodoRepository();
  const authService = new AuthService(userRepo, todoRepo);

  const result = await authService.register({
    email: 'joe.biden@ciputra.ac.id',
    password: 'securepassword123',
    displayName: 'Joe Biden'
  });

  assert.equal(result.user.email, 'joe.biden@ciputra.ac.id');
  assert.equal(result.user.displayName, 'Joe Biden');
  assert.equal(result.user.role, 'student');
  assert.ok(result.token);

  // Verify JWT contents
  const payload = await verifyJwt(result.token);
  assert.equal(payload.uid, result.user.uid);
  assert.equal(payload.role, 'student');

  // Verify ZERO dummy data rule for normal student!
  const userTodos = await todoRepo.findAll(result.user.uid);
  assert.equal(userTodos.length, 0, 'Normal student account must have 0 initial dummy todos!');
});

test('2. AuthService - Dosen (Elizabeth Nathania Wintanto) auto seeds Joe Biden and AFL2 dummy tasks', async () => {
  const userRepo = new InMemoryUserRepository();
  const todoRepo = new InMemoryTodoRepository();
  const authService = new AuthService(userRepo, todoRepo);

  const result = await authService.register({
    email: 'dosen@ciputra.ac.id',
    password: 'dosenpassword123',
    displayName: 'Elizabeth Nathania Wintanto'
  });

  assert.equal(result.user.role, 'dosen');
  assert.equal(result.user.displayName, 'Elizabeth Nathania Wintanto');

  // Verify Dosen DOES receive the 5 evaluation dummy tasks for Firebase Realtime Database
  const dosenTodos = await todoRepo.findAll(result.user.uid);
  assert.equal(dosenTodos.length, 5, 'Dosen account must be seeded with 5 evaluation dummy todos for Firebase Realtime Database!');
  assert.ok(dosenTodos.some((t) => t.title.includes('Firebase Realtime Database')));
  assert.ok(dosenTodos.some((t) => t.title.includes('Firebase Native')));

  // Test that Dosen can perform CRUD (e.g. create a 6th todo)
  await todoRepo.create(result.user.uid, {
    userId: result.user.uid,
    title: 'Catatan CRUD Baru Ditambahkan Oleh Dosen',
    description: 'Deskripsi pengujian CRUD oleh Dosen',
    completed: false,
    priority: 'low',
    category: 'academic',
    color: 'sky',
    dueDate: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const todosAfterAdd = await todoRepo.findAll(result.user.uid);
  assert.equal(todosAfterAdd.length, 6, 'Dosen can do CRUD and add new notes');

  // Test that logging in again RESETS the data back to initial 5 dummy tasks!
  await authService.login({
    email: 'dosen@ciputra.ac.id',
    password: 'dosenpassword123'
  });

  const todosAfterReLogin = await todoRepo.findAll(result.user.uid);
  assert.equal(todosAfterReLogin.length, 5, 'Every login must reset Dosen tasks back to fresh 5 initial tasks!');
});

test('3. AuthService - Rejects duplicate email registration with 400', async () => {
  const userRepo = new InMemoryUserRepository();
  const authService = new AuthService(userRepo);

  await authService.register({
    email: 'duplicate@test.com',
    password: 'password123',
    displayName: 'User One'
  });

  await assert.rejects(
    async () =>
      authService.register({
        email: 'duplicate@test.com',
        password: 'password456',
        displayName: 'User Two'
      }),
    (err: any) => err instanceof AppError && err.code === 'EMAIL_ALREADY_EXISTS'
  );
});

test('4. AuthService - Login flow with password verification', async () => {
  const userRepo = new InMemoryUserRepository();
  const authService = new AuthService(userRepo);

  await authService.register({
    email: 'login.test@example.com',
    password: 'correctpassword',
    displayName: 'Test User'
  });

  // Successful login
  const loginRes = await authService.login({
    email: 'login.test@example.com',
    password: 'correctpassword'
  });
  assert.equal(loginRes.user.email, 'login.test@example.com');
  assert.ok(loginRes.token);

  // Failed login with wrong password
  await assert.rejects(
    async () =>
      authService.login({
        email: 'login.test@example.com',
        password: 'wrongpassword'
      }),
    (err: any) => err instanceof AppError && err.code === 'INVALID_CREDENTIALS'
  );
});
