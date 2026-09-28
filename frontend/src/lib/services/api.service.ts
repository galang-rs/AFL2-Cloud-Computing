import { authService } from './auth.service';
import {
  getTodosFromRtdb,
  createTodoInRtdb,
  updateTodoInRtdb,
  deleteTodoInRtdb
} from '../firebase/client';
import type {
  TodoItem,
  CreateTodoDto,
  UpdateTodoDto,
  QueryFilterParams,
  ApiResponse
} from '../types/todo';

export class ApiService {
  /**
   * GET /api/todos - Retrieve list of todos directly from Firebase Realtime Database.
   * If empty, returns empty array (kosongan) without forcing dummy data.
   */
  public async getTodos(params?: QueryFilterParams): Promise<ApiResponse<TodoItem[]>> {
    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.uid || 'default-user';

    try {
      let todos = await getTodosFromRtdb(userId);

      // Apply client-side filters if requested
      if (params) {
        if (params.completed !== undefined) {
          todos = todos.filter((t) => t.completed === params.completed);
        }
        if (params.priority && (params.priority as string) !== 'all') {
          todos = todos.filter((t) => t.priority === params.priority);
        }
        if (params.search) {
          const q = params.search.toLowerCase();
          todos = todos.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              (t.description || '').toLowerCase().includes(q)
          );
        }
        if (params.sortBy) {
          todos.sort((a, b) => {
            if (params.sortBy === 'title') {
              return a.title.localeCompare(b.title);
            }
            if (params.sortBy === 'priority') {
              const priorityWeights = { urgent: 4, high: 3, medium: 2, low: 1 };
              return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          if (params.sortOrder === 'asc') {
            todos.reverse();
          }
        }
      }

      return {
        success: true,
        data: todos,
        count: todos.length,
      };
    } catch (err: any) {
      console.error('[ApiService] getTodos error:', err);
      return {
        success: false,
        message: err.message || 'Gagal memuat data dari Firebase Realtime Database',
      };
    }
  }

  /**
   * GET /api/todos/:id - Retrieve a single todo by ID
   */
  public async getTodoById(id: string): Promise<ApiResponse<TodoItem>> {
    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.uid || 'default-user';

    const todos = await getTodosFromRtdb(userId);
    const found = todos.find((t) => t.id === id);

    if (found) {
      return { success: true, data: found };
    }
    return { success: false, message: 'Catatan tidak ditemukan di database' };
  }

  /**
   * POST /api/todos - Create a new todo directly in Firebase Realtime Database
   */
  public async createTodo(dto: CreateTodoDto): Promise<ApiResponse<TodoItem>> {
    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.uid || 'default-user';

    try {
      const createdItem = await createTodoInRtdb(userId, dto);
      return {
        success: true,
        data: createdItem,
        message: 'Catatan berhasil disimpan ke Firebase Realtime Database',
      };
    } catch (err: any) {
      console.error('[ApiService] createTodo error:', err);
      return {
        success: false,
        message: err.message || 'Gagal menyimpan catatan ke Firebase Realtime Database',
      };
    }
  }

  /**
   * PUT / PATCH /api/todos/:id - Update an existing todo directly in Firebase Realtime Database
   */
  public async updateTodo(id: string, dto: UpdateTodoDto): Promise<ApiResponse<TodoItem>> {
    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.uid || 'default-user';

    try {
      await updateTodoInRtdb(userId, id, dto);

      const todos = await getTodosFromRtdb(userId);
      const updated = todos.find((t) => t.id === id);

      return {
        success: true,
        data: updated || ({ id, ...dto } as any),
        message: 'Catatan berhasil diperbarui di Firebase Realtime Database',
      };
    } catch (err: any) {
      console.error('[ApiService] updateTodo error:', err);
      return {
        success: false,
        message: err.message || 'Gagal memperbarui catatan di database',
      };
    }
  }

  /**
   * DELETE /api/todos/:id - Delete a todo directly from Firebase Realtime Database
   */
  public async deleteTodo(id: string): Promise<ApiResponse<{ message: string }>> {
    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.uid || 'default-user';

    try {
      await deleteTodoInRtdb(userId, id);
      return {
        success: true,
        data: { message: 'Catatan berhasil dihapus dari Firebase Realtime Database' },
      };
    } catch (err: any) {
      console.error('[ApiService] deleteTodo error:', err);
      return {
        success: false,
        message: err.message || 'Gagal menghapus catatan dari database',
      };
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
