<script lang="ts">
  import { AuthLayout } from "../components/templates";
  import { Button, Input } from "../components/atoms";
  import {
    authStore,
    authLoading,
    authError,
    isEmailVerificationPending,
    pendingVerificationEmail,
    resendCooldown,
    verificationMessage,
    pendingFormData,
  } from "../lib/stores/auth.store";
  import {
    Mail,
    AlertCircle,
    CheckCircle2,
    RotateCw,
    ShieldCheck,
    ArrowLeft,
    Check,
    Loader2,
  } from "lucide-svelte";

  interface Props {
    onNavigateLogin?: () => void;
  }

  let { onNavigateLogin }: Props = $props();

  let displayName = $state("");
  let email = $state("");
  let password = $state("");
  let confirmPassword = $state("");

  let displayNameError = $state("");
  let emailError = $state("");
  let passwordError = $state("");
  let confirmPasswordError = $state("");

  // Restore form fields from stored pendingFormData when returning from verification screen
  $effect(() => {
    const formData = $pendingFormData;
    if (formData && !$isEmailVerificationPending) {
      if (formData.displayName && !displayName)
        displayName = formData.displayName;
      if (formData.email && !email) email = formData.email;
    }
  });

  async function handleRegister(e: SubmitEvent) {
    e.preventDefault();
    displayNameError = "";
    emailError = "";
    passwordError = "";
    confirmPasswordError = "";
    authStore.clearError();

    const cleanName = displayName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      displayNameError = "Nama lengkap wajib diisi!";
      return;
    }
    if (cleanName.length < 2) {
      displayNameError = "Nama lengkap minimal 2 karakter!";
      return;
    }
    if (!cleanEmail) {
      emailError = "Email wajib diisi!";
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      emailError =
        "Format alamat email tidak valid (contoh: joe.biden@domain.com)!";
      return;
    }
    if (!password) {
      passwordError = "Kata sandi wajib diisi!";
      return;
    }
    if (password.length < 6) {
      passwordError = "Kata sandi minimal 6 karakter!";
      return;
    }
    if (password !== confirmPassword) {
      confirmPasswordError = "Konfirmasi kata sandi tidak cocok!";
      return;
    }

    await authStore.signUp(cleanEmail, password, cleanName);
  }

  async function handleCheckVerification() {
    await authStore.checkEmailVerificationStatus();
  }

  async function handleResendEmail() {
    if ($resendCooldown > 0 || $authLoading) return;
    await authStore.resendVerificationEmail();
  }

  async function handleCancelVerification() {
    await authStore.cancelVerification();
  }
</script>

<AuthLayout
  title={$isEmailVerificationPending
    ? "Verifikasi Email Anda"
    : "Daftar Akun Baru"}
  subtitle={$isEmailVerificationPending
    ? "Email verifikasi resmi dari Google Firebase telah dikirim ke inbox Anda."
    : "Daftar resmi di Firebase Authentication dengan verifikasi email bawaan."}
