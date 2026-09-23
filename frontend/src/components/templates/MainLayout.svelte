<script lang="ts">
  import type { Snippet } from 'svelte';
  import Navbar from '../organisms/Navbar.svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="min-h-screen bg-surface-canvas text-content-primary flex flex-col font-sans transition-colors">
  <Navbar />

  <main class="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
    {#if children}
      {@render children()}
    {/if}
  </main>

  <footer class="border-t border-surface-subtle py-6 text-center text-xs text-content-muted">
    <p>AFL2 Todo List &bull; Built with Svelte 5, TypeScript, Tailwind CSS, Firebase Realtime Database & Cloud Functions</p>
  </footer>
</div>
