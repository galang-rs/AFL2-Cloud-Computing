<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Pin } from '../atoms';

  interface Props {
    title?: string;
    subtitle?: string;
    children?: Snippet;
  }

  let {
    title = 'Sticky Notes Kanban',
    subtitle = 'Aplikasi Todo List Interaktif dengan Firebase Realtime Database & Cloud Functions',
    children,
  }: Props = $props();
</script>

<div class="min-h-screen w-full corkboard-surface flex items-center justify-center p-4 sm:p-6 lg:p-8">
  <div class="relative w-full max-w-md bg-surface-panel/95 backdrop-blur-md border border-surface-subtle rounded-3xl p-6 sm:p-8 shadow-xl">
    <!-- Top Decorative Pushpin -->
    <div class="absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
      <Pin color="crimson" class="scale-125" />
    </div>

    <!-- Header Section -->
    <div class="text-center mb-6 pt-2">
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-note-yellow-bg border border-note-yellow-border text-note-yellow-text text-xs font-mono font-semibold uppercase tracking-wider mb-2">
        <span>AFL2 Todo Board</span>
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-content-primary">
        {title}
      </h1>
      <p class="text-xs text-content-secondary mt-1.5 leading-relaxed">
        {subtitle}
      </p>
    </div>

    <!-- Card Content Slot -->
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>
