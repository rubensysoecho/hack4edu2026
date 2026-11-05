<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { activeInstrument } from "../state";
import { formatNumber, texts } from "../texts";

type GroupGap = {
  label: string;
  axes: Record<string, string>;
  n: number | null;
  suppressed: boolean;
  indices: Record<string, number | null>;
  gaps: Record<string, number | null>;
};

type GapTable = {
  axes: string[];
  groups: GroupGap[];
  suppressed: boolean;
  excluded: number;
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
  kCross: number;
  axisValues: Record<string, string[]>;
  dimensions: Dimension[];
  tables: GapTable[];
};

type CrossCell = {
  group: GroupGap | null;
  gap: number | null;
  n: number | null;
};

type CrossBlock = {
  key: string;
  title: string;
  table: GapTable;
  rowAxis: string;
  colAxis: string;
  rows: string[];
  cols: string[];
  cells: Record<string, CrossCell>;
};

type GapCandidate = {
  group: GroupGap;
  table: GapTable;
  gap: number | null;
};

type TopGap = {
  group: GroupGap;
  table: GapTable;
  gap: number;
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
    selectedDimension.value = bestDimension(panel.value);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(activeInstrument, load);

/** Arranca en la dimensión con la brecha positiva más alta. */
function bestDimension(current: Panel): string {
  const withData = current.dimensions.filter((dimension) => dimension.n > 0);
  if (withData.length === 0) return "";

  const tables = current.tables.filter((table) => !table.suppressed);
  let best = withData[0]!.dimension;
  let bestGap = 0;

  for (const dimension of withData) {
    for (const table of tables) {
      for (const group of table.groups) {
        const gap = group.gaps[dimension.dimension] ?? null;
        if (gap !== null && gap > bestGap) {
          bestGap = gap;
          best = dimension.dimension;
        }
      }
    }
  }

  return best;
}

const dimensionName = (d: string) => texts.dimensions[d] ?? d;
const groupName = (g: string) => texts.groups[g] ?? g;
const axisName = (axis: string) => texts.axes[axis] ?? axis;
const label = (key: string) => texts.labels[key] ?? key;
const valueLabel = (axis: string, value: string) =>
  texts.labels[`${axis}=${value}`] ?? value;

const orderIndex = (axis: string) => {
  const index = texts.axisOrder.indexOf(axis);
  return index === -1 ? texts.axisOrder.length : index;
};

/** Una tabla por eje. */
const singleTables = computed(() =>
  (panel.value?.tables ?? [])
    .filter((table) => table.axes.length === 1 && table.groups.length > 0)
    .sort((a, b) => orderIndex(a.axes[0]!) - orderIndex(b.axes[0]!)),
);

/** Una tabla por par de ejes, con los ejes en el orden del catálogo. */
const crossTables = computed(() =>
  (panel.value?.tables ?? [])
    .filter((table) => table.axes.length === 2 && table.groups.length > 0)
    .map((table) => ({
      ...table,
      axes: [...table.axes].sort((a, b) => orderIndex(a) - orderIndex(b)),
    }))
    .sort((a, b) => {
      const first = orderIndex(a.axes[0]!) - orderIndex(b.axes[0]!);
      return first !== 0 ? first : orderIndex(a.axes[1]!) - orderIndex(b.axes[1]!);
    }),
);

const axisBlocks = computed(() =>
  singleTables.value.map((table) => ({
    axis: table.axes[0]!,
    name: axisName(table.axes[0]!),
    table,
  })),
);

const publishedGaps = computed<GapCandidate[]>(() =>
  [...singleTables.value, ...crossTables.value]
    .filter((table) => !table.suppressed)
    .flatMap((table) =>
      table.groups.map((group) => ({
        group,
        table,
        gap: group.gaps[selectedDimension.value] ?? null,
      })),
    ),
);

/** La brecha positiva más alta: el grupo que queda más atrás. */
const topGap = computed<TopGap | null>(() => {
  const candidates = publishedGaps.value.filter(
    (candidate): candidate is TopGap =>
      candidate.gap !== null && candidate.gap > 0,
  );

  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (b.gap > a.gap ? b : a));
});

