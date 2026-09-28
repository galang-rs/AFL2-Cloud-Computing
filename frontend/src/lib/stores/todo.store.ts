import { writable, derived } from 'svelte/store';
import { apiService } from '../services/api.service';
import {
  listenToUserTodos,
  stopListeningToUserTodos
} from '../firebase/client';
import type {
  TodoItem,
  TodoFilter,
  Priority,
  Category,
  CreateTodoDto,
  UpdateTodoDto,
  QueryFilterParams,
  FeedbackMessage,
  TodoStats
} from '../types/todo';

export interface TodoStoreState {
  todos: TodoItem[];
  activeFilter: TodoFilter;
  selectedPriority: Priority | 'all';
  selectedCategory: Category | 'all';
  searchQuery: string;
  selectedTodo: TodoItem | null;
  isLoading: boolean;
  isSubmitting: boolean;
  feedbackMessage: FeedbackMessage | null;
  isRealtimeActive: boolean;
}

const initialState: TodoStoreState = {
  todos: [],
  activeFilter: 'all',
  selectedPriority: 'all',
  selectedCategory: 'all',
  searchQuery: '',
  selectedTodo: null,
  isLoading: false,
  isSubmitting: false,
  feedbackMessage: null,
  isRealtimeActive: false,
};

function createTodoStore() {
  const { subscribe, set, update } = writable<TodoStoreState>(initialState);
  let syncTimer: any = null;
  let activeSyncUserId: string | null = null;
  let unsubscribeRtdb: (() => void) | null = null;

  return {
    subscribe,

    /**
     * Fetch all todos from Cloud Functions backend.
     */
    fetchTodos: async (params?: QueryFilterParams): Promise<void> => {
      update((s) => ({ ...s, isLoading: true, feedbackMessage: null }));
      try {
        const response = await apiService.getTodos(params);
        if (response.success && response.data) {
          update((s) => ({
            ...s,
            todos: response.data || [],
            isLoading: false,
          }));
        } else {
          update((s) => ({
            ...s,
            isLoading: false,
            feedbackMessage: {
              type: 'error',
              text: response.message || 'Failed to fetch tasks',
            },
          }));
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error fetching tasks';
        update((s) => ({
          ...s,
          isLoading: false,
          feedbackMessage: { type: 'error', text: errorMsg },
        }));
      }
    },

    /**
     * Create a new task through Cloud Functions and synchronize state.
     */
    createTodo: async (dto: CreateTodoDto): Promise<TodoItem | null> => {
      update((s) => ({ ...s, isSubmitting: true, feedbackMessage: null }));
      try {
        const response = await apiService.createTodo(dto);
        if (response.success && response.data) {
          const created = response.data;
          update((s) => ({
            ...s,
            todos: [created, ...s.todos.filter((t) => t.id !== created.id)],
            isSubmitting: false,
            feedbackMessage: { type: 'success', text: 'Task created successfully' },
          }));
          return created;
        } else {
          update((s) => ({
            ...s,
            isSubmitting: false,
            feedbackMessage: {
              type: 'error',
              text: response.message || 'Failed to create task',
            },
          }));
          return null;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error creating task';
        update((s) => ({
          ...s,
          isSubmitting: false,
          feedbackMessage: { type: 'error', text: errorMsg },
        }));
        return null;
      }
    },

    /**
     * Update an existing task.
     */
    updateTodo: async (id: string, dto: UpdateTodoDto): Promise<TodoItem | null> => {
      update((s) => ({ ...s, isSubmitting: true, feedbackMessage: null }));
      try {
        const response = await apiService.updateTodo(id, dto);
        if (response.success && response.data) {
          const updated = response.data;
          update((s) => ({
            ...s,
            todos: s.todos.map((t) => (t.id === id ? updated : t)),
            selectedTodo: s.selectedTodo?.id === id ? updated : s.selectedTodo,
            isSubmitting: false,
            feedbackMessage: { type: 'success', text: 'Task updated successfully' },
          }));
          return updated;
        } else {
          update((s) => ({
            ...s,
            isSubmitting: false,
            feedbackMessage: {
              type: 'error',
              text: response.message || 'Failed to update task',
            },
          }));
          return null;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error updating task';
        update((s) => ({
          ...s,
          isSubmitting: false,
          feedbackMessage: { type: 'error', text: errorMsg },
        }));
        return null;
      }
    },

    /**
     * Instant optimistic toggle for task completion.
     */
    toggleComplete: async (id: string): Promise<boolean> => {
      let previousState: boolean | undefined;
      let targetTodo: TodoItem | undefined;

      // Optimistic update
      update((s) => {
        const found = s.todos.find((t) => t.id === id);
        if (!found) return s;
        previousState = found.completed;
        targetTodo = { ...found, completed: !found.completed };

        return {
          ...s,
          todos: s.todos.map((t) => (t.id === id ? targetTodo! : t)),
          selectedTodo: s.selectedTodo?.id === id ? targetTodo! : s.selectedTodo,
        };
      });

      if (previousState === undefined) return false;

      try {
        const response = await apiService.updateTodo(id, { completed: !previousState });
        if (!response.success) {
          // Revert optimistic update
          update((s) => ({
            ...s,
            todos: s.todos.map((t) => (t.id === id ? { ...t, completed: previousState! } : t)),
            feedbackMessage: { type: 'error', text: response.message || 'Failed to toggle task' },
          }));
          return false;
        }
        return true;
      } catch (err) {
        // Revert optimistic update on exception
        update((s) => ({
          ...s,
          todos: s.todos.map((t) => (t.id === id ? { ...t, completed: previousState! } : t)),
          feedbackMessage: {
            type: 'error',
            text: err instanceof Error ? err.message : 'Failed to update task status',
          },
        }));
        return false;
      }
    },

    /**
     * Delete a task.
     */
    deleteTodo: async (id: string): Promise<boolean> => {
      let backupItem: TodoItem | undefined;

      // Optimistic deletion
      update((s) => {
        backupItem = s.todos.find((t) => t.id === id);
        return {
          ...s,
          todos: s.todos.filter((t) => t.id !== id),
          selectedTodo: s.selectedTodo?.id === id ? null : s.selectedTodo,
          feedbackMessage: null,
        };
      });

      try {
        const response = await apiService.deleteTodo(id);
        if (response.success) {
          update((s) => ({
            ...s,
            feedbackMessage: { type: 'info', text: 'Task deleted' },
          }));
          return true;
        } else {
          // Restore item on failure
          if (backupItem) {
            update((s) => ({
              ...s,
              todos: [backupItem!, ...s.todos],
              feedbackMessage: {
                type: 'error',
                text: response.message || 'Failed to delete task',
              },
            }));
          }
          return false;
        }
      } catch (err) {
        if (backupItem) {
          update((s) => ({
            ...s,
            todos: [backupItem!, ...s.todos],
            feedbackMessage: {
              type: 'error',
              text: err instanceof Error ? err.message : 'Error deleting task',
            },
          }));
        }
        return false;
      }
    },

    /**
     * Select a task for modal editing or details inspection.
     */
    selectTodo: (todo: TodoItem | null): void => {
      update((s) => ({ ...s, selectedTodo: todo }));
    },

    /**
     * Filter criteria setters
     */
    setFilter: (filter: TodoFilter): void => {
      update((s) => ({ ...s, activeFilter: filter }));
    },

    setPriority: (priority: Priority | 'all'): void => {
      update((s) => ({ ...s, selectedPriority: priority }));
    },

    setCategory: (category: Category | 'all'): void => {
      update((s) => ({ ...s, selectedCategory: category }));
    },

    setSearch: (query: string): void => {
      update((s) => ({ ...s, searchQuery: query }));
    },

    clearFeedback: (): void => {
      update((s) => ({ ...s, feedbackMessage: null }));
    },

    /**
     * Attach Firebase Realtime Database synchronization.
     */
    startRealtimeSync: (userId: string): void => {
      if (activeSyncUserId === userId && (unsubscribeRtdb || syncTimer)) {
        return;
      }

      // Stop previous listeners/timers if switching users
      if (unsubscribeRtdb) {
        unsubscribeRtdb();
        unsubscribeRtdb = null;
      }
      if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
      }

      activeSyncUserId = userId;
      update((s) => ({ ...s, isRealtimeActive: true }));

      // Attach native Firebase Realtime Database listener
      try {
        unsubscribeRtdb = listenToUserTodos(userId, (todos) => {
          update((s) => ({
            ...s,
            todos: todos || [],
            isRealtimeActive: true,
          }));
        });
      } catch (err) {
        console.warn('[TodoStore] RTDB direct listener skipped or offline:', err);
      }

      // Periodic safety check to ensure sync
      syncTimer = setInterval(async () => {
        try {
          const res = await apiService.getTodos();
          if (res.success && Array.isArray(res.data)) {
            update((s) => ({
              ...s,
              todos: res.data || s.todos,
              isRealtimeActive: true,
            }));
          }
        } catch {
          // Keep current state on network pause
        }
      }, 15000);
      if (syncTimer && typeof syncTimer.unref === 'function') {
        syncTimer.unref();
      }
    },

    /**
     * Disconnect Firebase Realtime Database synchronization
     */
    stopRealtimeSync: (): void => {
      if (unsubscribeRtdb) {
        unsubscribeRtdb();
        unsubscribeRtdb = null;
      }
      if (activeSyncUserId) {
        stopListeningToUserTodos(activeSyncUserId);
      }
      if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
      }
      activeSyncUserId = null;
      update((s) => ({ ...s, isRealtimeActive: false }));
    },

    /**
     * Reset store to initial state
     */
    reset: (): void => {
      if (unsubscribeRtdb) {
        unsubscribeRtdb();
        unsubscribeRtdb = null;
      }
      if (activeSyncUserId) {
        stopListeningToUserTodos(activeSyncUserId);
      }
      if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
      }
      activeSyncUserId = null;
      set(initialState);
    },
  };
}

