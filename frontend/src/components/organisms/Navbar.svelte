<script lang="ts">
  import { LogOut, Sun, Moon, Database, Flame } from 'lucide-svelte';
  import { Button, Pin } from '../atoms';
  import type { UserProfile } from '$lib/types/todo';

  interface Props {
    user?: UserProfile | null;
    isRealtimeActive?: boolean;
    darkMode?: boolean;
    onToggleTheme?: () => void;
    onLogout?: () => void;
    class?: string;
  }

  let {
    user = null,
    isRealtimeActive = true,
    darkMode = false,
    onToggleTheme,
    onLogout,
    class: customClass = '',
  }: Props = $props();

  function getUserInitials(nameOrEmail: string | null) {
    if (!nameOrEmail) return 'U';
    const clean = nameOrEmail.replace(/@.*$/, '').trim();
    return clean.slice(0, 2).toUpperCase();
  }
</script>

<nav class="w-full bg-surface-panel/95 backdrop-blur border-b border-surface-subtle sticky top-0 z-40 transition-colors {customClass}">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
    <!-- Brand Logo with Corkboard & Pin motif -->
    <div class="flex items-center gap-3">
      <div class="relative w-9 h-9 rounded-lg bg-note-yellow-bg border border-note-yellow-border flex items-center justify-center shadow-sm">
        <div class="absolute -top-2.5 left-1/2 -translate-x-1/2 pointer-events-none">
          <Pin color="crimson" class="scale-75" />
        </div>
        <span class="font-bold text-xs font-mono text-note-yellow-text mt-1">AFL2</span>
      </div>

      <div class="flex flex-col">
        <div class="flex items-center gap-1.5">
          <span class="font-bold text-base tracking-tight text-content-primary">
            Sticky Kanban
          </span>
          <!-- Environment Indicator -->
          <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <Flame class="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
            <Database class="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
            <span>Firebase RTDB</span>
          </span>
        </div>
        <span class="text-[10px] text-content-muted hidden sm:inline">
          Firebase Realtime Database & Cloud Functions
        </span>
      </div>
    </div>

    <!-- Active User & Right Actions -->
    <div class="flex items-center gap-2.5 sm:gap-4">
      <!-- Dark / Light Mode Toggle Button -->
      <button
        type="button"
        onclick={onToggleTheme}
        class="p-2 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-subtle transition-colors cursor-pointer"
        title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
      >
        {#if darkMode}
          <Sun class="w-4 h-4 text-amber-400" />
        {:else}
          <Moon class="w-4 h-4" />
        {/if}
      </button>

      {#if user}
        <!-- User Profile Pill -->
        <div class="flex items-center gap-2 pl-2 border-l border-surface-subtle">
          <div class="w-8 h-8 rounded-full bg-note-amber-bg border border-note-amber-border text-note-amber-text font-bold text-xs flex items-center justify-center uppercase">
            {getUserInitials(user.displayName || user.email)}
          </div>
          <div class="hidden md:flex flex-col text-left">
            <span class="text-xs font-semibold text-content-primary truncate max-w-[130px]">
              {user.displayName || user.email?.split('@')[0]}
            </span>
            <span class="text-[10px] text-content-muted truncate max-w-[130px]">
              {user.email}
            </span>
          </div>
        </div>

        <!-- Logout Action Button -->
        <Button variant="ghost" size="sm" onclick={onLogout} class="gap-1.5 text-xs text-note-rose-accent hover:bg-note-rose-bg/40">
          <LogOut class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Keluar</span>
        </Button>
      {/if}
    </div>
  </div>
</nav>
