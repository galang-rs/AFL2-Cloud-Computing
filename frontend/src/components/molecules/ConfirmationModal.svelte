<script lang="ts">
  import { AlertTriangle, X } from 'lucide-svelte';
  import { Button } from '../atoms';

  interface Props {
    open?: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    loading?: boolean;
    onconfirm?: () => void;
    oncancel?: () => void;
  }

  let {
    open = false,
    title = 'Konfirmasi Tindakan',
    message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
    confirmText = 'Hapus',
    cancelText = 'Batal',
    isDangerous = true,
    loading = false,
    onconfirm,
    oncancel,
  }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      oncancel?.();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div
      class="w-full max-w-md bg-surface-panel border border-surface-subtle rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-5 border-b border-surface-subtle">
        <div class="flex items-center gap-2.5">
          {#if isDangerous}
            <div class="w-8 h-8 rounded-full bg-note-rose-bg text-note-rose-accent flex items-center justify-center">
              <AlertTriangle class="w-4 h-4" />
            </div>
          {/if}
          <h2 id="modal-title" class="text-base font-bold text-content-primary">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onclick={oncancel}
          class="p-1 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-subtle transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5">
        <p class="text-sm text-content-secondary leading-relaxed">
          {message}
        </p>
      </div>

      <!-- Modal Actions -->
      <div class="flex items-center justify-end gap-2.5 p-4 bg-surface-subtle border-t border-surface-subtle">
        <Button variant="secondary" size="md" onclick={oncancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={isDangerous ? 'danger' : 'primary'}
          size="md"
          onclick={onconfirm}
          {loading}
        >
          {confirmText}
        </Button>
      </div>
    </div>
  </div>
{/if}
