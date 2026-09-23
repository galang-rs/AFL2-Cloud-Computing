<script lang="ts">
  import type { Snippet } from 'svelte';
  import { StickyNoteCard } from '../molecules';
  import type { TodoItem } from '$lib/types/todo';
  import { Plus, Inbox } from 'lucide-svelte';

  interface Props {
    id: string;
    title: string;
    todos: TodoItem[];
    headerColor?: string;
    icon?: Snippet;
    onAddTodo?: () => void;
    onToggleComplete?: (id: string) => void;
    onEdit?: (todo: TodoItem) => void;
    onDelete?: (todo: TodoItem) => void;
    onMoveStatus?: (id: string, newStatus: boolean) => void;
    class?: string;
  }

  let {
    id,
    title,
    todos = [],
    headerColor = 'bg-surface-subtle text-content-primary',
    icon,
    onAddTodo,
    onToggleComplete,
    onEdit,
    onDelete,
    onMoveStatus,
    class: customClass = '',
  }: Props = $props();

  // Pick alternating pushpin colors based on index: crimson, gold, brass, silver
  const pinColors: ('crimson' | 'gold' | 'brass' | 'silver')[] = ['crimson', 'gold', 'brass', 'silver'];
</script>

<div
  data-column-id={id}
  class="flex flex-col bg-surface-panel/75 backdrop-blur-sm border border-surface-subtle rounded-2xl p-4 shadow-sm min-h-[500px] flex-1 {customClass}"
>
  <!-- Column Header with count pill -->
  <div class="flex items-center justify-between pb-3 mb-4 border-b border-surface-subtle">
    <div class="flex items-center gap-2">
      {#if icon}
        {@render icon()}
      {/if}
      <h2 class="text-sm font-bold tracking-tight text-content-primary">
        {title}
      </h2>
      <span class="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full {headerColor}">
        {todos.length}
      </span>
    </div>

    {#if onAddTodo}
      <button
        type="button"
        onclick={onAddTodo}
        class="p-1 rounded-md text-content-secondary hover:text-content-primary hover:bg-surface-subtle transition-colors cursor-pointer"
        title="Tambah tugas di kolom ini"
      >
        <Plus class="w-4 h-4" />
      </button>
    {/if}
  </div>

  <!-- Sticky Notes Stack -->
  <div class="flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
    {#if todos.length === 0}
      <!-- Empty state placeholder -->
      <div class="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-surface-subtle rounded-xl text-center select-none">
        <div class="w-10 h-10 rounded-full bg-surface-subtle text-content-muted flex items-center justify-center mb-2">
          <Inbox class="w-5 h-5" />
        </div>
        <p class="text-xs font-medium text-content-secondary">
          Belum ada catatan
        </p>
        <span class="text-[11px] text-content-muted mt-0.5">
          Tugas akan tampil di sini sebagai sticky note
        </span>
        {#if onAddTodo}
          <button
            type="button"
            onclick={onAddTodo}
            class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-note-amber-accent hover:underline cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Tempel Sticky Note</span>
          </button>
        {/if}
      </div>
    {:else}
      {#each todos as todo, index (todo.id)}
        <StickyNoteCard
          {todo}
          tiltIndex={index % 5}
          pinColor={pinColors[index % pinColors.length]}
          {onToggleComplete}
          {onEdit}
          {onDelete}
          {onMoveStatus}
        />
      {/each}
    {/if}
  </div>
</div>
