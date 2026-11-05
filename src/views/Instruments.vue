<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { texts } from "../texts";
import FormPreview from "../FormPreview.vue";

type Summary = {
  id: string;
  title: string;
  created_at: string;
  question_count: number;
  response_count: number;
  dimensions: string | null;
};

type Catalog = {
  groups: string[];
  dimensions: {
    id: string;
    group: string;
    name: string;
    description: string;
    questions: { code: string; statement: string }[];
  }[];
  axes: { id: string; name: string; description: string; values: string[] }[];
};

const emit = defineEmits<{ "open-report": [id: string] }>();

const list = ref<Summary[]>([]);
const catalog = ref<Catalog | null>(null);
const loading = ref(true);

const creating = ref(false);
const title = ref("");
const selection = ref<string[]>([]);
const axisSelection = ref<string[]>([
  "genero",
  "edad",
  "idioma",
  "ubicacion",
]);
const saving = ref(false);
const generateError = ref(false);
const openingId = ref<string | null>(null);
const openError = ref(false);

/** Dimensiones elegidas, en el orden del catálogo. */
const selectedDimensions = computed(() =>
  (catalog.value?.dimensions ?? []).filter((dimension) =>
    selection.value.includes(dimension.id),
  ),
);

/** Ejes elegidos, en el orden del catálogo. */
const selectedAxes = computed(() =>
  (catalog.value?.axes ?? []).filter((axis) =>
    axisSelection.value.includes(axis.id),
  ),
);

const questionCount = computed(() =>
  selectedDimensions.value.reduce(
    (total, dimension) => total + dimension.questions.length,
    0,
  ),
);

/** Dimensiones agrupadas por cabecera, en el orden del catálogo. */
const blocks = computed(() =>
  texts.groupOrder
    .map((group) => ({
      group,
      name: texts.groups[group] ?? group,
      dimensions: (catalog.value?.dimensions ?? []).filter(
        (d) => d.group === group,
      ),
    }))
    .filter((b) => b.dimensions.length > 0),
);

const canGenerate = computed(
  () =>
    title.value.trim().length > 0 &&
    questionCount.value > 0 &&
    !saving.value,
);

async function loadList() {
  const response = await fetch("/api/instruments");
  if (response.ok) list.value = (await response.json()) as Summary[];
}

onMounted(async () => {
  try {
    const [catalogResponse] = await Promise.all([
      fetch("/api/catalog"),
      loadList(),
    ]);
    if (catalogResponse.ok) {
      catalog.value = (await catalogResponse.json()) as Catalog;
    }
  } finally {
    loading.value = false;
  }
});

function open() {
  creating.value = true;
  generateError.value = false;
  title.value = "";
  selection.value = [];
  axisSelection.value = ["genero", "edad", "idioma", "ubicacion"];
}

async function createReport(instrumentId: string): Promise<string> {
  const response = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instrumentId }),
  });

  if (!response.ok) throw new Error(String(response.status));

  const report = (await response.json()) as { id: string };
  return report.id;
}

/**
 * Crea el cuestionario, lo rellena con respuestas sintéticas y guarda su
 * primer informe. El servidor hace la creación y la simulación juntas.
 */
async function generate() {
  saving.value = true;
  generateError.value = false;

  try {
    const response = await fetch("/api/instruments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.value,
        dimensions: selection.value,
        axes: axisSelection.value,
        demo: true,
      }),
    });

    if (!response.ok) throw new Error(String(response.status));

    const instrument = (await response.json()) as { id: string };

    let reportId: string;
    try {
      reportId = await createReport(instrument.id);
    } catch {
      // El cuestionario ya existe: se cierra el constructor y se ofrece
      // reintentar desde su ficha.
      creating.value = false;
      await loadList();
      openError.value = true;
      return;
    }

    creating.value = false;
    emit("open-report", reportId);
  } catch {
    generateError.value = true;
  } finally {
    saving.value = false;
  }
}

/** Abre el informe de un cuestionario existente; lo crea si aún no existe. */
async function openReport(instrumentId: string) {
  openingId.value = instrumentId;
  openError.value = false;

  try {
    const reportId = await createReport(instrumentId);
    emit("open-report", reportId);
  } catch {
    openError.value = true;
  } finally {
    openingId.value = null;
  }
}
</script>

