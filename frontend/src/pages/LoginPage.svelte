<script lang="ts">
  import { AuthLayout } from '../components/templates';
  import { Button, Input } from '../components/atoms';
  import { authStore, authLoading, authError } from '../lib/stores/auth.store';
  import { LogIn, Sparkles, AlertCircle, FileText } from 'lucide-svelte';

  interface Props {
    onNavigateRegister?: () => void;
  }

  let { onNavigateRegister }: Props = $props();

  // Inputs start clean & reactive, no hardcoded overriding on refresh or failed attempt
  let email = $state('');
  let password = $state('');
  let emailError = $state('');
  let passwordError = $state('');

  async function handleLogin(e: SubmitEvent) {
    e.preventDefault();
    emailError = '';
    passwordError = '';

    if (!email.trim()) {
      emailError = 'Email wajib diisi!';
      return;
    }
    if (!password) {
      passwordError = 'Kata sandi wajib diisi!';
      return;
    }

    await authStore.signIn(email.trim(), password);
  }

  async function handleDemoLogin() {
    await authStore.signInDemo('dosen@ciputra.ac.id', 'Elizabeth Nathania Wintanto');
  }
</script>

<AuthLayout
  title="Masuk ke Akun Anda"
  subtitle="Kelola agenda tugas harian Anda di papan catatan interaktif."
>
  <form onsubmit={handleLogin} class="flex flex-col gap-4">
    <!-- Error notification banner -->
    {#if $authError}
      <div class="flex items-start gap-2.5 p-3 rounded-xl bg-note-rose-bg text-note-rose-text border border-note-rose-border text-xs">
        <AlertCircle class="w-4 h-4 text-note-rose-accent shrink-0 mt-0.5" />
        <span class="leading-relaxed">{$authError}</span>
      </div>
    {/if}

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
      label="Kata Sandi"
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

    <!-- Submit Button -->
    <Button
      type="submit"
      variant="primary"
      size="lg"
      class="w-full mt-1"
      loading={$authLoading}
      disabled={$authLoading}
    >
      <LogIn class="w-4 h-4" />
      <span>Masuk</span>
    </Button>

    <!-- Demo Section for Dosen Elizabeth Nathania Wintanto -->
    <div class="relative flex items-center justify-center my-1">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-surface-subtle"></div>
      </div>
      <span class="relative px-3 bg-surface-panel text-[11px] font-mono text-content-muted uppercase">
        Khusus Evaluasi Dosen Penguji
      </span>
    </div>

    <!-- Notepad Notice for Dosen Evaluation Flow -->
    <div class="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-700/50 text-xs shadow-sm">
      <div class="flex items-start gap-2.5">
        <div class="p-1 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 shrink-0 mt-0.5">
          <FileText class="w-3.5 h-3.5" />
        </div>
        <div class="leading-relaxed text-amber-950 dark:text-amber-200">
          <span class="font-semibold text-amber-900 dark:text-amber-100 block">
            Akun Evaluator Dosen (Elizabeth Nathania Wintanto):
          </span>
          <p class="mt-0.5 text-amber-800/90 dark:text-amber-300/90 text-[11.5px]">
            Akun Dosen terhubung langsung ke <strong>Firebase Realtime Database</strong> dengan 5 data tugas awal berkategori akademik & proyek. Bebas melakukan operasi <strong>CRUD</strong> secara realtime.
          </p>
          <p class="mt-1 text-[11px] font-medium text-amber-900 dark:text-amber-200">
            👉 <em>Untuk mendaftarkan akun mahasiswa baru, silakan gunakan tombol <strong>Daftar akun baru</strong> di bawah.</em>
          </p>
        </div>
      </div>
    </div>

    <!-- 1-Click Button for Dosen -->
    <Button
      type="button"
      variant="sticky"
      size="md"
      class="w-full text-xs font-semibold py-2.5"
      onclick={handleDemoLogin}
      disabled={$authLoading}
      loading={$authLoading}
    >
      <Sparkles class="w-4 h-4 text-amber-600" />
      <span>1-Klik Masuk Akun Dosen (Elizabeth Nathania Wintanto)</span>
    </Button>

    <!-- Switch to Register -->
    <div class="text-center pt-1">
      <p class="text-xs text-content-secondary">
        Belum memiliki akun?
        <button
          type="button"
          onclick={onNavigateRegister}
          class="font-semibold text-note-amber-accent hover:underline ml-1 cursor-pointer"
        >
          Daftar akun baru (Alur Mahasiswa)
        </button>
      </p>
    </div>
  </form>
</AuthLayout>
