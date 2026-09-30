import { authService } from './auth.service';
import type {
  TodoItem,
  CreateTodoDto,
  UpdateTodoDto,
  QueryFilterParams,
  ApiResponse
} from '../types/todo';

export const API_BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' ? process.env?.VITE_API_BASE_URL : undefined) ||
  ''
).replace(/\/$/, '');

export class ApiService {
  private getHeaders(): Record<string, string> {
    let token = authService.getToken();
    if (!token && typeof process !== 'undefined') {
      token = 'mock:test-user-123:test@ciputra.ac.id:Test Student';
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * GET /api/todos - Retrieve todos via Cloudflare Worker REST API
   */
  public async getTodos(params?: QueryFilterParams): Promise<ApiResponse<TodoItem[]>> {
    try {
      const url = new URL(`${API_BASE_URL}/api/todos`);

      if (params) {
        if (params.completed !== undefined) {
          url.searchParams.set('completed', String(params.completed));
        }
        if (params.priority && (params.priority as string) !== 'all') {
          url.searchParams.set('priority', params.priority);
        }
        if (params.search && params.search.trim()) {
          url.searchParams.set('search', params.search.trim());
        }
        if (params.sortBy) {
          url.searchParams.set('sortBy', params.sortBy);
        }
        if (params.sortOrder) {
          url.searchParams.set('sortOrder', params.sortOrder);
        }
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json.error?.message || json.message || 'Gagal memuat catatan dari backend',
          data: [],
        };
      }

      return {
        success: true,
        data: json.data || [],
        count: json.count ?? json.data?.length ?? 0,
      };
    } catch (err: any) {
      console.error('[ApiService] getTodos error:', err);
      return {
        success: false,
        message: err.message || 'Gagal terhubung ke backend Cloudflare Worker',
        data: [],
      };
    }
  }

  /**
   * GET /api/todos/:id - Retrieve a single todo by ID via Cloudflare Worker REST API
   */
  public async getTodoById(id: string): Promise<ApiResponse<TodoItem>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/todos/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json.error?.message || json.message || 'Catatan tidak ditemukan',
        };
      }

      return {
        success: true,
        data: json.data,
      };
    } catch (err: any) {
      console.error('[ApiService] getTodoById error:', err);
      return {
        success: false,
        message: err.message || 'Gagal terhubung ke backend Cloudflare Worker',
      };
    }
  }

  /**
   * POST /api/todos - Create a new todo via Cloudflare Worker REST API
   */
  public async createTodo(dto: CreateTodoDto): Promise<ApiResponse<TodoItem>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/todos`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          title: dto.title.trim(),
          description: dto.description || '',
          completed: Boolean(dto.completed),
          priority: dto.priority || 'medium',
          category: dto.category || 'general',
          color: dto.color || 'amber',
          dueDate: dto.dueDate || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json.error?.message || json.message || 'Gagal menyimpan catatan di backend',
        };
      }

      return {
        success: true,
        data: json.data,
        message: json.message || 'Catatan berhasil disimpan ke backend',
      };
    } catch (err: any) {
      console.error('[ApiService] createTodo error:', err);
      return {
        success: false,
        message: err.message || 'Gagal terhubung ke backend Cloudflare Worker',
      };
    }
  }

  /**
   * PATCH /api/todos/:id - Update an existing todo via Cloudflare Worker REST API
   */
  public async updateTodo(id: string, dto: UpdateTodoDto): Promise<ApiResponse<TodoItem>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/todos/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(dto),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json.error?.message || json.message || 'Gagal memperbarui catatan di backend',
        };
      }

      return {
        success: true,
        data: json.data,
        message: json.message || 'Catatan berhasil diperbarui di backend',
      };
    } catch (err: any) {
      console.error('[ApiService] updateTodo error:', err);
      return {
        success: false,
        message: err.message || 'Gagal terhubung ke backend Cloudflare Worker',
      };
    }
  }

  /**
   * DELETE /api/todos/:id - Delete a todo via Cloudflare Worker REST API
   */
  public async deleteTodo(id: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/todos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          message: json.error?.message || json.message || 'Gagal menghapus catatan di backend',
        };
      }

      return {
        success: true,
        data: { message: json.message || 'Catatan berhasil dihapus dari backend' },
      };
    } catch (err: any) {
      console.error('[ApiService] deleteTodo error:', err);
      return {
        success: false,
        message: err.message || 'Gagal terhubung ke backend Cloudflare Worker',
      };
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