<template>
  <main id="main" class="page" tabindex="-1">
    <header class="header">
      <h1>{{ texts.instruments.title }}</h1>
      <p class="subtitle">{{ texts.instruments.subtitle }}</p>
    </header>

    <p v-if="loading" class="status">{{ texts.states.loading }}</p>

    <template v-else>
      <button v-if="!creating" type="button" class="button" @click="open">
        {{ texts.instruments.newInstrument }}
      </button>

      <section v-if="creating" class="builder">
        <h2 class="builder-title">{{ texts.instruments.newInstrument }}</h2>

        <div class="builder-layout">
          <div class="builder-form">
            <label class="field">
              <span class="field-label step-label">
                <span class="step-number" aria-hidden="true">1</span>
                {{ texts.instruments.titleLabel }}
              </span>
              <input
                v-model="title"
                type="text"
                class="field-input"
                :placeholder="texts.instruments.titleHelp"
              />
            </label>

            <fieldset class="field-group">
              <legend class="step-legend">
                <span class="step-number" aria-hidden="true">2</span>
                {{ texts.instruments.whatToMeasure }}
              </legend>
              <p class="help">{{ texts.instruments.whatToMeasureHelp }}</p>

              <div
                v-for="b in blocks"
                :key="b.group"
                class="option-block"
                role="group"
                :aria-label="b.name"
              >
                <p class="block-title">{{ b.name }}</p>

                <label
                  v-for="d in b.dimensions"
                  :key="d.id"
                  class="option"
                  :class="{ selected: selection.includes(d.id) }"
                >
                  <input v-model="selection" type="checkbox" :value="d.id" />
                  <span class="option-name">{{ d.name }}</span>
                  <span class="option-description">{{ d.description }}</span>
                </label>
              </div>
            </fieldset>

            <fieldset class="field-group">
              <legend class="step-legend">
                <span class="step-number" aria-hidden="true">3</span>
                {{ texts.instruments.compareWith }}
              </legend>
              <p class="help">{{ texts.instruments.compareWithHelp }}</p>

              <label
                v-for="e in catalog?.axes ?? []"
                :key="e.id"
                class="option"
                :class="{ selected: axisSelection.includes(e.id) }"
              >
                <input v-model="axisSelection" type="checkbox" :value="e.id" />
                <span class="option-name">{{ e.name }}</span>
                <span class="option-description">{{ e.description }}</span>
              </label>
            </fieldset>
          </div>

          <FormPreview
            :title="title"
            :dimensions="selectedDimensions"
            :axes="selectedAxes"
          />
        </div>

        <div class="builder-footer">
          <p v-if="generateError" class="builder-error" role="alert">
            {{ texts.instruments.generateError }}
          </p>

          <p class="question-count">
            {{ texts.instruments.questions(questionCount) }}
          </p>

          <div class="actions">
            <button
              type="button"
              class="button-secondary"
              @click="creating = false"
            >
              {{ texts.instruments.cancel }}
            </button>
            <button
              type="button"
              class="button"
              :disabled="!canGenerate"
              @click="generate"
            >
              {{
                saving
                  ? texts.instruments.generating
                  : texts.instruments.generate
              }}
            </button>
          </div>
        </div>
      </section>

      <p v-if="!creating && list.length === 0" class="status">
        {{ texts.instruments.empty }}
      </p>

      <ul v-else-if="list.length > 0" class="grid">
        <li v-for="i in list" :key="i.id" class="card">
          <h2 class="card-title">{{ i.title }}</h2>
          <p class="card-meta">
            {{ texts.instruments.questions(i.question_count) }} ·
            {{
              i.response_count === 0
                ? texts.instruments.noResponses
                : texts.instruments.responses(i.response_count)
            }}
          </p>

          <button
            type="button"
            class="link"
            :disabled="openingId === i.id"
            @click="openReport(i.id)"
          >
            {{
              openingId === i.id
                ? texts.reports.preparing
                : texts.instruments.viewGaps
            }}
          </button>
        </li>
      </ul>

      <p v-if="openError" class="status error">
        {{ texts.reports.prepareError }}
      </p>
    </template>
  </main>
</template>
