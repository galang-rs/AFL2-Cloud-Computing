import test from 'node:test';
import assert from 'node:assert/strict';
import { ITodo, TodoEntity } from '../models/todo.model';
import { ITodoRepository } from '../repositories/todo.repository.interface';
import { TodoService, AppError } from '../services/todo.service';
import { CreateTodoDTO } from '../schemas/todo.schema';

class InMemoryTodoRepository implements ITodoRepository {
  public store: Map<string, ITodo> = new Map();
  public shouldFailUpdate = false;
  public shouldFailDelete = false;

  async create(userId: string, todo: Omit<ITodo, 'id'>): Promise<ITodo> {
    const id = `todo-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const entity = new TodoEntity({ ...todo, id, userId });
    const json = entity.toJSON();
    this.store.set(id, json);
    return json;
  }

  async findAll(userId: string): Promise<ITodo[]> {
    return Array.from(this.store.values()).filter((t) => t.userId === userId);
  }

  async findById(userId: string, id: string): Promise<ITodo | null> {
    const item = this.store.get(id);
    if (!item) return null;
    return item;
  }

  async update(userId: string, id: string, data: Partial<ITodo>): Promise<ITodo | null> {
    if (this.shouldFailUpdate) return null;
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated: ITodo = {
      ...existing,
      ...data,
      updatedAt: Date.now()
    };
    this.store.set(id, updated);
    return updated;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    if (this.shouldFailDelete) return false;
    if (!this.store.has(id)) return false;
    return this.store.delete(id);
  }

  async deleteAll(userId: string): Promise<boolean> {
    for (const [id, t] of this.store.entries()) {
      if (t.userId === userId) {
        this.store.delete(id);
      }
    }
    return true;
  }

  clear(): void {
    this.store.clear();
    this.shouldFailUpdate = false;
    this.shouldFailDelete = false;
  }
}

test('1. TodoEntity - Data structure, defaults, and serialization', () => {
  const customTime = 1700000000000;
  const entity = new TodoEntity({
    id: 'entity-1',
    userId: 'user-abc',
    title: 'Grocery Run',
    description: 'Milk and bread',
    completed: true,
    priority: 'high',
    dueDate: '2025-11-20',
    createdAt: customTime,
    updatedAt: customTime
  });

  // Verify properties
  assert.equal(entity.id, 'entity-1');
  assert.equal(entity.userId, 'user-abc');
  assert.equal(entity.title, 'Grocery Run');
  assert.equal(entity.description, 'Milk and bread');
  assert.equal(entity.completed, true);
  assert.equal(entity.priority, 'high');
  assert.equal(entity.dueDate, '2025-11-20');
  assert.equal(entity.createdAt, customTime);
  assert.equal(entity.updatedAt, customTime);

  // toJSON serialization
  const json = entity.toJSON();
  assert.deepEqual(json, {
    id: 'entity-1',
    userId: 'user-abc',
    title: 'Grocery Run',
    description: 'Milk and bread',
    completed: true,
    priority: 'high',
    category: 'general',
    color: 'amber',
    dueDate: '2025-11-20',
    createdAt: customTime,
    updatedAt: customTime
  });

  // Default values when optional/nullable fields are empty
  const defaultEntity = new TodoEntity({
    id: 'entity-2',
    userId: 'user-xyz',
    title: 'Minimal',
    description: '',
    completed: false,
    priority: 'medium',
    dueDate: null,
    createdAt: 0,
    updatedAt: 0
  });
  assert.equal(defaultEntity.description, '');
  assert.equal(defaultEntity.dueDate, null);
  assert.equal(defaultEntity.completed, false);
  assert.equal(defaultEntity.priority, 'medium');
});

test('2. TodoService - Proper syntax and typing verification', async () => {
  const repo = new InMemoryTodoRepository();
  const service = new TodoService(repo);

  const dto: CreateTodoDTO = {
    title: 'Typing Test',
    description: 'Check return types',
    priority: 'low',
    completed: false
  };

  const created: ITodo = await service.createTodo('user-1', dto);
  assert.equal(typeof created.id, 'string');
  assert.equal(typeof created.userId, 'string');
  assert.equal(typeof created.title, 'string');
  assert.equal(typeof created.completed, 'boolean');
  assert.equal(typeof created.createdAt, 'number');
  assert.equal(typeof created.updatedAt, 'number');

  const todos: ITodo[] = await service.getTodos('user-1');
  assert(Array.isArray(todos));
});

test('3. TodoService - Error handling: not found, unauthorized, validation errors', async () => {
  const repo = new InMemoryTodoRepository();
  const service = new TodoService(repo);

  // 3.1 Empty or missing userId in createTodo
  await assert.rejects(
    async () => service.createTodo('', { title: 'Test' }),
    (err: any) => {
      assert(err instanceof AppError);
      assert.equal(err.statusCode, 401);
      assert.equal(err.code, 'UNAUTHORIZED');
      return true;
    }
  );

  // 3.2 Empty title in createTodo validation
  await assert.rejects(
    async () => service.createTodo('user-1', { title: '   ' }),
    (err: any) => {
      assert(err instanceof AppError);
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'VALIDATION_ERROR');
      return true;
    }
  );

  // 3.3 Missing userId in getTodos
  await assert.rejects(
    async () => service.getTodos(''),
    (err: any) => {
      assert(err instanceof AppError);
      assert.equal(err.statusCode, 401);
      return true;
    }
  );

  // 3.4 Missing or empty id in getTodoById
  await assert.rejects(
    async () => service.getTodoById('user-1', ''),
    (err: any) => {
      assert(err instanceof AppError);
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'INVALID_ID');
      return true;
    }
  );

  // 3.5 Todo not found in getTodoById
  await assert.rejects(
    async () => service.getTodoById('user-1', 'non-existent-id'),
    (err: any) => {
      assert(err instanceof AppError);
      assert.equal(err.statusCode, 404);
      assert.equal(err.code, 'NOT_FOUND');
      return true;
    }
  );

  // Create a todo owned by user-1
  const created = await service.createTodo('user-1', { title: 'Private Todo' });

  // 3.6 Unauthorized access (userId mismatch) - user-2 trying to access user-1's todo
  await assert.rejects(
    async () => service.getTodoById('user-2', created.id),
    (err: any) => {
      assert(err instanceof AppError);
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'FORBIDDEN');
      return true;
    }
  );

  // 3.7 Update todo validation error: empty title
  await assert.rejects(
    async () => service.updateTodo('user-1', created.id, { title: '   ' }),
    (err: any) => {
      assert(err instanceof AppError);
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'VALIDATION_ERROR');
      return true;
    }
  );

  // 3.8 Update failure in repository (simulated internal error)
  repo.shouldFailUpdate = true;
  await assert.rejects(
    async () => service.updateTodo('user-1', created.id, { title: 'New' }),
    (err: any) => {
      assert(err instanceof AppError);
      assert.equal(err.statusCode, 500);
      assert.equal(err.code, 'INTERNAL_SERVER_ERROR');
      return true;
    }
  );
  repo.shouldFailUpdate = false;

  // 3.9 Delete failure in repository (simulated internal error)
  repo.shouldFailDelete = true;
  await assert.rejects(
    async () => service.deleteTodo('user-1', created.id),
    (err: any) => {
      assert(err instanceof AppError);
      assert.equal(err.statusCode, 500);
      assert.equal(err.code, 'INTERNAL_SERVER_ERROR');
      return true;
    }
  );
  repo.shouldFailDelete = false;
});

test('4. TodoService - Success path: create, getById, getAll, update, delete', async () => {
  const repo = new InMemoryTodoRepository();
  const service = new TodoService(repo);

  // 4.1 Create
  const created = await service.createTodo('user-alice', {
    title: 'Write Tests',
    description: 'Implement comprehensive unit tests',
    priority: 'high',
    dueDate: '2025-10-01'
  });
  assert.equal(created.title, 'Write Tests');
  assert.equal(created.userId, 'user-alice');
  assert.equal(created.completed, false);
  assert.equal(created.priority, 'high');
  assert(created.createdAt > 0);

  // 4.2 Get by ID
  const fetched = await service.getTodoById('user-alice', created.id);
  assert.equal(fetched.id, created.id);
  assert.equal(fetched.title, 'Write Tests');

  // 4.3 Get All
  const allAlice = await service.getTodos('user-alice');
  assert.equal(allAlice.length, 1);
  assert.equal(allAlice[0].id, created.id);

  // User isolation: Bob has 0 todos
  const allBob = await service.getTodos('user-bob');
  assert.equal(allBob.length, 0);

  // 4.4 Update
  const updated = await service.updateTodo('user-alice', created.id, {
    title: 'Write Perfect Tests',
    completed: true,
    priority: 'low'
  });
  assert.equal(updated.title, 'Write Perfect Tests');
  assert.equal(updated.completed, true);
  assert.equal(updated.priority, 'low');
  assert(updated.updatedAt >= created.updatedAt);

  // 4.5 Delete
  await service.deleteTodo('user-alice', created.id);
  const remaining = await service.getTodos('user-alice');
  assert.equal(remaining.length, 0);

  // Confirm it's gone
  await assert.rejects(
    async () => service.getTodoById('user-alice', created.id),
    (err: any) => err instanceof AppError && err.statusCode === 404
  );
});

test('5. TodoService - Input & Return: filtering by status, priority, search, and sorting', async () => {
  const repo = new InMemoryTodoRepository();
  const service = new TodoService(repo);
  const uid = 'user-filter-test';

  // Seed data
  await service.createTodo(uid, {
    title: 'Buy apples',
    description: 'Fresh fruits from market',
    completed: false,
    priority: 'low',
    dueDate: '2025-05-10'
  });
  await service.createTodo(uid, {
    title: 'Fix bugs in backend',
    description: 'Ensure 100% tests pass',
    completed: false,
    priority: 'high',
    dueDate: '2025-05-01'
  });
  await service.createTodo(uid, {
    title: 'Submit report',
    description: 'Quarterly financial report',
    completed: true,
    priority: 'medium',
    dueDate: '2025-05-05'
  });
  await service.createTodo(uid, {
    title: 'Exercise in morning',
    description: 'Cardio and weights',
    completed: true,
    priority: 'high',
    dueDate: '2025-05-15'
  });

  // 5.1 Filter by status: completed = true
  const completedTodos = await service.getTodos(uid, { completed: true });
  assert.equal(completedTodos.length, 2);
  assert(completedTodos.every((t) => t.completed === true));

  // 5.2 Filter by status: completed = false
  const pendingTodos = await service.getTodos(uid, { completed: false });
  assert.equal(pendingTodos.length, 2);
  assert(pendingTodos.every((t) => t.completed === false));

  // 5.3 Filter by priority: 'high'
  const highPriority = await service.getTodos(uid, { priority: 'high' });
  assert.equal(highPriority.length, 2);
  assert(highPriority.every((t) => t.priority === 'high'));

  // 5.4 Search filter (in title or description)
  const fruitSearch = await service.getTodos(uid, { search: 'apples' });
  assert.equal(fruitSearch.length, 1);
  assert.equal(fruitSearch[0].title, 'Buy apples');

  const descSearch = await service.getTodos(uid, { search: 'financial' });
  assert.equal(descSearch.length, 1);
  assert.equal(descSearch[0].title, 'Submit report');

  // 5.5 Sorting: sortBy title asc
  const sortedByTitleAsc = await service.getTodos(uid, {
    sortBy: 'title',
    sortOrder: 'asc'
  });
  assert.equal(sortedByTitleAsc[0].title, 'Buy apples');
  assert.equal(sortedByTitleAsc[sortedByTitleAsc.length - 1].title, 'Submit report');

  // 5.6 Sorting: sortBy title desc
  const sortedByTitleDesc = await service.getTodos(uid, {
    sortBy: 'title',
    sortOrder: 'desc'
  });
  assert.equal(sortedByTitleDesc[0].title, 'Submit report');
  assert.equal(sortedByTitleDesc[sortedByTitleDesc.length - 1].title, 'Buy apples');

  // 5.7 Sorting: sortBy dueDate asc
  const sortedByDueAsc = await service.getTodos(uid, {
    sortBy: 'dueDate',
    sortOrder: 'asc'
  });
  assert.equal(sortedByDueAsc[0].dueDate, '2025-05-01');
  assert.equal(sortedByDueAsc[sortedByDueAsc.length - 1].dueDate, '2025-05-15');
});
