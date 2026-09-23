<script lang="ts">
  interface Props {
    value?: string;
    placeholder?: string;
    id?: string;
    name?: string;
    label?: string;
    helperText?: string;
    errorMessage?: string;
    rows?: number;
    disabled?: boolean;
    required?: boolean;
    class?: string;
    oninput?: (e: Event & { currentTarget: HTMLTextAreaElement }) => void;
  }

  let {
    value = $bindable(''),
    placeholder = '',
    id = '',
    name = '',
    label = '',
    helperText = '',
    errorMessage = '',
    rows = 3,
    disabled = false,
    required = false,
    class: customClass = '',
    oninput,
  }: Props = $props();

  let textareaId = $derived(id || (name ? `textarea-${name}` : undefined));

  function handleAutoResize(e: Event & { currentTarget: HTMLTextAreaElement }) {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (oninput) oninput(e);
  }
</script>

<div class="flex flex-col gap-1.5 w-full">
  {#if label}
    <label for={textareaId} class="text-xs font-semibold uppercase tracking-wider text-content-secondary">
      {label}
      {#if required}
        <span class="text-note-rose-accent">*</span>
      {/if}
    </label>
  {/if}

  <textarea
    bind:value
    {placeholder}
    id={textareaId}
    {name}
    {rows}
    {disabled}
    {required}
    oninput={handleAutoResize}
    aria-invalid={Boolean(errorMessage)}
    class="w-full px-3.5 py-2 text-sm bg-surface-subtle text-content-primary placeholder-content-muted border {errorMessage ? 'border-note-rose-accent focus:ring-note-rose-accent' : 'border-surface-subtle focus:border-note-amber-accent focus:ring-note-amber-accent'} rounded-md focus:outline-none focus:ring-1 transition-colors resize-y disabled:opacity-50 disabled:cursor-not-allowed {customClass}"
  ></textarea>

  {#if errorMessage}
    <span class="text-xs text-note-rose-accent font-medium">{errorMessage}</span>
  {:else if helperText}
    <span class="text-xs text-content-muted">{helperText}</span>
  {/if}
</div>
