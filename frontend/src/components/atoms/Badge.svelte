<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Priority, Category } from '$lib/types/todo';

  interface Props {
    type?: 'priority' | 'status' | 'category' | 'default';
    value?: Priority | Category | string;
    class?: string;
    children?: Snippet;
  }

  let {
    type = 'default',
    value = '',
    class: customClass = '',
    children,
  }: Props = $props();

  // Priority mapping:
  // high/urgent: coral red
  // medium: amber gold
  // low: emerald sage
  const badgeStyles: Record<string, string> = {
    urgent: 'bg-note-rose-bg text-note-rose-text border-note-rose-border font-semibold',
    high: 'bg-note-rose-bg text-note-rose-text border-note-rose-border font-medium',
    medium: 'bg-note-amber-bg text-note-amber-text border-note-amber-border font-medium',
    low: 'bg-note-emerald-bg text-note-emerald-text border-note-emerald-border font-medium',
    
    // Status styles
    todo: 'bg-surface-subtle text-content-secondary border-surface-subtle',
    in_progress: 'bg-note-sky-bg text-note-sky-text border-note-sky-border',
    completed: 'bg-note-emerald-bg text-note-emerald-text border-note-emerald-border',

    // Category styles
    academic: 'bg-note-emerald-bg text-note-emerald-text border-note-emerald-border',
    work: 'bg-note-sky-bg text-note-sky-text border-note-sky-border',
    personal: 'bg-note-amber-bg text-note-amber-text border-note-amber-border',
    general: 'bg-note-slate-bg text-note-slate-text border-note-slate-border',
    default: 'bg-surface-subtle text-content-secondary border-surface-subtle',
  };

  let styleKey = $derived((value || 'default').toLowerCase().replace(/\s+/g, '_'));
  let appliedStyle = $derived(badgeStyles[styleKey] || badgeStyles.default);
</script>

<span
  data-badge-type={type}
  class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs border rounded-full uppercase tracking-wider {appliedStyle} {customClass}"
>
  {#if children}
    {@render children()}
  {:else}
    {value}
  {/if}
</span>