>
  {#if $isEmailVerificationPending}
    <!-- Screen: Menunggu Verifikasi Email Bawaan Firebase -->
    <div class="flex flex-col gap-4">
      <!-- Error notification banner -->
      {#if $authError}
        <div
          class="flex items-start gap-2.5 p-3 rounded-xl bg-note-rose-bg text-note-rose-text border border-note-rose-border text-xs"
        >
          <AlertCircle class="w-4 h-4 text-note-rose-accent shrink-0 mt-0.5" />
          <span class="leading-relaxed">{$authError}</span>
        </div>
      {/if}

      <!-- Success / Informational message banner -->
      {#if $verificationMessage}
        <div
          class="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs"
        >
          <Check
            class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
          />
          <span class="leading-relaxed">{$verificationMessage}</span>
        </div>
      {/if}

      <!-- Target Email Badge -->
      <div
        class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-3 overflow-hidden">
          <div
            class="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0"
          >
            <Mail class="w-5 h-5" />
          </div>
          <div class="truncate">
            <span
              class="text-[10px] uppercase font-mono tracking-wider text-amber-800 dark:text-amber-300 block leading-tight font-semibold"
            >
              Email Verifikasi Dikirim ke:
            </span>
            <span
              class="text-xs font-bold text-content-primary truncate block mt-0.5"
            >
              {$pendingVerificationEmail || email}
            </span>
          </div>
        </div>
      </div>

      <!-- Step-by-Step Instructions -->
      <div
        class="p-4 rounded-2xl bg-surface-subtle/30 border border-surface-subtle text-xs text-content-secondary space-y-2.5"
      >
        <div class="flex items-center gap-2 font-semibold text-content-primary">
          <ShieldCheck class="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Langkah Verifikasi Akun:</span>
        </div>
        <ol
          class="list-decimal list-inside space-y-1.5 leading-relaxed text-[11.5px] pl-1"
        >
          <li>Buka kotak masuk atau folder spam email Anda.</li>
          <li>
            Buka email resmi dari <strong>Google Firebase</strong> (<span
              class="font-mono text-[10px]"
              >noreply@afl2-7e2a5.firebaseapp.com</span
            >).
          </li>
          <li>Klik tautan / link aktivasi di dalam email tersebut.</li>
          <li>
            Kembali ke halaman ini. Sistem akan mendeteksi otomatis status
            verifikasi Anda!
          </li>
        </ol>

        <!-- Auto-detection pulse indicator -->
        <div
          class="pt-2 flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300 font-medium"
        >
          <Loader2
            class="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400"
          />
          <span>Mendeteksi status verifikasi secara realtime...</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col gap-2.5 pt-1">
        <!-- Manual Check Button -->
        <Button
          type="button"
          variant="primary"
          size="lg"
          class="w-full"
          loading={$authLoading}
          disabled={$authLoading}
          onclick={handleCheckVerification}
        >
          <CheckCircle2 class="w-4 h-4" />
          <span>Saya Sudah Klik Link Verifikasi</span>
        </Button>

        <!-- Resend and Navigation Row -->
        <div
          class="flex items-center justify-between text-xs text-content-secondary pt-1 px-1"
        >
          <button
            type="button"
            onclick={handleCancelVerification}
            disabled={$authLoading}
            class="text-content-secondary hover:text-content-primary transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft class="w-3.5 h-3.5" />
            <span>Ganti Email / Batal</span>
          </button>

          <div>
            {#if $resendCooldown > 0}
              <span class="font-mono text-content-muted text-[11px]">
                Kirim ulang ({$resendCooldown}s)
              </span>
            {:else}
              <button
                type="button"
                onclick={handleResendEmail}
                disabled={$authLoading}
                class="font-semibold text-note-amber-accent hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RotateCw class="w-3.5 h-3.5" />
                <span>Kirim Ulang Email</span>
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Screen: Form Pendaftaran Awal -->
    <form onsubmit={handleRegister} class="flex flex-col gap-4">
      <!-- Error banner -->
      {#if $authError}
        <div
          class="flex items-start gap-2.5 p-3 rounded-xl bg-note-rose-bg text-note-rose-text border border-note-rose-border text-xs"
        >
          <AlertCircle class="w-4 h-4 text-note-rose-accent shrink-0 mt-0.5" />
          <span class="leading-relaxed">{$authError}</span>
        </div>
      {/if}

      <!-- Notice regarding official Firebase email verification -->
      <div
        class="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2"
      >
        <Mail
          class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
        />
        <span class="leading-relaxed text-[11.5px]">
          Server <strong>Google Firebase</strong> akan otomatis mengirimkan email
          verifikasi resmi ke alamat email Anda setelah mendaftar.
        </span>
      </div>

      <!-- Name Field -->
      <Input
        label="Nama Lengkap"
        placeholder="Joe Biden"
        bind:value={displayName}
        errorMessage={displayNameError}
        required
        disabled={$authLoading}
        oninput={() => {
          if (displayNameError) displayNameError = "";
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
          if (emailError) emailError = "";
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
          if (passwordError) passwordError = "";
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
          if (confirmPasswordError) confirmPasswordError = "";
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
        <Mail class="w-4 h-4" />
        <span>Daftar & Kirim Email Verifikasi</span>
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
  {/if}
</AuthLayout>
