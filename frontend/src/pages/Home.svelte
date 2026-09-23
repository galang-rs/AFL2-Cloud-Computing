<script lang="ts">
  import MainLayout from '../components/templates/MainLayout.svelte';
  import Button from '../components/atoms/Button.svelte';
  import Badge from '../components/atoms/Badge.svelte';
  import SearchBar from '../components/molecules/SearchBar.svelte';
  import PrioritySelector from '../components/molecules/PrioritySelector.svelte';
  import type { Priority } from '$lib/types/todo';
  import { todoStore, filteredTodos } from '$lib/stores/todo';
  import { authStore } from '$lib/stores/auth';
  import { Plus, Check, Clock, Tag } from 'lucide-svelte';

  let searchQuery = $state('');
  let selectedPriority: Priority | 'all' = $state('all');

  $effect(() => {
    todoStore.setSearch(searchQuery);
  });

  $effect(() => {
    todoStore.setPriority(selectedPriority);
  });

  $effect(() => {
    // Initial fetch of tasks
    todoStore.fetchTodos();

    // Check if auth changes and start realtime sync if user is present
    const unsubscribeAuth = authStore.subscribe((state) => {
      if (state.currentUser?.uid) {
        todoStore.startRealtimeSync(state.currentUser.uid);
      }
    });

    return () => {
      unsubscribeAuth();
      todoStore.stopRealtimeSync();
    };
  });

  function toggleNote(id: string) {
    todoStore.toggleComplete(id);
  }
</script>

<MainLayout>
  <!-- Control Bar -->
  <section class="mb-8 space-y-4">
    <div class="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
      <div class="max-w-md w-full">
        <SearchBar bind:value={searchQuery} placeholder="Filter sticky notes..." />
      </div>

      <div class="flex items-center gap-3">
        <PrioritySelector bind:selected={selectedPriority} />

        <Button variant="primary" size="md">
          <span class="flex items-center gap-1.5">
            <Plus size={16} />
            <span>New Note</span>
          </span>
        </Button>
      </div>
    </div>
  </section>

  <!-- Notes Grid -->
  <section>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-content-secondary">
        Sticky Notes Board ({$filteredTodos.length})
      </h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {#each $filteredTodos as note (note.id)}
        <article class="note-card note-{note.color} flex flex-col justify-between min-h-[200px]">
          <div>
            <div class="flex items-start justify-between gap-2 mb-2.5">
              <Badge type="priority" value={note.priority} />
              <div class="flex items-center gap-1 text-xs opacity-75">
                <Tag size={12} />
                <span class="capitalize">{note.category}</span>
              </div>
            </div>

            <h3 class="text-base font-semibold leading-snug mb-2 {note.completed ? 'line-through opacity-60' : ''}">
              {note.title}
            </h3>

            <p class="text-xs leading-relaxed opacity-85">
              {note.description}
            </p>
          </div>

          <div class="pt-4 mt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
            <div class="flex items-center gap-1.5 opacity-75">
              <Clock size={13} />
              <span>Today</span>
            </div>

            <button
              type="button"
              onclick={() => toggleNote(note.id)}
              class="w-6 h-6 rounded flex items-center justify-center border border-current opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              aria-label={note.completed ? 'Mark incomplete' : 'Mark complete'}
            >
              {#if note.completed}
                <Check size={14} />
              {/if}
            </button>
          </div>
        </article>
      {/each}
    </div>
  </section>
</MainLayout>
