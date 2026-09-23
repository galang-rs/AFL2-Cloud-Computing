<script lang="ts">
  import { Calendar, CheckCircle2, Clock, ListTodo } from 'lucide-svelte';

  interface Props {
    todoCount?: number;
    inProgressCount?: number;
    completedCount?: number;
    quote?: string;
    class?: string;
  }

  let {
    todoCount = 0,
    inProgressCount = 0,
    completedCount = 0,
    quote = 'Fokus pada hal terpenting hari ini, satu catatan demi satu langkah.',
    class: customClass = '',
  }: Props = $props();

  const daysIndonesian = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthsIndonesian = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const now = new Date();
  const dayName = daysIndonesian[now.getDay()];
  const dateFormatted = `${dayName}, ${now.getDate()} ${monthsIndonesian[now.getMonth()]} ${now.getFullYear()}`;
</script>

<div class="w-full bg-surface-panel border border-surface-subtle rounded-xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 {customClass}">
  <div class="flex flex-col gap-1.5 max-w-xl">
    <div class="flex items-center gap-2 text-note-amber-accent font-medium text-xs tracking-wider uppercase">
      <Calendar class="w-4 h-4" />
      <span>{dateFormatted}</span>
    </div>
    <h1 class="text-xl md:text-2xl font-bold text-content-primary tracking-tight">
      Papan Tugas Harian (Sticky Notes)
    </h1>
    <p class="text-xs md:text-sm text-content-secondary italic font-normal">
      "{quote}"
    </p>
  </div>

  <!-- Quick stats: Todo / In Progress / Completed count -->
  <div class="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
    <div class="flex items-center gap-2.5 px-3.5 py-2 bg-surface-subtle border border-surface-subtle rounded-lg min-w-[100px]">
      <div class="w-8 h-8 rounded-md bg-note-yellow-bg text-note-yellow-accent flex items-center justify-center">
        <ListTodo class="w-4 h-4" />
      </div>
      <div class="flex flex-col">
        <span class="text-[11px] font-semibold text-content-muted uppercase tracking-wider">Antrean</span>
        <span class="text-base font-bold text-content-primary leading-none">{todoCount}</span>
      </div>
    </div>

    <div class="flex items-center gap-2.5 px-3.5 py-2 bg-surface-subtle border border-surface-subtle rounded-lg min-w-[100px]">
      <div class="w-8 h-8 rounded-md bg-note-sky-bg text-note-sky-accent flex items-center justify-center">
        <Clock class="w-4 h-4" />
      </div>
      <div class="flex flex-col">
        <span class="text-[11px] font-semibold text-content-muted uppercase tracking-wider">Proses</span>
        <span class="text-base font-bold text-content-primary leading-none">{inProgressCount}</span>
      </div>
    </div>

    <div class="flex items-center gap-2.5 px-3.5 py-2 bg-surface-subtle border border-surface-subtle rounded-lg min-w-[100px]">
      <div class="w-8 h-8 rounded-md bg-note-emerald-bg text-note-emerald-accent flex items-center justify-center">
        <CheckCircle2 class="w-4 h-4" />
      </div>
      <div class="flex flex-col">
        <span class="text-[11px] font-semibold text-content-muted uppercase tracking-wider">Selesai</span>
        <span class="text-base font-bold text-content-primary leading-none">{completedCount}</span>
      </div>
    </div>
  </div>
</div>
