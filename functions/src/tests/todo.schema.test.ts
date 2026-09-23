import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ZodError } from 'zod';
import { CreateTodoSchema, UpdateTodoSchema, QueryFilterSchema } from '../schemas/todo.schema';

test('1. CreateTodoSchema - Valid inputs and default assignment', () => {
  // Minimal valid input
  const minimal = CreateTodoSchema.parse({
    title: 'Buy groceries'
  });
  assert.equal(minimal.title, 'Buy groceries');
  assert.equal(minimal.completed, false);
  assert.equal(minimal.priority, 'medium');
  assert.equal(minimal.description, '');
  assert.equal(minimal.dueDate, undefined);

  // Full valid input
  const full = CreateTodoSchema.parse({
    title: ' Complete Project ',
    description: 'Detailed instructions here',
    completed: true,
    priority: 'high',
    dueDate: '2025-12-31T23:59:59Z'
  });
  assert.equal(full.title, 'Complete Project', 'Title should be trimmed');
  assert.equal(full.description, 'Detailed instructions here');
  assert.equal(full.completed, true);
  assert.equal(full.priority, 'high');
  assert.equal(full.dueDate, '2025-12-31T23:59:59Z');

  // Nullable dueDate
  const withNullDueDate = CreateTodoSchema.parse({
    title: 'Task without due date',
    dueDate: null
  });
  assert.equal(withNullDueDate.dueDate, null);
});

test('2. CreateTodoSchema - Title validation failures (empty, whitespace, missing, too long)', () => {
  // Missing title
  assert.throws(
    () => CreateTodoSchema.parse({}),
    (err: any) => {
      assert(err instanceof ZodError);
      assert(err.errors.some((e: any) => e.path.includes('title')));
      return true;
    },
    'Should reject missing title'
  );

  // Empty string title
  assert.throws(
    () => CreateTodoSchema.parse({ title: '' }),
    (err: any) => {
      assert(err instanceof ZodError);
      assert.match(err.errors[0].message, /cannot be empty/i);
      return true;
    }
  );

  // Whitespace-only title (trimmed to empty)
  assert.throws(
    () => CreateTodoSchema.parse({ title: '     ' }),
    (err: any) => {
      assert(err instanceof ZodError);
      assert.match(err.errors[0].message, /cannot be empty/i);
      return true;
    }
  );

  // Title exceeding 200 characters
  const longTitle = 'a'.repeat(201);
  assert.throws(
    () => CreateTodoSchema.parse({ title: longTitle }),
    (err: any) => {
      assert(err instanceof ZodError);
      assert.match(err.errors[0].message, /cannot exceed 200 characters/i);
      return true;
    }
  );

  // Exact 200 characters title should succeed
  const maxTitle = 'b'.repeat(200);
  const validMax = CreateTodoSchema.parse({ title: maxTitle });
  assert.equal(validMax.title.length, 200);
});

test('3. CreateTodoSchema - Priority and completed validation', () => {
  // Valid priorities
  for (const prio of ['low', 'medium', 'high'] as const) {
    const res = CreateTodoSchema.parse({ title: 'Task', priority: prio });
    assert.equal(res.priority, prio);
  }

  // Invalid priority
  assert.throws(() => {
    CreateTodoSchema.parse({ title: 'Task', priority: 'urgent' as any });
  }, ZodError);

  assert.throws(() => {
    CreateTodoSchema.parse({ title: 'Task', priority: 123 as any });
  }, ZodError);

  // Invalid completed status type
  assert.throws(() => {
    CreateTodoSchema.parse({ title: 'Task', completed: 'yes' as any });
  }, ZodError);

  assert.throws(() => {
    CreateTodoSchema.parse({ title: 'Task', completed: 1 as any });
  }, ZodError);
});

