<script lang="ts">
  interface Props {
    type?: string;
    value?: string;
    placeholder?: string;
    id?: string;
    name?: string;
    label?: string;
    helperText?: string;
    errorMessage?: string;
    disabled?: boolean;
    required?: boolean;
    class?: string;
    oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
  }

  let {
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    id = '',
    name = '',
    label = '',
    helperText = '',
    errorMessage = '',
    disabled = false,
    required = false,
    class: customClass = '',
    oninput,
  }: Props = $props();

  let inputId = $derived(id || (name ? `input-${name}` : undefined));
</script>

<div class="flex flex-col gap-1.5 w-full">
  {#if label}
    <label for={inputId} class="text-xs font-semibold uppercase tracking-wider text-content-secondary">
      {label}
      {#if required}
        <span class="text-note-rose-accent">*</span>
      {/if}
    </label>
  {/if}

  <input
    {type}
    bind:value
    {placeholder}
    id={inputId}
    {name}
    {disabled}
    {required}
    {oninput}
    aria-invalid={Boolean(errorMessage)}
    class="w-full px-3.5 py-2 text-sm bg-surface-subtle text-content-primary placeholder-content-muted border {errorMessage ? 'border-note-rose-accent focus:ring-note-rose-accent' : 'border-surface-subtle focus:border-note-amber-accent focus:ring-note-amber-accent'} rounded-md focus:outline-none focus:ring-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed {customClass}"
  />

  {#if errorMessage}
    <span class="text-xs text-note-rose-accent font-medium">{errorMessage}</span>
  {:else if helperText}
    <span class="text-xs text-content-muted">{helperText}</span>
  {/if}
</div>
