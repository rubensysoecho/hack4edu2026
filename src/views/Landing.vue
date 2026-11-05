<script setup lang="ts">
import Logo from "../Logo.vue";
import { texts } from "../texts";

defineEmits<{ enter: [] }>();
</script>

<template>
  <main class="landing">
    <div class="landing-inner">
      <div class="brand-large">
        <Logo :size="56" />
        <span class="brand-name">{{ texts.entry.brand }}</span>
      </div>

      <h1 class="landing-title">{{ texts.entry.title }}</h1>

      <p class="landing-text">{{ texts.entry.text }}</p>

      <button type="button" class="button" @click="$emit('enter')">
        {{ texts.entry.button }}
      </button>
    </div>

    <p class="landing-footer">{{ texts.entry.footer }}</p>
  </main>
</template>
