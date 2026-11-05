<script setup lang="ts">
import Logo from "../Logo.vue";
import { texts } from "../texts";

defineEmits<{ enter: [] }>();
</script>

<template>
  <main class="landing">
    <div class="landing-inner">
      <div class="landing-copy">
        <div class="brand-large">
          <Logo :size="40" />
          <span class="brand-name">{{ texts.entry.brand }}</span>
        </div>

        <h1 class="landing-title">{{ texts.entry.title }}</h1>

        <p class="landing-text">{{ texts.entry.text }}</p>

        <button
          type="button"
          class="button landing-button"
          @click="$emit('enter')"
        >
          {{ texts.entry.button }}
        </button>
      </div>

      <div class="landing-mark" aria-hidden="true">
        <Logo :size="180" />
      </div>
    </div>

    <p class="landing-footer">{{ texts.entry.footer }}</p>
  </main>
</template>
