import { ITodo } from '../models/todo.model';
import { CreateTodoDTO, UpdateTodoDTO, QueryFilterDTO } from '../schemas/todo.schema';
import { ITodoRepository } from '../repositories/todo.repository.interface';
import { ITodoService } from './todo.service.interface';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST', details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class TodoService implements ITodoService {
  private repository: ITodoRepository;

  constructor(repository: ITodoRepository) {
    this.repository = repository;
  }

  public async createTodo(userId: string, dto: CreateTodoDTO): Promise<ITodo> {
    if (!userId || !userId.trim()) {
      throw new AppError('User ID is required', 401, 'UNAUTHORIZED');
    }

    if (!dto || !dto.title || !dto.title.trim()) {
      throw new AppError('Title is required and cannot be empty', 400, 'VALIDATION_ERROR');
    }

    const now = Date.now();
    const todoData: Omit<ITodo, 'id'> = {
      userId,
      title: dto.title.trim(),
      description: dto.description ? dto.description.trim() : '',
      completed: dto.completed ?? false,
      priority: dto.priority ?? 'medium',
      category: dto.category ?? 'general',
      color: dto.color ?? 'amber',
      dueDate: dto.dueDate || null,
      createdAt: now,
      updatedAt: now
    };

    return await this.repository.create(userId, todoData);
  }

  public async getTodos(userId: string, filter?: QueryFilterDTO): Promise<ITodo[]> {
    if (!userId || !userId.trim()) {
      throw new AppError('User ID is required', 401, 'UNAUTHORIZED');
    }

    let todos = await this.repository.findAll(userId);

    if (filter) {
      if (filter.completed !== undefined) {
        todos = todos.filter((t) => t.completed === filter.completed);
      }

      if (filter.priority) {
        todos = todos.filter((t) => t.priority === filter.priority);
      }

      if (filter.search && filter.search.trim()) {
        const query = filter.search.toLowerCase().trim();
        todos = todos.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            (t.description && t.description.toLowerCase().includes(query))
        );
      }

      const sortBy = filter.sortBy || 'createdAt';
      const sortOrder = filter.sortOrder || 'desc';

      todos.sort((a, b) => {
        let fieldA: any = a[sortBy as keyof ITodo];
        let fieldB: any = b[sortBy as keyof ITodo];

        if (sortBy === 'dueDate') {
          fieldA = fieldA ? new Date(fieldA).getTime() : 0;
          fieldB = fieldB ? new Date(fieldB).getTime() : 0;
        }

        if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
        if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return todos;
  }

  public async getTodoById(userId: string, id: string): Promise<ITodo> {
    if (!userId || !userId.trim()) {
      throw new AppError('User ID is required', 401, 'UNAUTHORIZED');
    }

    if (!id || !id.trim()) {
      throw new AppError('Todo ID is required', 400, 'INVALID_ID');
    }

    const todo = await this.repository.findById(userId, id);
    if (!todo) {
      throw new AppError(`Todo with ID '${id}' not found`, 404, 'NOT_FOUND');
    }

    if (todo.userId !== userId) {
      throw new AppError('Forbidden: Access denied to this resource', 403, 'FORBIDDEN');
    }

    return todo;
  }

  public async updateTodo(userId: string, id: string, dto: UpdateTodoDTO): Promise<ITodo> {
    await this.getTodoById(userId, id);

    if (dto.title !== undefined && (!dto.title || !dto.title.trim())) {
      throw new AppError('Title cannot be empty', 400, 'VALIDATION_ERROR');
    }

    const updateData: Partial<ITodo> = {};
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.description !== undefined) updateData.description = dto.description.trim();
    if (dto.completed !== undefined) updateData.completed = dto.completed;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate;

    const updated = await this.repository.update(userId, id, updateData);
    if (!updated) {
      throw new AppError(`Failed to update Todo with ID '${id}'`, 500, 'INTERNAL_SERVER_ERROR');
    }

    return updated;
  }

  public async deleteTodo(userId: string, id: string): Promise<void> {
    await this.getTodoById(userId, id);

    const success = await this.repository.delete(userId, id);
    if (!success) {
      throw new AppError(`Failed to delete Todo with ID '${id}'`, 500, 'INTERNAL_SERVER_ERROR');
    }
  }
}
