<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { activeInstrument } from "../state";
import { texts } from "../texts";

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
    questions: { code: string }[];
  }[];
  axes: { id: string; name: string; description: string; values: string[] }[];
};

const emit = defineEmits<{ "view-gaps": [] }>();

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
const createError = ref(false);

const created = ref<{ id: string; question_count: number } | null>(null);
const simulating = ref(false);

const questionCount = computed(
  () =>
    catalog.value?.dimensions
      .filter((d) => selection.value.includes(d.id))
      .reduce((total, d) => total + d.questions.length, 0) ?? 0,
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

const canCreate = computed(
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
  created.value = null;
  createError.value = false;
  title.value = "";
  selection.value = [];
  axisSelection.value = ["genero", "edad", "idioma", "ubicacion"];
}

async function create() {
  saving.value = true;
  createError.value = false;

  try {
    const response = await fetch("/api/instruments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.value,
        dimensions: selection.value,
        axes: axisSelection.value,
      }),
    });

    if (!response.ok) throw new Error(String(response.status));

    created.value = (await response.json()) as {
      id: string;
      question_count: number;
    };
    creating.value = false;
    await loadList();
  } catch {
    createError.value = true;
  } finally {
    saving.value = false;
  }
}

async function simulate(id: string) {
  simulating.value = true;
  try {
    await fetch(`/api/instruments/${id}/simulate`, { method: "POST" });
    await loadList();
  } finally {
    simulating.value = false;
  }
}

function viewGaps(id: string) {
  activeInstrument.value = id;
  emit("view-gaps");
}
</script>

<template>
  <main class="page">
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
        <label class="field">
          <span class="field-label">{{ texts.instruments.titleLabel }}</span>
          <input
            v-model="title"
            type="text"
            class="field-input"
            :placeholder="texts.instruments.titleHelp"
          />
        </label>

        <fieldset class="field-group">
          <legend>{{ texts.instruments.whatToMeasure }}</legend>
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
          <legend>{{ texts.instruments.compareWith }}</legend>
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

        <div class="builder-footer">
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
              :disabled="!canCreate"
              @click="create"
            >
              {{
                saving ? texts.instruments.creating : texts.instruments.create
              }}
            </button>
          </div>
        </div>

        <p v-if="createError" class="status error">
          {{ texts.instruments.createError }}
        </p>
      </section>

      <section v-if="created" class="confirmation">
        <h2>{{ texts.instruments.created }}</h2>
        <p>
          {{ texts.instruments.questions(created.question_count) }} ·
          {{ texts.instruments.createdDetail }}
        </p>
        <div class="actions">
          <button
            type="button"
            class="button-secondary"
            :disabled="simulating"
            @click="simulate(created.id)"
          >
            {{
              simulating
                ? texts.instruments.simulating
                : texts.instruments.simulate
            }}
          </button>
          <button type="button" class="button" @click="viewGaps(created.id)">
            {{ texts.instruments.viewGaps }}
          </button>
        </div>
      </section>

      <p v-if="list.length === 0" class="status">
        {{ texts.instruments.empty }}
      </p>

      <ul v-else class="grid">
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

          <button type="button" class="link" @click="viewGaps(i.id)">
            {{ texts.instruments.viewGaps }}
          </button>
        </li>
      </ul>
    </template>
  </main>
</template>
