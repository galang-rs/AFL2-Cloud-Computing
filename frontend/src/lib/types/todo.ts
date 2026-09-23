export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type Category = 'academic' | 'work' | 'personal' | 'urgent' | 'general';

export type NoteColor = 'amber' | 'yellow' | 'emerald' | 'sky' | 'rose' | 'slate';

export interface TodoItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  category: Category;
  color: NoteColor;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TodoFilter = 'all' | 'active' | 'completed';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface CreateTodoDto {
  title: string;
  description?: string;
  completed?: boolean;
  priority?: Priority;
  category?: Category;
  color?: NoteColor;
  dueDate?: string | null;
}

export interface UpdateTodoDto {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: Priority;
  category?: Category;
  color?: NoteColor;
  dueDate?: string | null;
}

export interface QueryFilterParams {
  completed?: boolean | 'true' | 'false' | 'all';
  priority?: Priority;
  category?: Category;
  search?: string;
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuthState {
  currentUser: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  error: string | null;
}

export interface TodoStats {
  total: number;
  completed: number;
  active: number;
  highPriority: number;
}

export interface FeedbackMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}
