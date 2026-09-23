<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Navbar } from '../organisms';
  import { Plus } from 'lucide-svelte';
  import type { UserProfile } from '$lib/types/todo';

  interface Props {
    user?: UserProfile | null;
    isRealtimeActive?: boolean;
    darkMode?: boolean;
    onToggleTheme?: () => void;
    onLogout?: () => void;
    onNewStickyNote?: () => void;
    headerSlot?: Snippet;
    filterSlot?: Snippet;
    boardSlot?: Snippet;
    modalsSlot?: Snippet;
  }

  let {
    user = null,
    isRealtimeActive = true,
    darkMode = false,
    onToggleTheme,
    onLogout,
    onNewStickyNote,
    headerSlot,
    filterSlot,
    boardSlot,
    modalsSlot,
  }: Props = $props();
</script>

<div class="min-h-screen flex flex-col bg-surface-canvas text-content-primary transition-colors">
  <!-- Top Navigation Bar -->
  <Navbar
    {user}
    {isRealtimeActive}
    {darkMode}
    {onToggleTheme}
    {onLogout}
  />

  <!-- Main Corkboard Board Canvas Area -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
    <!-- Header Section (Date, Stats, Quote) -->
    {#if headerSlot}
      {@render headerSlot()}
    {/if}

    <!-- Search & Filter Controls -->
    {#if filterSlot}
      {@render filterSlot()}
    {/if}

    <!-- Kanban Board Corkboard Grid -->
    {#if boardSlot}
      {@render boardSlot()}
    {/if}
  </main>

  <!-- Floating Action Button (+ New Sticky Note) -->
  {#if onNewStickyNote}
    <div class="fixed bottom-6 right-6 z-30">
      <button
        type="button"
        onclick={onNewStickyNote}
        class="flex items-center gap-2 px-5 py-3.5 bg-note-amber-accent text-white font-semibold text-sm rounded-full shadow-lg hover:shadow-xl hover:brightness-105 active:scale-95 transition-all cursor-pointer select-none"
        title="Buat Catatan Sticky Baru"
      >
        <Plus class="w-5 h-5 stroke-[2.5]" />
        <span>Catatan Baru</span>
      </button>
    </div>
  {/if}

  <!-- Modals Container Slot -->
  {#if modalsSlot}
    {@render modalsSlot()}
  {/if}
</div>
