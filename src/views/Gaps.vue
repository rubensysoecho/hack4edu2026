<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { activeInstrument } from "../state";
import { formatNumber, texts } from "../texts";

type GroupGap = {
  label: string;
  axes: Record<string, string>;
  n: number;
  suppressed: boolean;
  indices: Record<string, number | null>;
  gaps: Record<string, number | null>;
};

type Dimension = {
  dimension: string;
  group: string;
  n: number;
  index: number | null;
};

type Panel = {
  instrument: { id: string; title: string };
  total: number;
  k: number;
  dimensions: Dimension[];
  groups: GroupGap[];
};

const panel = ref<Panel | null>(null);
const loading = ref(true);
const error = ref(false);
const selectedDimension = ref("");

async function load() {
  loading.value = true;
  error.value = false;

  try {
    const query = activeInstrument.value
      ? `?instrument=${encodeURIComponent(activeInstrument.value)}`
      : "";
    const response = await fetch(`/api/panel${query}`);
    if (!response.ok) throw new Error(String(response.status));
    panel.value = (await response.json()) as Panel;
    const withData = panel.value.dimensions.find((d) => d.n > 0);
    selectedDimension.value =
      (withData ?? panel.value.dimensions[0])?.dimension ?? "";
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(activeInstrument, load);

const groups = computed(() =>
  [...(panel.value?.groups ?? [])].sort((a, b) => {
    const gapA = a.gaps[selectedDimension.value] ?? null;
    const gapB = b.gaps[selectedDimension.value] ?? null;
    if (gapA === null && gapB === null) return b.n - a.n;
    if (gapA === null) return 1;
    if (gapB === null) return -1;
    return gapB - gapA;
  }),
);

/** Cada eje por separado. No se cruzan ejes. */
const axisBlocks = computed(() => {
  const byAxis = new Map<string, GroupGap[]>();

  for (const group of groups.value) {
    const axis = Object.keys(group.axes)[0] ?? "";
    const list = byAxis.get(axis);
    if (list) list.push(group);
    else byAxis.set(axis, [group]);
  }

  return texts.axisOrder
    .filter((axis) => byAxis.has(axis))
    .map((axis) => ({
      axis,
      name: texts.axes[axis] ?? axis,
      groups: byAxis.get(axis)!,
    }));
});

const published = computed(() => groups.value.filter((g) => !g.suppressed));

/** La brecha más alta de la dimensión abierta: el grupo que queda más atrás. */
const largestGap = computed(() => {
  const values = published.value
    .map((g) => g.gaps[selectedDimension.value] ?? null)
    .filter((v): v is number => v !== null);

  if (values.length === 0) return null;
  return values.reduce((a, b) => (b > a ? b : a));
});

const maxAbsGap = computed(() =>
  Math.max(
    1,
    ...groups.value.map((g) => Math.abs(g.gaps[selectedDimension.value] ?? 0)),
  ),
);

const dimensionName = (d: string) => texts.dimensions[d] ?? d;
const groupName = (g: string) => texts.groups[g] ?? g;
const label = (key: string) => texts.labels[key] ?? key;

/** Dimensiones por cabecera: acceso, barreras, apoyo. */
const dimensionBlocks = computed(() =>
  texts.groupOrder
    .map((group) => ({
      group,
      name: groupName(group),
      dimensions: (panel.value?.dimensions ?? []).filter(
        (d) => d.group === group,
      ),
    }))
    .filter((b) => b.dimensions.length > 0),
);

function barWidth(value: number | null): number {
  if (value === null) return 0;
  return Math.max(2, (Math.abs(value) / maxAbsGap.value) * 50);
}
</script>

<template>
  <main class="page">
    <header class="header">
      <p v-if="panel" class="context">{{ panel.instrument.title }}</p>
      <h1>{{ texts.panel.title }}</h1>
      <p class="subtitle">{{ texts.panel.subtitle }}</p>
    </header>

    <p v-if="loading" class="status">{{ texts.states.loading }}</p>
    <p v-else-if="error" class="status error">{{ texts.states.error }}</p>

    <section v-else-if="panel && panel.total === 0" class="empty">
      <h2>{{ texts.panel.noData }}</h2>
      <p>{{ texts.panel.noDataDetail }}</p>
    </section>

    <template v-else-if="panel">
      <ul class="summary" :aria-label="texts.panel.summary">
        <li class="stat">
          <p class="stat-value">{{ panel.total }}</p>
          <p class="stat-label">{{ texts.panel.peopleLabel }}</p>
        </li>
        <li class="stat">
          <p class="stat-value">{{ published.length }}</p>
          <p class="stat-label">{{ texts.panel.groupsLabel }}</p>
        </li>
        <li class="stat">
          <p class="stat-value">{{ formatNumber(largestGap, true) }}</p>
          <p class="stat-label">{{ texts.panel.largestGap }}</p>
        </li>
      </ul>

      <div class="dimensions">
        <div
          v-for="b in dimensionBlocks"
          :key="b.group"
          class="dimension-block"
          role="group"
          :aria-label="b.name"
        >
          <p class="block-title">{{ b.name }}</p>

          <div class="chips">
            <button
              v-for="d in b.dimensions"
              :key="d.dimension"
              type="button"
              class="dimension"
              :class="{ active: d.dimension === selectedDimension }"
              :aria-pressed="d.dimension === selectedDimension"
              @click="selectedDimension = d.dimension"
            >
              {{ dimensionName(d.dimension) }}
              <span class="value">{{ formatNumber(d.index) }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="axes">
        <section
          v-for="b in axisBlocks"
          :key="b.axis"
          class="axis-block"
          :aria-label="b.name"
        >
          <h2 class="block-title">{{ b.name }}</h2>

          <ul class="rows">
            <li
              v-for="g in b.groups"
              :key="g.label"
              class="row"
              :class="{ suppressed: g.suppressed }"
            >
              <span class="row-name">
                {{ label(g.label) }}
                <span class="row-n">
                  {{ g.n }}<span class="sr-only"> personas</span>
                </span>
              </span>

              <template v-if="g.suppressed">
                <span class="row-notice">{{ texts.panel.suppressed }}</span>
              </template>

              <template v-else>
                <span class="row-bar" aria-hidden="true">
                  <span class="row-zero"></span>
                  <span
                    class="row-fill"
                    :class="{
                      positive: (g.gaps[selectedDimension] ?? 0) > 0,
                      negative: (g.gaps[selectedDimension] ?? 0) < 0,
                    }"
                    :style="{
                      width: barWidth(g.gaps[selectedDimension] ?? null) + '%',
                      left:
                        (g.gaps[selectedDimension] ?? 0) >= 0
                          ? '50%'
                          : 50 - barWidth(g.gaps[selectedDimension] ?? null) + '%',
                    }"
                  ></span>
                </span>

                <span class="row-value">
                  <span class="sr-only">
                    {{ texts.panel.gap }}
                  </span>
                  {{ formatNumber(g.gaps[selectedDimension] ?? null, true) }}
                </span>
              </template>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </main>
</template>
