<script setup lang="ts">
import { useId } from "vue";

withDefaults(defineProps<{ size?: number }>(), { size: 24 });

const id = useId();
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <mask :id="`notch-${id}`">
        <rect width="32" height="32" fill="#fff" />
        <circle cx="30" cy="30" r="10" fill="#000" />
      </mask>
    </defs>
    <circle
      cx="16"
      cy="16"
      r="11.5"
      stroke="currentColor"
      stroke-width="3"
      :mask="`url(#notch-${id})`"
    />
  </svg>
</template>
