import { Context } from 'hono';
import { HonoEnv } from '../types/env';
import { TodoFirebaseRepository } from '../repositories/todo.firebase.repository';
import { TodoService } from '../services/todo.service';
import { ITodoService } from '../services/todo.service.interface';
import { CreateTodoSchema, UpdateTodoSchema, QueryFilterSchema } from '../schemas/todo.schema';

export class TodoController {
  private customTodoService?: ITodoService;

  constructor(todoService?: ITodoService) {
    this.customTodoService = todoService;
  }

  private getService(c: Context<HonoEnv>): ITodoService {
    if (this.customTodoService) {
      return this.customTodoService;
    }
    const repository = new TodoFirebaseRepository(c.env?.FIREBASE_DATABASE_URL);
    return new TodoService(repository);
  }

  public create = async (c: Context<HonoEnv>): Promise<Response> => {
    const user = c.get('user');
    if (!user || !user.uid) {
      return c.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        401
      );
    }

    const body = await c.req.json().catch(() => ({}));
    const validatedBody = CreateTodoSchema.parse(body);

    const todoService = this.getService(c);
    const newTodo = await todoService.createTodo(user.uid, validatedBody);

    return c.json(
      {
        success: true,
        data: newTodo,
        message: 'Todo created successfully'
      },
      201
    );
  };

  public getAll = async (c: Context<HonoEnv>): Promise<Response> => {
    const user = c.get('user');
    if (!user || !user.uid) {
      return c.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        401
      );
    }

    const queryParams = c.req.query();
    const validatedFilter = QueryFilterSchema.parse(queryParams);

    const todoService = this.getService(c);
    const todos = await todoService.getTodos(user.uid, validatedFilter);

    return c.json(
      {
        success: true,
        data: todos,
        count: todos.length
      },
      200
    );
  };

  public getById = async (c: Context<HonoEnv>): Promise<Response> => {
    const user = c.get('user');
    if (!user || !user.uid) {
      return c.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        401
      );
    }

    const id = c.req.param('id') || '';
    const todoService = this.getService(c);
    const todo = await todoService.getTodoById(user.uid, id);

    return c.json(
      {
        success: true,
        data: todo
      },
      200
    );
  };

  public update = async (c: Context<HonoEnv>): Promise<Response> => {
    const user = c.get('user');
    if (!user || !user.uid) {
      return c.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        401
      );
    }

    const id = c.req.param('id') || '';
    const body = await c.req.json().catch(() => ({}));
    const validatedBody = UpdateTodoSchema.parse(body);

    const todoService = this.getService(c);
    const updatedTodo = await todoService.updateTodo(user.uid, id, validatedBody);

    return c.json(
      {
        success: true,
        data: updatedTodo,
        message: 'Todo updated successfully'
      },
      200
    );
  };

  public delete = async (c: Context<HonoEnv>): Promise<Response> => {
    const user = c.get('user');
    if (!user || !user.uid) {
      return c.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        401
      );
    }

    const id = c.req.param('id') || '';
    const todoService = this.getService(c);
    await todoService.deleteTodo(user.uid, id);

    return c.json(
      {
        success: true,
        message: 'Todo deleted successfully'
      },
      200
    );
  };
}