export const todoStore = createTodoStore();

// Derived filtered todos based on status, priority, category, and search query
export const filteredTodos = derived(
  todoStore,
  ($state) => {
    return $state.todos.filter((todo) => {
      // Status filter
      if ($state.activeFilter === 'active' && todo.completed) return false;
      if ($state.activeFilter === 'completed' && !todo.completed) return false;

      // Priority filter
      if ($state.selectedPriority !== 'all' && todo.priority !== $state.selectedPriority) {
        return false;
      }

      // Category filter
      if ($state.selectedCategory !== 'all' && todo.category !== $state.selectedCategory) {
        return false;
      }

      // Search query filter
      if ($state.searchQuery.trim()) {
        const query = $state.searchQuery.toLowerCase();
        const titleMatch = todo.title.toLowerCase().includes(query);
        const descMatch = (todo.description || '').toLowerCase().includes(query);
        if (!titleMatch && !descMatch) return false;
      }

      return true;
    });
  }
);

// Derived summary statistics for KPIs
export const todoStats = derived(
  todoStore,
  ($state): TodoStats => {
    const total = $state.todos.length;
    const completed = $state.todos.filter((t) => t.completed).length;
    const active = total - completed;
    const highPriority = $state.todos.filter(
      (t) => !t.completed && (t.priority === 'high' || t.priority === 'urgent')
    ).length;

    return { total, completed, active, highPriority };
  }
);

// Convenient individual readable stores
export const todosList = derived(todoStore, ($s) => $s.todos);
export const activeFilter = derived(todoStore, ($s) => $s.activeFilter);
export const selectedPriority = derived(todoStore, ($s) => $s.selectedPriority);
export const selectedTodo = derived(todoStore, ($s) => $s.selectedTodo);
export const isTodosLoading = derived(todoStore, ($s) => $s.isLoading);
export const isTodoSubmitting = derived(todoStore, ($s) => $s.isSubmitting);
export const feedbackMessage = derived(todoStore, ($s) => $s.feedbackMessage);
export const isRealtimeActive = derived(todoStore, ($s) => $s.isRealtimeActive);
