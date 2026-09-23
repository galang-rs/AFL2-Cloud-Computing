<script lang="ts">
  import { Pin, Badge } from '../atoms';
  import type { TodoItem } from '$lib/types/todo';
  import { Check, Edit2, Trash2, ArrowRight, ArrowLeft } from 'lucide-svelte';

  interface Props {
    todo: TodoItem;
    tiltIndex?: number;
    pinColor?: 'crimson' | 'gold' | 'brass' | 'silver';
    onToggleComplete?: (id: string) => void;
    onEdit?: (todo: TodoItem) => void;
    onDelete?: (todo: TodoItem) => void;
    onMoveStatus?: (id: string, newStatus: boolean) => void;
    class?: string;
  }

  let {
    todo,
    tiltIndex = 0,
    pinColor = 'crimson',
    onToggleComplete,
    onEdit,
    onDelete,
    onMoveStatus,
    class: customClass = '',
  }: Props = $props();

  // Color mapping
  const noteThemeClasses: Record<string, string> = {
    amber: 'note-amber',
    yellow: 'note-yellow',
    emerald: 'note-emerald',
    sky: 'note-sky',
    rose: 'note-rose',
    slate: 'note-slate',
  };

  // Tilt variants: tilt-neg-2, tilt-neg-1, tilt-zero, tilt-pos-1, tilt-pos-2
  const tiltClasses = ['tilt-neg-2', 'tilt-neg-1', 'tilt-zero', 'tilt-pos-1', 'tilt-pos-2'];
  let computedTilt = $derived(tiltClasses[Math.abs(tiltIndex) % tiltClasses.length]);

  let noteTheme = $derived(noteThemeClasses[todo.color] || 'note-yellow');

  // Format date helper
  function formatNoteDate(dateStr: string) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  }
</script>

<div
  class="relative note-card {noteTheme} {computedTilt} group flex flex-col justify-between transition-all duration-300 min-h-[160px] select-none {customClass}"
>
  <!-- Aesthetic Pushpin centered at the top -->
  <div class="absolute -top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
    <Pin color={pinColor} />
  </div>

  <!-- Note Top Header (Priority & Category / Date) -->
  <div class="flex items-center justify-between gap-2 pt-1 pb-2">
    <div class="flex items-center gap-1.5 flex-wrap">
      <Badge type="priority" value={todo.priority} class="text-[10px] py-0 px-2" />
      <span class="text-[11px] opacity-75 uppercase tracking-wider font-semibold font-mono">
        {todo.category}
      </span>
    </div>

    {#if todo.createdAt}
      <span class="text-[11px] opacity-65 font-mono">
        {formatNoteDate(todo.createdAt)}
      </span>
    {/if}
  </div>

  <!-- Note Content: Title & Description -->
  <div class="flex-1 my-1">
    <h3
      class="text-sm font-bold tracking-tight leading-snug line-clamp-2 {todo.completed ? 'line-through opacity-60' : ''}"
    >
      {todo.title}
    </h3>
    {#if todo.description}
      <p
        class="text-xs opacity-80 mt-1.5 line-clamp-3 leading-relaxed font-normal {todo.completed ? 'line-through opacity-50' : ''}"
      >
        {todo.description}
      </p>
    {/if}
  </div>

  <!-- Note Bottom Footer: Actions -->
  <div class="flex items-center justify-between pt-3 mt-2 border-t border-black/10 dark:border-white/10 text-xs">
    <!-- Status Toggle Button -->
    <button
      type="button"
      onclick={() => onToggleComplete?.(todo.id)}
      class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors cursor-pointer"
      title={todo.completed ? 'Tandai belum selesai' : 'Tandai selesai'}
    >
      <Check class="w-3.5 h-3.5 {todo.completed ? 'text-green-600 dark:text-green-400' : 'opacity-40'}" />
      <span>{todo.completed ? 'Selesai' : 'Belum'}</span>
    </button>

    <!-- Edit & Delete Buttons -->
    <div class="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
      {#if onMoveStatus}
        <button
          type="button"
          onclick={() => onMoveStatus(todo.id, !todo.completed)}
          class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/20 transition-colors cursor-pointer"
          title={todo.completed ? 'Pindahkan ke Belum Selesai' : 'Pindahkan ke Selesai'}
        >
          {#if todo.completed}
            <ArrowLeft class="w-3.5 h-3.5" />
          {:else}
            <ArrowRight class="w-3.5 h-3.5" />
          {/if}
        </button>
      {/if}

      <button
        type="button"
        onclick={() => onEdit?.(todo)}
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/20 transition-colors cursor-pointer"
        title="Edit Catatan"
      >
        <Edit2 class="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onclick={() => onDelete?.(todo)}
        class="p-1 rounded hover:bg-black/10 dark:hover:bg-white/20 transition-colors cursor-pointer text-note-rose-accent hover:text-red-700"
        title="Hapus Catatan"
      >
        <Trash2 class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</div>