const globalIndex = computed(
  () =>
    panel.value?.dimensions.find(
      (dimension) => dimension.dimension === selectedDimension.value,
    )?.index ?? null,
);

const heroGroupIndex = computed(() => {
  const top = topGap.value;
  if (!top) return null;
  return (
    top.group.indices[selectedDimension.value] ??
    (globalIndex.value !== null ? globalIndex.value + top.gap : null)
  );
});

const heroScale = computed(() => {
  const global = globalIndex.value;
  const group = heroGroupIndex.value;
  if (global === null || group === null) return null;
  return {
    global,
    group,
    left: Math.min(global, group),
    width: Math.abs(group - global),
  };
});

const maxAbsGap = computed(() =>
  Math.max(
    1,
    ...singleTables.value
      .filter((table) => !table.suppressed)
      .flatMap((table) => table.groups)
      .map((g) => Math.abs(g.gaps[selectedDimension.value] ?? 0)),
  ),
);

/** Dimensiones por cabecera: acceso, barreras, contexto. */
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

function groupsByGap(table: GapTable): GroupGap[] {
  return [...table.groups].sort((a, b) => {
    const gapA = a.gaps[selectedDimension.value] ?? null;
    const gapB = b.gaps[selectedDimension.value] ?? null;
    if (gapA === null && gapB === null) return (b.n ?? 0) - (a.n ?? 0);
    if (gapA === null) return 1;
    if (gapB === null) return -1;
    return gapB - gapA;
  });
}

function barWidth(value: number | null): number {
  if (value === null) return 0;
  return Math.max(2, (Math.abs(value) / maxAbsGap.value) * 50);
}

function valuesFor(table: GapTable, axis: string): string[] {
  const present = new Set(
    table.groups
      .map((group) => group.axes[axis])
      .filter((value): value is string => typeof value === "string"),
  );
  const catalog = panel.value?.axisValues[axis] ?? [];
  const ordered = catalog.filter((value) => present.has(value));
  const extra = [...present].filter((value) => !catalog.includes(value)).sort();
  return [...ordered, ...extra];
}

function crossTitle(table: GapTable): string {
  return table.axes.map((axis) => axisName(axis)).join(" × ");
}

function groupDisplayName(group: GroupGap): string {
  return Object.entries(group.axes)
    .sort(([a], [b]) => orderIndex(a) - orderIndex(b))
    .map(([axis, value]) => valueLabel(axis, value))
    .join(" · ");
}

function groupContext(group: GroupGap): string {
  return Object.keys(group.axes)
    .sort((a, b) => orderIndex(a) - orderIndex(b))
    .map((axis) => axisName(axis))
    .join(" × ");
}

function cell(block: CrossBlock, row: string, col: string): CrossCell {
  return block.cells[`${row}|${col}`] ?? { group: null, gap: null, n: null };
}

function gapClass(gap: number | null) {
  return { positive: gap !== null && gap > 0, negative: gap !== null && gap < 0 };
}

const crossBlocks = computed<CrossBlock[]>(() =>
  crossTables.value.map((table) => {
    const rowAxis = table.axes[0]!;
    const colAxis = table.axes[1]!;
    const rows = valuesFor(table, rowAxis);
    const cols = valuesFor(table, colAxis);
    const cells: Record<string, CrossCell> = {};

    for (const row of rows) {
      for (const col of cols) {
        const group =
          table.groups.find(
            (g) => g.axes[rowAxis] === row && g.axes[colAxis] === col,
          ) ?? null;
        cells[`${row}|${col}`] = {
          group,
          gap: group?.gaps[selectedDimension.value] ?? null,
          n: group?.n ?? null,
        };
      }
    }

    return {
      key: table.axes.join("+"),
      title: crossTitle(table),
      table,
      rowAxis,
      colAxis,
      rows,
      cols,
      cells,
    };
  }),
);

