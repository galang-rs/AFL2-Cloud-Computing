<script lang="ts">
  import KanbanColumn from './KanbanColumn.svelte';
  import type { TodoItem } from '$lib/types/todo';
  import { ListTodo, Clock, CheckCircle2 } from 'lucide-svelte';

  interface Props {
    todos: TodoItem[];
    onAddTodo?: () => void;
    onToggleComplete?: (id: string) => void;
    onEdit?: (todo: TodoItem) => void;
    onDelete?: (todo: TodoItem) => void;
    onMoveStatus?: (id: string, newStatus: boolean) => void;
    class?: string;
  }

  let {
    todos = [],
    onAddTodo,
    onToggleComplete,
    onEdit,
    onDelete,
    onMoveStatus,
    class: customClass = '',
  }: Props = $props();

  // 3 Kanban columns:
  // 1. Antrean Tugas (Todo) - active tasks, normal priority
  // 2. Dalam Pengerjaan (In Progress) - active tasks, urgent or high priority (or active without completed)
  // 3. Selesai (Completed) - completed tasks
  let todoList = $derived(
    todos.filter((t) => !t.completed && t.priority !== 'urgent' && t.priority !== 'high')
  );

  let inProgressList = $derived(
    todos.filter((t) => !t.completed && (t.priority === 'urgent' || t.priority === 'high'))
  );

  let completedList = $derived(
    todos.filter((t) => t.completed)
  );
</script>

<div class="w-full corkboard-surface p-4 md:p-6 rounded-3xl border-4 border-amber-900/10 dark:border-amber-950/40 shadow-inner {customClass}">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
    <!-- Kolom 1: Antrean Tugas (Todo) -->
    <KanbanColumn
      id="todo-column"
      title="Antrean Tugas"
      todos={todoList}
      headerColor="bg-note-yellow-bg text-note-yellow-text border border-note-yellow-border"
      {onAddTodo}
      {onToggleComplete}
      {onEdit}
      {onDelete}
      {onMoveStatus}
    >
      {#snippet icon()}
        <ListTodo class="w-4 h-4 text-note-yellow-accent" />
      {/snippet}
    </KanbanColumn>

    <!-- Kolom 2: Fokus / Dalam Proses (In Progress) -->
    <KanbanColumn
      id="in-progress-column"
      title="Prioritas & Proses"
      todos={inProgressList}
      headerColor="bg-note-sky-bg text-note-sky-text border border-note-sky-border"
      {onAddTodo}
      {onToggleComplete}
      {onEdit}
      {onDelete}
      {onMoveStatus}
    >
      {#snippet icon()}
        <Clock class="w-4 h-4 text-note-sky-accent" />
      {/snippet}
    </KanbanColumn>

    <!-- Kolom 3: Selesai (Completed) -->
    <KanbanColumn
      id="completed-column"
      title="Terselesaikan"
      todos={completedList}
      headerColor="bg-note-emerald-bg text-note-emerald-text border border-note-emerald-border"
      {onAddTodo}
      {onToggleComplete}
      {onEdit}
      {onDelete}
      {onMoveStatus}
    >
      {#snippet icon()}
        <CheckCircle2 class="w-4 h-4 text-note-emerald-accent" />
      {/snippet}
    </KanbanColumn>
  </div>
</div>
