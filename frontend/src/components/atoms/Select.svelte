<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    value?: string;
    options: Option[];
    id?: string;
    name?: string;
    label?: string;
    helperText?: string;
    errorMessage?: string;
    disabled?: boolean;
    required?: boolean;
    class?: string;
    onchange?: (e: Event & { currentTarget: HTMLSelectElement }) => void;
  }

  let {
    value = $bindable(''),
    options = [],
    id = '',
    name = '',
    label = '',
    helperText = '',
    errorMessage = '',
    disabled = false,
    required = false,
    class: customClass = '',
    onchange,
  }: Props = $props();

  let selectId = $derived(id || (name ? `select-${name}` : undefined));
</script>

<div class="flex flex-col gap-1.5 w-full">
  {#if label}
    <label for={selectId} class="text-xs font-semibold uppercase tracking-wider text-content-secondary">
      {label}
      {#if required}
        <span class="text-note-rose-accent">*</span>
      {/if}
    </label>
  {/if}

  <div class="relative w-full">
    <select
      bind:value
      id={selectId}
      {name}
      {disabled}
      {required}
      {onchange}
      aria-invalid={Boolean(errorMessage)}
      class="w-full appearance-none px-3.5 py-2 pr-9 text-sm bg-surface-subtle text-content-primary border {errorMessage ? 'border-note-rose-accent focus:ring-note-rose-accent' : 'border-surface-subtle focus:border-note-amber-accent focus:ring-note-amber-accent'} rounded-md focus:outline-none focus:ring-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer {customClass}"
    >
      {#each options as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-content-muted">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </div>
  </div>

  {#if errorMessage}
    <span class="text-xs text-note-rose-accent font-medium">{errorMessage}</span>
  {:else if helperText}
    <span class="text-xs text-content-muted">{helperText}</span>
  {/if}
</div>
