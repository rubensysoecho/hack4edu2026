<script setup lang="ts">
/**
 * Lista de informes guardados. Cada fila es un snapshot congelado:
 * el panel y el informe de un cuestionario en un momento concreto.
 */

import { onMounted, ref } from "vue";
import { formatDate, texts } from "../texts";

type ReportSummary = {
  id: string;
  instrument_id: string;
  title: string;
  source: "ai" | "fallback";
  response_count: number;
  dimension_count: number;
  axis_count: number;
  created_at: string;
};

const emit = defineEmits<{
  "open-report": [id: string];
  "new-instrument": [];
}>();

const reports = ref<ReportSummary[]>([]);
const loading = ref(true);
const error = ref(false);
const confirmingId = ref<string | null>(null);
const deletingId = ref<string | null>(null);
const deleteError = ref(false);

async function removeReport(id: string) {
  deletingId.value = id;
  deleteError.value = false;

  try {
    const response = await fetch(`/api/reports/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(String(response.status));

    reports.value = reports.value.filter((report) => report.id !== id);
    confirmingId.value = null;
  } catch {
    deleteError.value = true;
  } finally {
    deletingId.value = null;
  }
}

onMounted(async () => {
  try {
    const response = await fetch("/api/reports");
    if (!response.ok) throw new Error(String(response.status));
    reports.value = (await response.json()) as ReportSummary[];
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main id="main" class="page" tabindex="-1">
    <header class="header">
      <h1>{{ texts.reports.title }}</h1>
      <p class="subtitle">{{ texts.reports.subtitle }}</p>
    </header>

    <p v-if="loading" class="status">{{ texts.states.loading }}</p>
    <p v-else-if="error" class="status error">{{ texts.states.error }}</p>

    <section v-else-if="reports.length === 0" class="empty">
      <h2>{{ texts.reports.empty }}</h2>
      <p>{{ texts.reports.emptyDetail }}</p>
      <button type="button" class="button" @click="emit('new-instrument')">
        {{ texts.reports.newInstrument }}
      </button>
    </section>

    <ul v-else class="grid">
      <li v-for="report in reports" :key="report.id" class="card">
        <div class="report-card-head">
          <h2 class="card-title">{{ report.title }}</h2>
          <span class="ai-badge" :class="report.source">
            {{
              report.source === "ai"
                ? texts.report.withAi
                : texts.report.automatic
            }}
          </span>
        </div>

        <p class="card-meta">{{ formatDate(report.created_at) }}</p>
        <p class="card-meta">
          {{
            texts.reports.summary(
              report.response_count,
              report.dimension_count,
              report.axis_count,
            )
          }}
        </p>

        <div class="report-actions">
          <button
            type="button"
            class="link"
            @click="emit('open-report', report.id)"
          >
            {{ texts.reports.view }}
          </button>
          <button
            type="button"
            class="link report-delete"
            :disabled="deletingId === report.id"
            @click="confirmingId = report.id"
          >
            {{ texts.reports.delete }}
          </button>
        </div>

        <div
          v-if="confirmingId === report.id"
          class="report-confirm"
          role="alert"
        >
          <p>{{ texts.reports.deleteConfirm }}</p>
          <div class="actions">
            <button
              type="button"
              class="button-secondary small"
              :disabled="deletingId === report.id"
              @click="confirmingId = null"
            >
              {{ texts.instruments.cancel }}
            </button>
            <button
              type="button"
              class="button small"
              :disabled="deletingId === report.id"
              @click="removeReport(report.id)"
            >
              {{
                deletingId === report.id
                  ? texts.reports.deleting
                  : texts.reports.deleteYes
              }}
            </button>
          </div>
        </div>
      </li>
    </ul>

    <p v-if="deleteError" class="status error">
      {{ texts.reports.deleteError }}
    </p>
  </main>
</template>
