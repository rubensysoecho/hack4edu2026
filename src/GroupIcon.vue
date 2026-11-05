<script setup lang="ts">
defineProps<{ group: string }>();
</script>

<template>
  <svg
    class="group-icon"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="group === 'acceso'">
      <rect x="2.5" y="3.5" width="15" height="10" rx="1.5" />
      <path d="M7 17h6M10 13.5V17" />
    </template>

    <template v-else-if="group === 'barreras'">
      <circle cx="10" cy="4" r="1.7" />
      <path d="M3.5 7.5 10 9l6.5-1.5M10 9v4.2m0 0L7 17.5M10 13.2l3 4.3" />
    </template>

    <template v-else>
      <circle cx="7.2" cy="6.6" r="2.3" />
      <path d="M2.8 16.2c0-2.4 2-4.2 4.4-4.2s4.4 1.8 4.4 4.2" />
      <path d="M13.2 5.1a2.2 2.2 0 0 1 0 4.3M14.3 12.4c1.8.4 2.9 1.8 2.9 3.8" />
    </template>
  </svg>
</template>
