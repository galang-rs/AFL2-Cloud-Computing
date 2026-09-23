export * from './todo.store';

// Backward-compatibility aliases for previously scaffolded store names
import {
  todoStore,
  filteredTodos,
  todosList as todosStore,
  activeFilter as filterStore,
  selectedPriority as selectedPriorityStore
} from './todo.store';

export { todoStore, filteredTodos, todosStore, filterStore, selectedPriorityStore };
