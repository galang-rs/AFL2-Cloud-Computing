<script lang="ts">
  interface Props {
    color?: 'crimson' | 'gold' | 'brass' | 'silver';
    class?: string;
  }

  let {
    color = 'crimson',
    class: customClass = '',
  }: Props = $props();

  // Pushpin colors: crimson, gold, brass, silver
  const pinGradients: Record<string, { top: string; base: string; needle: string; shadow: string }> = {
    crimson: {
      top: '#dc2626',
      base: '#991b1b',
      needle: '#94a3b8',
      shadow: 'rgba(153, 27, 27, 0.4)',
    },
    gold: {
      top: '#fbbf24',
      base: '#b45309',
      needle: '#94a3b8',
      shadow: 'rgba(180, 83, 9, 0.4)',
    },
    brass: {
      top: '#d97706',
      base: '#78350f',
      needle: '#64748b',
      shadow: 'rgba(120, 53, 15, 0.4)',
    },
    silver: {
      top: '#cbd5e1',
      base: '#64748b',
      needle: '#475569',
      shadow: 'rgba(100, 116, 139, 0.4)',
    },
  };

  let palette = $derived(pinGradients[color] || pinGradients.crimson);
</script>

<div class="relative flex items-center justify-center {customClass}">
  <svg
    class="w-6 h-6 filter drop-shadow-sm transition-transform hover:scale-110"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Pushpin needle -->
    <path
      d="M16 18L16 28"
      stroke={palette.needle}
      stroke-width="2"
      stroke-linecap="round"
    />
    <!-- Pushpin body base -->
    <ellipse cx="16" cy="18" rx="6" ry="2.5" fill={palette.base} />
    <!-- Pushpin body waist -->
    <path
      d="M11 10C11 14 13 17 16 17C19 17 21 14 21 10Z"
      fill={palette.base}
    />
    <!-- Pushpin head highlight -->
    <circle cx="16" cy="9" r="6" fill={palette.top} />
    <!-- Pushpin gloss shine -->
    <ellipse cx="14.5" cy="7.5" rx="2" ry="1.2" fill="#ffffff" fill-opacity="0.6" />
  </svg>
</div>
