process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { TodoController } from '../controllers/todo.controller';
import { ITodoService } from '../services/todo.service.interface';
import { ITodo } from '../models/todo.model';
import { CreateTodoDTO, UpdateTodoDTO, QueryFilterDTO } from '../schemas/todo.schema';
import { AppError } from '../services/todo.service';
import { ErrorMiddleware } from '../middlewares/error.middleware';
import { HonoEnv } from '../types/env';

class MockTodoService implements ITodoService {
  public todos: ITodo[] = [];
  public lastFilterReceived?: QueryFilterDTO;
  public forceError: any = null;

  async createTodo(userId: string, dto: CreateTodoDTO): Promise<ITodo> {
    if (this.forceError) throw this.forceError;
    const todo: ITodo = {
      id: `mock-id-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      title: dto.title,
      description: dto.description || '',
      completed: dto.completed ?? false,
      priority: dto.priority ?? 'medium',
      category: dto.category || 'general',
      color: dto.color || 'amber',
      dueDate: dto.dueDate || null,
      createdAt: 1000,
      updatedAt: 1000
    };
    this.todos.push(todo);
    return todo;
  }

  async getTodos(userId: string, filter?: QueryFilterDTO): Promise<ITodo[]> {
    if (this.forceError) throw this.forceError;
    this.lastFilterReceived = filter;
    let list = this.todos.filter((t) => t.userId === userId);
    if (filter?.completed !== undefined) {
      list = list.filter((t) => t.completed === filter.completed);
    }
    if (filter?.priority) {
      list = list.filter((t) => t.priority === filter.priority);
    }
    return list;
  }

  async getTodoById(userId: string, id: string): Promise<ITodo> {
    if (this.forceError) throw this.forceError;
    const found = this.todos.find((t) => t.id === id);
    if (!found) {
      throw new AppError(`Todo with ID '${id}' not found`, 404, 'NOT_FOUND');
    }
    if (found.userId !== userId) {
      throw new AppError('Forbidden: Access denied to this resource', 403, 'FORBIDDEN');
    }
    return found;
  }

  async updateTodo(userId: string, id: string, dto: UpdateTodoDTO): Promise<ITodo> {
    if (this.forceError) throw this.forceError;
    const todo = await this.getTodoById(userId, id);
    if (dto.title !== undefined) todo.title = dto.title;
    if (dto.description !== undefined) todo.description = dto.description;
    if (dto.completed !== undefined) todo.completed = dto.completed;
    if (dto.priority !== undefined) todo.priority = dto.priority;
    if (dto.dueDate !== undefined) todo.dueDate = dto.dueDate;
    todo.updatedAt = 2000;
    return todo;
  }

  async deleteTodo(userId: string, id: string): Promise<void> {
    if (this.forceError) throw this.forceError;
    await this.getTodoById(userId, id);
    this.todos = this.todos.filter((t) => t.id !== id);
  }
}

function createTestApp(service: ITodoService, user?: { uid: string }) {
  const app = new Hono<HonoEnv>();
  const controller = new TodoController(service);

  app.use('*', async (c, next) => {
    if (user) {
      c.set('user', user);
    }
    await next();
  });

  app.post('/todos', (c) => controller.create(c));
  app.get('/todos', (c) => controller.getAll(c));
  app.get('/todos/:id', (c) => controller.getById(c));
  app.put('/todos/:id', (c) => controller.update(c));
  app.delete('/todos/:id', (c) => controller.delete(c));

  app.onError((err, c) => ErrorMiddleware.handle(err, c));
  return app;
}

test('1. TodoController - createTodo: success and 400 validation error', async () => {
  const service = new MockTodoService();

  // 1.1 Success path
  const app1 = createTestApp(service, { uid: 'user-controller-1' });
  const res1 = await app1.request('/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'New Todo via Controller',
      description: 'Controller integration test',
      priority: 'high'
    })
  });

  assert.equal(res1.status, 201);
  const json1: any = await res1.json();
  assert.equal(json1.success, true);
  assert.equal(json1.data.title, 'New Todo via Controller');
  assert.equal(json1.data.userId, 'user-controller-1');
  assert.equal(json1.message, 'Todo created successfully');

  // 1.2 400 Validation error: missing title
  const res2 = await app1.request('/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'Missing title' })
  });

  assert.equal(res2.status, 400);
  const json2: any = await res2.json();
  assert.equal(json2.success, false);
  assert.equal(json2.error.code, 'VALIDATION_ERROR');

  // 1.3 400 Validation error: empty string title
  const res3 = await app1.request('/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '' })
  });
  assert.equal(res3.status, 400);

  // 1.4 Unauthenticated (401)
  const unauthApp = createTestApp(service, undefined);
  const res4 = await unauthApp.request('/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'No User' })
  });
  assert.equal(res4.status, 401);
});

test('2. TodoController - getTodos with query filters', async () => {
  const service = new MockTodoService();
  const app = createTestApp(service, { uid: 'user-getter' });

  // Seed sample todos
  await service.createTodo('user-getter', {
    title: 'Completed Item',
    completed: true,
    priority: 'low'
  });
  await service.createTodo('user-getter', {
    title: 'Pending High Item',
    completed: false,
    priority: 'high'
  });

  // 2.1 Get all without filters
  const res1 = await app.request('/todos');
  assert.equal(res1.status, 200);
  const json1: any = await res1.json();
  assert.equal(json1.success, true);
  assert.equal(json1.count, 2);
  assert.equal(json1.data.length, 2);

  // 2.2 Get with completed=true filter
  const res2 = await app.request('/todos?completed=true');
  assert.equal(res2.status, 200);
  const json2: any = await res2.json();
  assert.equal(json2.count, 1);
  assert.equal(json2.data[0].completed, true);

  // 2.3 Unauthenticated (401)
  const unauthApp = createTestApp(service, undefined);
  const res3 = await unauthApp.request('/todos');
  assert.equal(res3.status, 401);
});

test('3. TodoController - getTodoById: success and 404', async () => {
  const service = new MockTodoService();
  const app = createTestApp(service, { uid: 'user-by-id' });

  const created = await service.createTodo('user-by-id', {
    title: 'Target Todo',
    priority: 'medium'
  });

  // 3.1 Success path
  const res1 = await app.request(`/todos/${created.id}`);
  assert.equal(res1.status, 200);
  const json1: any = await res1.json();
  assert.equal(json1.success, true);
  assert.equal(json1.data.id, created.id);
  assert.equal(json1.data.title, 'Target Todo');

  // 3.2 404 Not Found
  const res2 = await app.request('/todos/unknown-id-999');
  assert.equal(res2.status, 404);
  const json2: any = await res2.json();
  assert.equal(json2.success, false);
  assert.equal(json2.error.code, 'NOT_FOUND');

  // 3.3 Unauthenticated (401)
  const unauthApp = createTestApp(service, undefined);
  const res3 = await unauthApp.request(`/todos/${created.id}`);
  assert.equal(res3.status, 401);
});

test('4. TodoController - updateTodo: success, 400, and 403 forbidden', async () => {
  const service = new MockTodoService();
  const app = createTestApp(service, { uid: 'user-updater' });

  const created = await service.createTodo('user-updater', {
    title: 'Original Title',
    priority: 'low'
  });

  // 4.1 Success path
  const res1 = await app.request(`/todos/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Updated Title via Controller',
      completed: true,
      priority: 'high'
    })
  });

  assert.equal(res1.status, 200);
  const json1: any = await res1.json();
  assert.equal(json1.success, true);
  assert.equal(json1.data.title, 'Updated Title via Controller');
  assert.equal(json1.data.completed, true);
  assert.equal(json1.data.priority, 'high');

  // 4.2 400 Validation error: empty body
  const res2 = await app.request(`/todos/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(res2.status, 400);

  // 4.3 403 Forbidden: other user attempts update
  const intruderApp = createTestApp(service, { uid: 'intruder-user' });
  const res3 = await intruderApp.request(`/todos/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Hacked Title' })
  });

  assert.equal(res3.status, 403);
  const json3: any = await res3.json();
  assert.equal(json3.success, false);
  assert.equal(json3.error.code, 'FORBIDDEN');
});

test('5. TodoController - deleteTodo: success and 404', async () => {
  const service = new MockTodoService();
  const app = createTestApp(service, { uid: 'user-deleter' });

  const created = await service.createTodo('user-deleter', {
    title: 'To Be Deleted'
  });

  // 5.1 Success path
  const res1 = await app.request(`/todos/${created.id}`, { method: 'DELETE' });
  assert.equal(res1.status, 200);
  const json1: any = await res1.json();
  assert.equal(json1.success, true);
  assert.equal(json1.message, 'Todo deleted successfully');

  // 5.2 404 Not Found (already deleted)
  const res2 = await app.request(`/todos/${created.id}`, { method: 'DELETE' });
  assert.equal(res2.status, 404);
});