const publishedCrosses = computed(() =>
  crossBlocks.value.filter((block) => !block.table.suppressed),
);

const suppressedCrosses = computed(() =>
  crossBlocks.value.filter((block) => block.table.suppressed),
);
</script>

<template>
  <main class="page">
    <header class="header">
      <p v-if="panel" class="context">{{ panel.instrument.title }}</p>
      <h1>{{ texts.panel.title }}</h1>
      <p class="subtitle">{{ texts.panel.subtitle }}</p>
      <p v-if="panel" class="context-line">
        {{
          texts.panel.contextLine(
            panel.total,
            Object.keys(panel.axisValues).length,
          )
        }}
      </p>
    </header>

    <p v-if="loading" class="status">{{ texts.states.loading }}</p>
    <p v-else-if="error" class="status error">{{ texts.states.error }}</p>

    <section v-else-if="panel && panel.total === 0" class="empty">
      <h2>{{ texts.panel.noData }}</h2>
      <p>{{ texts.panel.noDataDetail }}</p>
    </section>

    <template v-else-if="panel">
      <section
        v-if="topGap && heroScale"
        class="hero"
        :aria-label="texts.panel.keyFinding"
      >
        <p class="hero-eyebrow">{{ texts.panel.keyFinding }}</p>
        <h2 class="hero-group">{{ groupDisplayName(topGap.group) }}</h2>
        <p class="hero-sentence">
          {{
            texts.panel.heroGap(
              formatNumber(topGap.gap),
              dimensionName(selectedDimension),
            )
          }}
        </p>

        <div class="hero-measure">
          <div class="hero-track" aria-hidden="true">
            <span
              class="hero-segment"
              :style="{
                left: heroScale.left + '%',
                width: heroScale.width + '%',
              }"
            ></span>
            <span
              class="hero-marker"
              :style="{ left: heroScale.global + '%' }"
            ></span>
            <span
              class="hero-marker group"
              :style="{ left: heroScale.group + '%' }"
            ></span>
          </div>

          <div class="hero-scale" aria-hidden="true">
            <span>0</span>
            <span>100</span>
          </div>

          <ul class="hero-legend">
            <li>
              <span class="dot" aria-hidden="true"></span>
              {{ texts.panel.scaleGlobal }}
              <strong>{{ formatNumber(heroScale.global) }}</strong>
            </li>
            <li>
              <span class="dot group" aria-hidden="true"></span>
              {{ texts.panel.scaleGroup }}
              <strong>{{ formatNumber(heroScale.group) }}</strong>
            </li>
          </ul>
        </div>

        <p class="hero-meta">
          {{ texts.panel.people(topGap.group.n ?? 0) }} ·
          {{ groupContext(topGap.group) }}
        </p>
      </section>

      <p v-else class="hero-empty">{{ texts.panel.noPositiveGap }}</p>

      <section
        class="dimensions-section"
        :aria-label="texts.panel.dimensionsTitle"
      >
        <h2 class="section-title">{{ texts.panel.dimensionsTitle }}</h2>
        <p class="section-note">{{ texts.panel.dimensionsNote }}</p>

        <div
          v-for="b in dimensionBlocks"
          :key="b.group"
          class="dimension-group"
          role="group"
          :aria-label="b.name"
        >
          <p class="dimension-group-title">{{ b.name }}</p>

          <div class="dimension-grid">
            <button
              v-for="d in b.dimensions"
              :key="d.dimension"
              type="button"
              class="dimension-card"
              :class="{
                active: d.dimension === selectedDimension,
                empty: d.index === null,
              }"
              :aria-pressed="d.dimension === selectedDimension"
              @click="selectedDimension = d.dimension"
            >
              <span class="dimension-head">
                <span class="dimension-name">
                  {{ dimensionName(d.dimension) }}
                </span>
                <span class="dimension-index">
                  {{ formatNumber(d.index) }}
                </span>
              </span>
              <span class="dimension-meter" aria-hidden="true">
                <span
                  class="dimension-fill"
                  :style="{ width: (d.index ?? 0) + '%' }"
                ></span>
              </span>
            </button>
          </div>
        </div>
      </section>

      <div class="axes">
        <section
          v-for="b in axisBlocks"
          :key="b.axis"
          class="axis-block"
          :aria-label="b.name"
        >
          <h2 class="block-title">{{ b.name }}</h2>

          <p v-if="b.table.suppressed" class="block-notice">
            {{ texts.panel.suppressedTable(panel.k) }}
          </p>

          <p v-if="b.table.excluded > 0" class="block-excluded">
            {{ texts.panel.excluded(b.table.excluded) }}
          </p>

          <ul v-if="!b.table.suppressed" class="rows">
            <li v-for="g in groupsByGap(b.table)" :key="g.label" class="row">
              <span class="row-name">
                {{ label(g.label) }}
                <span class="row-n">
                  {{ g.n ?? "" }}<span class="sr-only"> personas</span>
                </span>
              </span>

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
                <span class="sr-only">{{ texts.panel.gap }}</span>
                {{ formatNumber(g.gaps[selectedDimension] ?? null, true) }}
              </span>
            </li>
          </ul>
        </section>
      </div>

      <section
        v-if="crossBlocks.length > 0"
        class="crosses"
        :aria-label="texts.panel.crosses"
      >
        <div class="crosses-header">
          <h2 class="section-title">{{ texts.panel.crosses }}</h2>
          <p class="cross-note">
            {{ texts.panel.crossNote(panel.kCross) }}
          </p>
        </div>
        <p class="cross-dimension">
          {{ texts.panel.crossGap(dimensionName(selectedDimension)) }}
        </p>

        <div v-if="publishedCrosses.length > 0" class="cross-grid">
          <article
            v-for="b in publishedCrosses"
            :key="b.key"
            class="cross-block"
          >
            <h3 class="cross-title">{{ b.title }}</h3>

            <div
              class="cross-scroll"
              role="region"
              :aria-label="b.title"
              tabindex="0"
            >
              <table class="cross-table">
                <caption class="sr-only">
                  {{ b.title }}.
                  {{ texts.panel.crossGap(dimensionName(selectedDimension)) }}.
                </caption>
                <thead>
                  <tr>
                    <th scope="col" class="cross-corner">
                      {{ axisName(b.rowAxis) }}
                    </th>
                    <th v-for="col in b.cols" :key="col" scope="col">
                      {{ valueLabel(b.colAxis, col) }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in b.rows" :key="row">
                    <th scope="row">{{ valueLabel(b.rowAxis, row) }}</th>
                    <td
                      v-for="col in b.cols"
                      :key="col"
                    >
                      <span
                        class="cross-gap"
                        :class="gapClass(cell(b, row, col).gap)"
                      >
                        {{ formatNumber(cell(b, row, col).gap, true) }}
                      </span>
                      <span
                        v-if="cell(b, row, col).n !== null"
                        class="cross-n"
                      >
                        {{ cell(b, row, col).n }}<span class="sr-only">
                          personas</span
                        >
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p v-if="b.table.excluded > 0" class="block-excluded">
              {{ texts.panel.excluded(b.table.excluded) }}
            </p>
          </article>
        </div>

        <div v-if="suppressedCrosses.length > 0" class="cross-suppressed">
          <h3>{{ texts.panel.crossSuppressed }}</h3>
          <ul>
            <li v-for="b in suppressedCrosses" :key="b.key">
              <strong>{{ b.title }}</strong>
              <span>{{ texts.panel.smallCell(panel.kCross) }}</span>
              <span v-if="b.table.excluded > 0">
                {{ texts.panel.excluded(b.table.excluded) }}
              </span>
            </li>
          </ul>
        </div>
      </section>
    </template>
  </main>
</template>
