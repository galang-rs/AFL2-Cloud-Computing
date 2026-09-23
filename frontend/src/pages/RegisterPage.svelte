<script lang="ts">
  import { AuthLayout } from '../components/templates';
  import { Button, Input } from '../components/atoms';
  import { authStore, authLoading, authError } from '../lib/stores/auth.store';
  import { UserPlus, AlertCircle } from 'lucide-svelte';

  interface Props {
    onNavigateLogin?: () => void;
  }

  let { onNavigateLogin }: Props = $props();

  let displayName = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');

  let displayNameError = $state('');
  let emailError = $state('');
  let passwordError = $state('');
  let confirmPasswordError = $state('');

  async function handleRegister(e: SubmitEvent) {
    e.preventDefault();
    displayNameError = '';
    emailError = '';
    passwordError = '';
    confirmPasswordError = '';

    if (!displayName.trim()) {
      displayNameError = 'Nama lengkap wajib diisi!';
      return;
    }
    if (!email.trim()) {
      emailError = 'Email wajib diisi!';
      return;
    }
    if (!password) {
      passwordError = 'Kata sandi wajib diisi!';
      return;
    }
    if (password.length < 6) {
      passwordError = 'Kata sandi minimal 6 karakter!';
      return;
    }
    if (password !== confirmPassword) {
      confirmPasswordError = 'Konfirmasi kata sandi tidak cocok!';
      return;
    }

    await authStore.signUp(email.trim(), password, displayName.trim());
  }
</script>

<AuthLayout
  title="Daftar Akun Baru"
  subtitle="Mulai organisir tugas harian Anda dengan papan Kanban sticky notes."
>
  <form onsubmit={handleRegister} class="flex flex-col gap-4">
    <!-- Error banner -->
    {#if $authError}
      <div class="flex items-start gap-2.5 p-3 rounded-xl bg-note-rose-bg text-note-rose-text border border-note-rose-border text-xs">
        <AlertCircle class="w-4 h-4 text-note-rose-accent shrink-0 mt-0.5" />
        <span class="leading-relaxed">{$authError}</span>
      </div>
    {/if}

    <!-- Name Field -->
    <Input
      label="Nama Lengkap"
      placeholder="Joe Biden"
      bind:value={displayName}
      errorMessage={displayNameError}
      required
      disabled={$authLoading}
      oninput={() => {
        if (displayNameError) displayNameError = '';
        authStore.clearError();
      }}
    />

    <!-- Email Field -->
    <Input
      type="email"
      label="Alamat Email"
      placeholder="joe.biden@student.ciputra.ac.id"
      bind:value={email}
      errorMessage={emailError}
      required
      disabled={$authLoading}
      oninput={() => {
        if (emailError) emailError = '';
        authStore.clearError();
      }}
    />

    <!-- Password Field -->
    <Input
      type="password"
      label="Kata Sandi (Minimal 6 Karakter)"
      placeholder="••••••••"
      bind:value={password}
      errorMessage={passwordError}
      required
      disabled={$authLoading}
      oninput={() => {
        if (passwordError) passwordError = '';
        authStore.clearError();
      }}
    />

    <!-- Confirm Password Field -->
    <Input
      type="password"
      label="Konfirmasi Kata Sandi"
      placeholder="••••••••"
      bind:value={confirmPassword}
      errorMessage={confirmPasswordError}
      required
      disabled={$authLoading}
      oninput={() => {
        if (confirmPasswordError) confirmPasswordError = '';
        authStore.clearError();
      }}
    />

    <!-- Submit Button -->
    <Button
      type="submit"
      variant="primary"
      size="lg"
      class="w-full mt-2"
      loading={$authLoading}
      disabled={$authLoading}
    >
      <UserPlus class="w-4 h-4" />
      <span>Daftar Sekarang</span>
    </Button>

    <!-- Switch to Login -->
    <div class="text-center pt-2">
      <p class="text-xs text-content-secondary">
        Sudah memiliki akun?
        <button
          type="button"
          onclick={onNavigateLogin}
          class="font-semibold text-note-amber-accent hover:underline ml-1 cursor-pointer"
        >
          Masuk ke akun
        </button>
      </p>
    </div>
  </form>
</AuthLayout>
