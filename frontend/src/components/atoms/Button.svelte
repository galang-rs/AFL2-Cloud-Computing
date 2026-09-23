<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Loader2 } from 'lucide-svelte';

  interface Props {
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'sticky';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    class?: string;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  }

  let {
    type = 'button',
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    class: customClass = '',
    onclick,
    children,
  }: Props = $props();

  const variantClasses: Record<string, string> = {
    primary: 'bg-note-amber-accent text-white hover:brightness-105 active:brightness-95 shadow-sm',
    secondary: 'bg-surface-subtle text-content-primary border border-surface-subtle hover:bg-surface-elevated',
    danger: 'bg-note-rose-accent text-white hover:brightness-105 active:brightness-95 shadow-sm',
    ghost: 'text-content-secondary hover:text-content-primary hover:bg-surface-subtle',
    sticky: 'bg-note-yellow-bg text-note-yellow-text border border-note-yellow-border hover:brightness-95 shadow-sticky',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'px-2.5 py-1 text-xs rounded',
    md: 'px-4 py-2 text-sm rounded-md',
    lg: 'px-5 py-2.5 text-base rounded-lg',
  };
</script>

<button
  {type}
  disabled={disabled || loading}
  {onclick}
  class="inline-flex items-center justify-center gap-2 font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none {variantClasses[variant]} {sizeClasses[size]} {customClass}"
>
  {#if loading}
    <Loader2 class="w-4 h-4 animate-spin text-current" />
  {/if}
  {#if children}
    {@render children()}
  {/if}
</button>
