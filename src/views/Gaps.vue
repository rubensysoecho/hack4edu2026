<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { activeReport } from "../state";
import { formatDate, formatNumber, texts } from "../texts";
import GroupIcon from "../GroupIcon.vue";

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

type ReportObservation = { titulo: string; detalle: string };
type ReportAction = { titulo: string; detalle: string; derivacion: string };

type Report = {
  observaciones: ReportObservation[];
  afrontamiento: ReportAction[];
  advertencias: string[];
};

type ReportSource = "ai" | "fallback";

const emit = defineEmits<{ "back-reports": [] }>();

const panel = ref<Panel | null>(null);
const loading = ref(true);
const error = ref(false);
const selectedDimension = ref("");
const relevantOnly = ref(false);
const RELEVANT_GAP = 0.5;

const report = ref<Report | null>(null);
const reportSource = ref<ReportSource>("fallback");
const reportDate = ref("");
const reportOpen = ref(true);
const observationsOpen = ref(true);
const actionsOpen = ref(true);

type Snapshot = {
  source: ReportSource;
  created_at: string;
  panel: Panel;
  report: Report;
};

async function load() {
  loading.value = true;
  error.value = false;

  try {
    if (!activeReport.value) throw new Error("Sin informe");

    const response = await fetch(
      `/api/reports/${encodeURIComponent(activeReport.value)}`,
    );
    if (!response.ok) throw new Error(String(response.status));

    const snapshot = (await response.json()) as Snapshot;
    panel.value = snapshot.panel;
    report.value = snapshot.report;
    reportSource.value = snapshot.source;
    reportDate.value = snapshot.created_at;
    selectedDimension.value = bestDimension(snapshot.panel);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(activeReport, load);

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

const maxAbsGap = computed(() =>
  Math.max(
    1,
    ...singleTables.value
      .filter((table) => !table.suppressed)
      .flatMap((table) => table.groups)
      .map((g) => Math.abs(g.gaps[selectedDimension.value] ?? 0)),
  ),
);

const scaleLimit = computed(() => Math.max(1, Math.ceil(maxAbsGap.value)));

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

function visibleGroups(table: GapTable): GroupGap[] {
  const groups = groupsByGap(table);
  if (!relevantOnly.value) return groups;
  return groups.filter((group) => {
    const gap = group.gaps[selectedDimension.value] ?? null;
    return gap !== null && Math.abs(gap) >= RELEVANT_GAP;
  });
}

function groupPercentage(table: GapTable, group: GroupGap): string {
  const total = table.groups.reduce((sum, current) => sum + (current.n ?? 0), 0);
  if (group.n === null || total === 0) return "";
  return `${formatNumber((group.n / total) * 100)} %`;
}

/** Grupos que el filtro de relevancia deja fuera, siempre que tengan brecha calculada. */
function hiddenGroups(table: GapTable): number {
  if (!relevantOnly.value) return 0;
  return table.groups.filter((group) => {
    const gap = group.gaps[selectedDimension.value] ?? null;
    return gap !== null && Math.abs(gap) < RELEVANT_GAP;
  }).length;
}

function axisSummary(table: GapTable, axis: string): string {
  const groups = table.groups
    .map((group) => ({
      group,
      gap: group.gaps[selectedDimension.value] ?? null,
    }))
    .filter((item): item is { group: GroupGap; gap: number } => item.gap !== null);

  if (groups.length < 2) return texts.panel.insufficientComparison;
  const highest = groups.reduce((a, b) => (b.gap > a.gap ? b : a));
  const lowest = groups.reduce((a, b) => (b.gap < a.gap ? b : a));
  const spread = highest.gap - lowest.gap;

  if (spread < RELEVANT_GAP) {
    return texts.panel.lowVariation(axisName(axis), formatNumber(spread));
  }

  return texts.panel.axisDifference(
    axisName(axis),
    formatNumber(spread),
    groupDisplayName(highest.group),
  );
}

function barWidth(value: number | null): number {
  if (value === null || value === 0) return 0;
  return Math.max(2, (Math.abs(value) / scaleLimit.value) * 50);
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
  <main id="main" class="page" tabindex="-1">
    <button
      type="button"
      class="link back-link"
      @click="emit('back-reports')"
    >
      ← {{ texts.reports.back }}
    </button>

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
      <p v-if="reportDate" class="context-line">
        {{ texts.reports.savedAt(formatDate(reportDate)) }}
      </p>
    </header>

    <p v-if="loading" class="status">{{ texts.states.loading }}</p>
    <p v-else-if="error" class="status error">{{ texts.states.error }}</p>

    <section v-else-if="panel && panel.total === 0" class="empty">
      <h2>{{ texts.panel.noData }}</h2>
      <p>{{ texts.panel.noDataDetail }}</p>
    </section>

    <template v-else-if="panel">
      <section class="ai-report">
        <header class="ai-report-head">
          <div>
            <h2 id="report-title">
              <button
                type="button"
                class="disclosure"
                :aria-expanded="reportOpen"
                aria-controls="report-panel"
                @click="reportOpen = !reportOpen"
              >
                <svg
                  v-if="reportSource === 'ai' && report"
                  class="ai-spark"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10 2.5l1.6 4.1 4.4 1.6-4.4 1.6L10 14l-1.6-4.2L4 8.2l4.4-1.6L10 2.5Z" />
                  <path d="M15.5 13.5l.8 1.9 1.7.8-1.7.8-.8 2-.8-2-1.7-.8 1.7-.8.8-1.9Z" />
                </svg>
                <svg
                  v-else
                  class="ai-spark"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5.5 3h7l3 3v11h-10V3Z" />
                  <path d="M12 3v3.5h3.5M8 10h4M8 13h4" />
                </svg>
                <span>{{ texts.report.title }}</span>
                <svg
                  class="chevron"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5.5 8 4.5 4.5L14.5 8" />
                </svg>
              </button>
            </h2>
            <p>{{ texts.report.subtitle }}</p>
          </div>
          <span
            v-if="report"
            class="ai-badge"
            :class="reportSource"
          >
            {{ reportSource === "ai" ? texts.report.withAi : texts.report.automatic }}
          </span>
        </header>

        <div v-show="reportOpen" id="report-panel">
        <template v-if="report">
          <div class="ai-report-body">
            <section class="ai-block">
              <h3>
                <button
                  type="button"
                  class="disclosure block-disclosure"
                  :aria-expanded="observationsOpen"
                  aria-controls="report-observations"
                  @click="observationsOpen = !observationsOpen"
                >
                  <span>{{ texts.report.observations }}</span>
                  <svg
                    class="chevron"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m5.5 8 4.5 4.5L14.5 8" />
                  </svg>
                </button>
              </h3>
              <ul v-show="observationsOpen" id="report-observations" class="ai-list">
                <li v-for="o in report.observaciones" :key="o.titulo">
                  <p class="ai-item-title">{{ o.titulo }}</p>
                  <p class="ai-item-text">{{ o.detalle }}</p>
                </li>
              </ul>
            </section>

            <section class="ai-block">
              <h3>
                <button
                  type="button"
                  class="disclosure block-disclosure"
                  :aria-expanded="actionsOpen"
                  aria-controls="report-actions"
                  @click="actionsOpen = !actionsOpen"
                >
                  <span>{{ texts.report.actions }}</span>
                  <svg
                    class="chevron"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m5.5 8 4.5 4.5L14.5 8" />
                  </svg>
                </button>
              </h3>
              <ul v-show="actionsOpen" id="report-actions" class="ai-list">
                <li v-for="a in report.afrontamiento" :key="a.titulo">
                  <p class="ai-item-title">{{ a.titulo }}</p>
                  <p class="ai-item-text">{{ a.detalle }}</p>
                  <p class="ai-derivation">
                    <span>{{ texts.report.derivation }}</span>
                    {{ a.derivacion }}
                  </p>
                </li>
              </ul>
            </section>
          </div>

          <p v-if="reportSource === 'fallback'" class="ai-fallback">
            {{ texts.report.fallbackNote }}
          </p>

          <div v-if="report.advertencias.length > 0" class="ai-warnings">
            <p class="ai-warnings-title">{{ texts.report.warnings }}</p>
            <ul>
              <li v-for="w in report.advertencias" :key="w">{{ w }}</li>
            </ul>
          </div>

          <footer class="ai-disclaimer">
            <strong>{{ texts.report.disclaimerTitle }}</strong>
            <p>{{ texts.report.disclaimer }}</p>
          </footer>
        </template>
        </div>
      </section>

      <div class="report-layout">
      <aside class="report-rail" :aria-label="texts.panel.dimensionsTitle">
        <div class="rail-panel">
          <div class="rail-heading">
            <h2>{{ texts.panel.dimensionsTitle }}</h2>
            <p>{{ texts.panel.dimensionsNote }}</p>
          </div>

          <label class="relevant-toggle">
            <input v-model="relevantOnly" type="checkbox" />
            <span>{{ texts.panel.relevantOnly(formatNumber(RELEVANT_GAP)) }}</span>
          </label>

          <div
            v-for="b in dimensionBlocks"
            :key="b.group"
            class="dimension-group"
            role="group"
            :aria-label="b.name"
          >
            <p class="dimension-group-title">
              <GroupIcon :group="b.group" />
              {{ b.name }}
            </p>

            <div class="dimension-chips">
              <button
                v-for="d in b.dimensions"
                :key="d.dimension"
                type="button"
                class="dimension-chip"
                :class="{
                  active: d.dimension === selectedDimension,
                  empty: d.index === null,
                }"
                :aria-pressed="d.dimension === selectedDimension"
                @click="selectedDimension = d.dimension"
              >
                <span class="chip-name">
                  <span v-if="d.dimension === selectedDimension" aria-hidden="true">✓</span>
                  {{ dimensionName(d.dimension) }}
                </span>
                <strong>{{ formatNumber(d.index) }}</strong>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div class="report-main">
        <section class="distribution-section" :aria-label="texts.panel.distributions">
          <div class="distribution-heading">
            <h2>{{ texts.panel.distributions }}</h2>
            <p>{{ texts.panel.distributionNote(dimensionName(selectedDimension)) }}</p>
          </div>

          <div class="axes">
            <article
              v-for="b in axisBlocks"
              :key="b.axis"
              class="axis-card"
              :aria-label="b.name"
            >
              <header class="axis-card-header">
                <h3>{{ texts.panel.distributionBy(b.name) }}</h3>
              </header>

              <div v-if="!b.table.suppressed" class="axis-scale" aria-hidden="true">
                <span>−{{ formatNumber(scaleLimit) }}</span>
                <strong>0,0</strong>
                <span>+{{ formatNumber(scaleLimit) }}</span>
              </div>

              <p v-if="b.table.suppressed" class="block-notice axis-notice">
                {{ texts.panel.suppressedTable(panel.k) }}
              </p>

              <ul v-else class="distribution-rows">
                <li v-for="g in visibleGroups(b.table)" :key="g.label" class="distribution-row">
                  <div class="distribution-meta">
                    <span class="row-name">{{ label(g.label) }}</span>
                    <span class="row-n">
                      {{ texts.panel.people(g.n ?? 0) }}
                      <span v-if="groupPercentage(b.table, g)" class="row-share">
                        ({{ groupPercentage(b.table, g) }})
                      </span>
                    </span>
                    <span class="row-value" :class="gapClass(g.gaps[selectedDimension] ?? null)">
                      <span class="row-direction">
                        {{ (g.gaps[selectedDimension] ?? 0) > 0 ? texts.panel.moreBarrier : (g.gaps[selectedDimension] ?? 0) < 0 ? texts.panel.lessBarrier : texts.panel.average }}
                      </span>
                      {{ formatNumber(g.gaps[selectedDimension] ?? null, true) }}
                    </span>
                  </div>

                  <span class="row-bar" aria-hidden="true">
                    <span class="row-zero"></span>
                    <span
                      class="row-fill"
                      :class="gapClass(g.gaps[selectedDimension] ?? null)"
                      :style="{
                        width: barWidth(g.gaps[selectedDimension] ?? null) + '%',
                        left: (g.gaps[selectedDimension] ?? 0) >= 0
                          ? '50%'
                          : 50 - barWidth(g.gaps[selectedDimension] ?? null) + '%',
                      }"
                    ></span>
                    <span
                      class="row-dot"
                      :class="gapClass(g.gaps[selectedDimension] ?? null)"
                      :style="{
                        left: 50 + ((g.gaps[selectedDimension] ?? 0) / scaleLimit) * 50 + '%',
                      }"
                    ></span>
                  </span>
                </li>
              </ul>

              <p
                v-if="!b.table.suppressed && visibleGroups(b.table).length === 0"
                class="no-relevant"
              >
                {{ texts.panel.noRelevant }}
              </p>

              <p
                v-if="
                  !b.table.suppressed &&
                  visibleGroups(b.table).length > 0 &&
                  hiddenGroups(b.table) > 0
                "
                class="axis-excluded"
              >
                {{ texts.panel.hiddenByFilter(hiddenGroups(b.table), formatNumber(RELEVANT_GAP)) }}
              </p>

              <p v-if="b.table.excluded > 0" class="axis-excluded">
                {{ texts.panel.excludedBy(b.table.excluded, b.name) }}
              </p>

              <footer v-if="!b.table.suppressed" class="axis-summary">
                <span aria-hidden="true">i</span>
                <p>{{ axisSummary(b.table, b.axis) }}</p>
              </footer>
            </article>
          </div>
        </section>

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
      </div>
      </div>
    </template>
  </main>
</template>
