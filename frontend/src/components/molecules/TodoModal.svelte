<script lang="ts">
  import { X, StickyNote } from 'lucide-svelte';
  import { Button, Input, Textarea, Select } from '../atoms';
  import type { TodoItem, Priority, Category, NoteColor, CreateTodoDto } from '$lib/types/todo';

  interface Props {
    open?: boolean;
    todo?: TodoItem | null;
    loading?: boolean;
    onsave?: (dto: CreateTodoDto) => void;
    onclose?: () => void;
  }

  let {
    open = false,
    todo = null,
    loading = false,
    onsave,
    onclose,
  }: Props = $props();

  let title = $state('');
  let description = $state('');
  let priority = $state<Priority>('medium');
  let category = $state<Category>('general');
  let color = $state<NoteColor>('yellow');
  let titleError = $state('');

  // Sync state whenever todo prop or open changes
  $effect(() => {
    if (todo) {
      title = todo.title;
      description = todo.description || '';
      priority = todo.priority;
      category = todo.category;
      color = todo.color;
    } else {
      title = '';
      description = '';
      priority = 'medium';
      category = 'general';
      color = 'yellow';
    }
    titleError = '';
  });

  const priorityOptions = [
    { value: 'urgent', label: 'Mendesak (Urgent)' },
    { value: 'high', label: 'Tinggi (High)' },
    { value: 'medium', label: 'Sedang (Medium)' },
    { value: 'low', label: 'Rendah (Low)' },
  ];

  const categoryOptions = [
    { value: 'academic', label: 'Akademik' },
    { value: 'work', label: 'Pekerjaan' },
    { value: 'personal', label: 'Pribadi' },
    { value: 'general', label: 'Umum' },
  ];

  const colorOptions: { value: NoteColor; label: string; class: string }[] = [
    { value: 'yellow', label: 'Kuning', class: 'bg-note-yellow-bg border-note-yellow-border' },
    { value: 'amber', label: 'Oranye / Amber', class: 'bg-note-amber-bg border-note-amber-border' },
    { value: 'emerald', label: 'Hijau Daun', class: 'bg-note-emerald-bg border-note-emerald-border' },
    { value: 'sky', label: 'Biru Langit', class: 'bg-note-sky-bg border-note-sky-border' },
    { value: 'rose', label: 'Merah Mawar', class: 'bg-note-rose-bg border-note-rose-border' },
    { value: 'slate', label: 'Abu Klasik', class: 'bg-note-slate-bg border-note-slate-border' },
  ];

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!title.trim()) {
      titleError = 'Judul catatan wajib diisi!';
      return;
    }

    onsave?.({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category,
      color,
    });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      onclose?.();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity"
    role="dialog"
    aria-modal="true"
    aria-labelledby="todo-modal-title"
  >
    <div
      class="w-full max-w-lg bg-surface-panel border border-surface-subtle rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-5 border-b border-surface-subtle">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-note-yellow-bg text-note-yellow-accent flex items-center justify-center">
            <StickyNote class="w-4 h-4" />
          </div>
          <h2 id="todo-modal-title" class="text-base font-bold text-content-primary">
            {todo ? 'Edit Sticky Note' : 'Tambah Sticky Note Baru'}
          </h2>
        </div>
        <button
          type="button"
          onclick={onclose}
          class="p-1 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-subtle transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form Content -->
      <form onsubmit={handleSubmit}>
        <div class="p-5 flex flex-col gap-4">
          <!-- Title Input -->
          <Input
            label="Judul Tugas / Catatan"
            placeholder="Misal: Selesaikan laporan praktikum Kimia"
            bind:value={title}
            required
            errorMessage={titleError}
            oninput={() => {
              if (titleError) titleError = '';
            }}
          />

          <!-- Description Textarea -->
          <Textarea
            label="Deskripsi / Catatan Tambahan"
            placeholder="Tuliskan rincian langkah, tautan referensi, atau checklist tugas..."
            bind:value={description}
            rows={3}
          />

          <!-- Priority & Category Row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Tingkat Prioritas"
              options={priorityOptions}
              bind:value={priority}
            />
            <Select
              label="Kategori"
              options={categoryOptions}
              bind:value={category}
            />
          </div>

          <!-- Sticky Note Color Selector -->
          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold uppercase tracking-wider text-content-secondary">
              Warna Kertas Sticky Note
            </span>
            <div class="flex items-center gap-2.5 flex-wrap pt-1">
              {#each colorOptions as c}
                <button
                  type="button"
                  onclick={() => (color = c.value)}
                  class="w-8 h-8 rounded-lg border-2 transition-transform cursor-pointer flex items-center justify-center {c.class} {color === c.value ? 'scale-110 ring-2 ring-note-amber-accent ring-offset-2' : 'hover:scale-105'}"
                  title={c.label}
                >
                  {#if color === c.value}
                    <div class="w-2 h-2 rounded-full bg-content-primary"></div>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="flex items-center justify-end gap-2.5 p-4 bg-surface-subtle border-t border-surface-subtle">
          <Button variant="secondary" size="md" onclick={onclose} disabled={loading}>
            Batal
          </Button>
          <Button type="submit" variant="primary" size="md" {loading}>
            {todo ? 'Simpan Perubahan' : 'Tempel Catatan'}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}