test('4. CreateTodoSchema - Description length and edge cases', () => {
  // 2000 characters description should pass
  const desc2000 = 'x'.repeat(2000);
  const validDesc = CreateTodoSchema.parse({ title: 'Task', description: desc2000 });
  assert.equal(validDesc.description?.length, 2000);

  // 2001 characters description should fail
  const desc2001 = 'x'.repeat(2001);
  assert.throws(() => {
    CreateTodoSchema.parse({ title: 'Task', description: desc2001 });
  }, ZodError);
});

test('5. UpdateTodoSchema - Valid partial updates', () => {
  // Updating only title
  const u1 = UpdateTodoSchema.parse({ title: '  New Title  ' });
  assert.equal(u1.title, 'New Title');
  assert.equal(u1.completed, undefined);

  // Updating only completed
  const u2 = UpdateTodoSchema.parse({ completed: true });
  assert.equal(u2.completed, true);

  // Updating only priority
  const u3 = UpdateTodoSchema.parse({ priority: 'low' });
  assert.equal(u3.priority, 'low');

  // Updating multiple fields
  const u4 = UpdateTodoSchema.parse({
    description: 'Updated description',
    dueDate: null,
    completed: false
  });
  assert.equal(u4.description, 'Updated description');
  assert.equal(u4.dueDate, null);
  assert.equal(u4.completed, false);
});

test('6. UpdateTodoSchema - Validation errors and refinement', () => {
  // Empty object fails refinement: at least one field must be provided
  assert.throws(
    () => UpdateTodoSchema.parse({}),
    (err: any) => {
      assert(err instanceof ZodError);
      assert.match(err.errors[0].message, /at least one field/i);
      return true;
    }
  );

  // Empty string title in update
  assert.throws(() => {
    UpdateTodoSchema.parse({ title: '' });
  }, ZodError);

  // Whitespace-only title in update
  assert.throws(() => {
    UpdateTodoSchema.parse({ title: '   ' });
  }, ZodError);

  // Title too long in update
  assert.throws(() => {
    UpdateTodoSchema.parse({ title: 'z'.repeat(201) });
  }, ZodError);

  // Invalid priority in update
  assert.throws(() => {
    UpdateTodoSchema.parse({ priority: 'super-high' as any });
  }, ZodError);

  // Description too long in update
  assert.throws(() => {
    UpdateTodoSchema.parse({ description: 'y'.repeat(2001) });
  }, ZodError);
});

test('7. QueryFilterSchema - Query parameter parsing and transforms', () => {
  // Default values
  const defaultQuery = QueryFilterSchema.parse({});
  assert.equal(defaultQuery.completed, undefined);
  assert.equal(defaultQuery.priority, undefined);
  assert.equal(defaultQuery.search, undefined);
  assert.equal(defaultQuery.sortBy, 'createdAt');
  assert.equal(defaultQuery.sortOrder, 'desc');

  // Completed transform string 'true' -> boolean true
  const trueQuery = QueryFilterSchema.parse({ completed: 'true' });
  assert.equal(trueQuery.completed, true);

  // Completed transform string 'false' -> boolean false
  const falseQuery = QueryFilterSchema.parse({ completed: 'false' });
  assert.equal(falseQuery.completed, false);

  // Completed transform string 'all' -> undefined
  const allQuery = QueryFilterSchema.parse({ completed: 'all' });
  assert.equal(allQuery.completed, undefined);

  // Search string trimming
  const searchQuery = QueryFilterSchema.parse({ search: '  keyword  ' });
  assert.equal(searchQuery.search, 'keyword');

  // Sorting overrides
  const sortQuery = QueryFilterSchema.parse({
    sortBy: 'title',
    sortOrder: 'asc'
  });
  assert.equal(sortQuery.sortBy, 'title');
  assert.equal(sortQuery.sortOrder, 'asc');

  // Invalid sortBy should fail
  assert.throws(() => {
    QueryFilterSchema.parse({ sortBy: 'unknownColumn' as any });
  }, ZodError);

  // Invalid sortOrder should fail
  assert.throws(() => {
    QueryFilterSchema.parse({ sortOrder: 'sideways' as any });
  }, ZodError);
});
