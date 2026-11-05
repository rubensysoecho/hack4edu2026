<script setup lang="ts">
import { ref } from "vue";
import Logo from "./Logo.vue";
import Landing from "./views/Landing.vue";
import Gaps from "./views/Gaps.vue";
import Instruments from "./views/Instruments.vue";
import { texts } from "./texts";

type View = "landing" | "gaps" | "instruments";

const view = ref<View>("landing");
</script>

<template>
  <a v-if="view !== 'landing'" class="skip-link" href="#main">
    {{ texts.nav.skip }}
  </a>

  <Landing v-if="view === 'landing'" @enter="view = 'gaps'" />

  <template v-else>
    <header class="topbar">
      <button type="button" class="brand" @click="view = 'gaps'">
        <Logo :size="26" />
        <span>{{ texts.app }}</span>
      </button>

      <nav class="nav" :aria-label="texts.nav.label">
        <button
          type="button"
          :class="{ active: view === 'gaps' }"
          :aria-current="view === 'gaps' ? 'page' : undefined"
          @click="view = 'gaps'"
        >
          {{ texts.nav.gaps }}
        </button>
        <button
          type="button"
          :class="{ active: view === 'instruments' }"
          :aria-current="view === 'instruments' ? 'page' : undefined"
          @click="view = 'instruments'"
        >
          {{ texts.nav.instruments }}
        </button>
      </nav>
    </header>

    <Gaps v-if="view === 'gaps'" />
    <Instruments v-else @view-gaps="view = 'gaps'" />
  </template>
</template>
