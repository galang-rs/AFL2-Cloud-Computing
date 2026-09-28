<script lang="ts">
  import { onMount } from 'svelte';
  import {
    authStore,
    isAuthenticated,
    authLoading,
    isEmailVerificationPending,
  } from './lib/stores/auth.store';
  import { LoginPage, RegisterPage, DashboardPage } from './pages';
  import { Loader2 } from 'lucide-svelte';

  // Route state: 'dashboard' | 'login' | 'register'
  let currentAuthRoute = $state<'login' | 'register'>('login');

  onMount(() => {
    authStore.init();
  });

  function navigateToRegister() {
    currentAuthRoute = 'register';
  }

  function navigateToLogin() {
    currentAuthRoute = 'login';
  }
</script>

{#if $authLoading}
  <!-- Splash Loading Screen -->
  <div class="min-h-screen w-full corkboard-surface flex flex-col items-center justify-center gap-3">
    <div class="p-4 bg-surface-panel/90 backdrop-blur rounded-2xl border border-surface-subtle shadow-xl flex items-center gap-3">
      <Loader2 class="w-6 h-6 animate-spin text-note-amber-accent" />
      <span class="text-sm font-semibold text-content-primary font-mono">
        Memuat Sticky Kanban...
      </span>
    </div>
  </div>
{:else if $isAuthenticated}
  <!-- Authenticated Main Application Flow (Email Verified) -->
  <DashboardPage />
{:else if currentAuthRoute === 'register' || $isEmailVerificationPending}
  <!-- Registration & Official Firebase Email Verification Screen -->
  <RegisterPage onNavigateLogin={navigateToLogin} />
{:else}
  <!-- Login Flow -->
  <LoginPage onNavigateRegister={navigateToRegister} />
{/if}
