<script lang="ts">
  import { Search, X } from 'lucide-svelte';
  import { Select } from '../atoms';
  import type { Priority, Category } from '$lib/types/todo';

  interface Props {
    searchQuery?: string;
    selectedPriority?: Priority | 'all';
    selectedCategory?: Category | 'all';
    sortBy?: 'createdAt' | 'priority' | 'title';
    onSearchChange?: (val: string) => void;
    onPriorityChange?: (val: Priority | 'all') => void;
    onCategoryChange?: (val: Category | 'all') => void;
    onSortChange?: (val: 'createdAt' | 'priority' | 'title') => void;
    onResetFilters?: () => void;
    class?: string;
  }

  let {
    searchQuery = $bindable(''),
    selectedPriority = 'all',
    selectedCategory = 'all',
    sortBy = 'createdAt',
    onSearchChange,
    onPriorityChange,
    onCategoryChange,
    onSortChange,
    onResetFilters,
    class: customClass = '',
  }: Props = $props();

  const priorityOptions = [
    { value: 'all', label: 'Semua Prioritas' },
    { value: 'urgent', label: 'Mendesak (Urgent)' },
    { value: 'high', label: 'Tinggi (High)' },
    { value: 'medium', label: 'Sedang (Medium)' },
    { value: 'low', label: 'Rendah (Low)' },
  ];

  const categoryOptions = [
    { value: 'all', label: 'Semua Kategori' },
    { value: 'academic', label: 'Akademik' },
    { value: 'work', label: 'Pekerjaan' },
    { value: 'personal', label: 'Pribadi' },
    { value: 'general', label: 'Umum' },
  ];

  const sortOptions = [
    { value: 'createdAt', label: 'Tanggal Dibuat' },
    { value: 'priority', label: 'Tingkat Prioritas' },
    { value: 'title', label: 'Judul (A-Z)' },
  ];

  let hasActiveFilter = $derived(
    Boolean(searchQuery.trim() || selectedPriority !== 'all' || selectedCategory !== 'all' || sortBy !== 'createdAt')
  );
</script>

<div class="w-full bg-surface-panel border border-surface-subtle rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 {customClass}">
  <!-- Search input box -->
  <div class="relative w-full md:flex-1">
    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
      <Search class="w-4 h-4" />
    </div>
    <input
      type="text"
      bind:value={searchQuery}
      oninput={(e) => onSearchChange?.(e.currentTarget.value)}
      placeholder="Cari catatan tugas berdasarkan kata kunci..."
      class="w-full pl-10 pr-9 py-2 text-sm bg-surface-subtle text-content-primary placeholder-content-muted border border-surface-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-note-amber-accent focus:border-note-amber-accent transition-colors"
    />
    {#if searchQuery}
      <button
        type="button"
        onclick={() => {
          searchQuery = '';
          onSearchChange?.('');
        }}
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-content-muted hover:text-content-primary cursor-pointer"
      >
        <X class="w-4 h-4" />
      </button>
    {/if}
  </div>

  <!-- Filter & Sort dropdowns -->
  <div class="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
    <!-- Priority Filter -->
    <div class="min-w-[140px]">
      <Select
        value={selectedPriority}
        options={priorityOptions}
        onchange={(e) => onPriorityChange?.(e.currentTarget.value as Priority | 'all')}
        class="py-1.5 text-xs rounded-lg"
      />
    </div>

    <!-- Category Filter -->
    <div class="min-w-[140px]">
      <Select
        value={selectedCategory}
        options={categoryOptions}
        onchange={(e) => onCategoryChange?.(e.currentTarget.value as Category | 'all')}
        class="py-1.5 text-xs rounded-lg"
      />
    </div>

    <!-- Sort Selector -->
    <div class="min-w-[140px]">
      <Select
        value={sortBy}
        options={sortOptions}
        onchange={(e) => onSortChange?.(e.currentTarget.value as 'createdAt' | 'priority' | 'title')}
        class="py-1.5 text-xs rounded-lg"
      />
    </div>

    <!-- Clear Filters Button -->
    {#if hasActiveFilter}
      <button
        type="button"
        onclick={onResetFilters}
        class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-note-rose-accent bg-note-rose-bg/50 border border-note-rose-border rounded-lg hover:bg-note-rose-bg transition-colors cursor-pointer whitespace-nowrap"
        title="Reset semua filter"
      >
        <X class="w-3.5 h-3.5" />
        <span>Reset</span>
      </button>
    {/if}
  </div>
</div>
