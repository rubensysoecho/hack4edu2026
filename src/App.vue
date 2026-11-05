<script setup lang="ts">
import { ref } from "vue";
import Logo from "./Logo.vue";
import Landing from "./views/Landing.vue";
import Gaps from "./views/Gaps.vue";
import Instruments from "./views/Instruments.vue";
import Reports from "./views/Reports.vue";
import { activeReport } from "./state";
import { texts } from "./texts";

type View = "landing" | "reports" | "report" | "instruments";

const view = ref<View>("landing");

function openReport(id: string) {
  activeReport.value = id;
  view.value = "report";
}
</script>

<template>
  <a v-if="view !== 'landing'" class="skip-link" href="#main">
    {{ texts.nav.skip }}
  </a>

  <Landing v-if="view === 'landing'" @enter="view = 'reports'" />

  <template v-else>
    <header class="topbar">
      <button type="button" class="brand" @click="view = 'reports'">
        <Logo :size="26" />
        <span>{{ texts.app }}</span>
      </button>

      <nav class="nav" :aria-label="texts.nav.label">
        <button
          type="button"
          :class="{ active: view === 'reports' || view === 'report' }"
          :aria-current="
            view === 'reports' || view === 'report' ? 'page' : undefined
          "
          @click="view = 'reports'"
        >
          {{ texts.nav.reports }}
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

    <Reports
      v-if="view === 'reports'"
      @open-report="openReport"
      @new-instrument="view = 'instruments'"
    />
    <Gaps v-else-if="view === 'report'" @back-reports="view = 'reports'" />
    <Instruments v-else @open-report="openReport" />
  </template>
</template>
