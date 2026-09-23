<script lang="ts">
  import type { Priority } from '$lib/types/todo';

  interface Props {
    selected?: Priority | 'all';
    onselect?: (priority: Priority | 'all') => void;
  }

  let {
    selected = $bindable('all'),
    onselect,
  }: Props = $props();

  const priorities: Array<{ id: Priority | 'all'; label: string; activeClass: string }> = [
    { id: 'all', label: 'All', activeClass: 'bg-surface-elevated text-content-primary shadow-sm' },
    { id: 'low', label: 'Low', activeClass: 'bg-note-sky-bg text-note-sky-text border border-note-sky-border' },
    { id: 'medium', label: 'Medium', activeClass: 'bg-note-yellow-bg text-note-yellow-text border border-note-yellow-border' },
    { id: 'high', label: 'High', activeClass: 'bg-note-amber-bg text-note-amber-text border border-note-amber-border' },
    { id: 'urgent', label: 'Urgent', activeClass: 'bg-note-rose-bg text-note-rose-text border border-note-rose-border' },
  ];

  function selectPriority(id: Priority | 'all') {
    selected = id;
    onselect?.(id);
  }
</script>

<div class="inline-flex items-center gap-1 p-1 bg-surface-subtle border border-surface-subtle rounded-lg text-xs font-medium">
  {#each priorities as item (item.id)}
    <button
      type="button"
      onclick={() => selectPriority(item.id)}
      class="px-2.5 py-1 rounded-md transition-all cursor-pointer {selected === item.id ? item.activeClass : 'text-content-secondary hover:text-content-primary'}"
    >
      {item.label}
    </button>
  {/each}
</div>
