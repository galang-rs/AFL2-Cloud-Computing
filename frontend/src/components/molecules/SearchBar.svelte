<script lang="ts">
  import Input from '../atoms/Input.svelte';
  import { Search, X } from 'lucide-svelte';

  interface Props {
    value?: string;
    placeholder?: string;
    onsearch?: (value: string) => void;
  }

  let {
    value = $bindable(''),
    placeholder = 'Search tasks...',
    onsearch,
  }: Props = $props();

  function handleClear() {
    value = '';
    onsearch?.('');
  }

  function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
    value = e.currentTarget.value;
    onsearch?.(value);
  }
</script>

<div class="relative w-full flex items-center">
  <div class="absolute left-3 text-content-muted pointer-events-none flex items-center justify-center">
    <Search size={16} />
  </div>

  <Input
    type="text"
    bind:value
    {placeholder}
    class="pl-9 pr-9"
    oninput={handleInput}
  />

  {#if value}
    <button
      type="button"
      onclick={handleClear}
      class="absolute right-3 text-content-muted hover:text-content-primary cursor-pointer transition-colors"
      aria-label="Clear search"
    >
      <X size={16} />
    </button>
  {/if}
</div>
