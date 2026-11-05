/**
 * Motor de análisis de Equilens.
 *
 * Módulo puro: no toca base de datos, ni red, ni framework, ni reloj.
 * Entra respuestas individuales, sale SOLO agregados.
 *
 * Fórmulas (ver AGENTS.md):
 *   índice  = ((Σ valor×peso / Σ peso) − 1) / 4 × 100        → 0..100
 *   brecha  = índice del grupo − índice global
 *   aporte  = Σ(valor×peso del ítem) / Σ(valor×peso de la dimensión)
 *
 * Ningún dato con n < k sale publicado: se marca `suppressed` y los índices
 * quedan en `null`, no en cero.
 */

const SCALE_MIN = 1;
const SCALE_MAX = 5;
const ROUNDING = 10;

export type Item = {
  id: string;
  dimension: string;
  weight: number;
};

export type ResponseRecord = {
  id: string;
  /** itemId → valor en escala 1..5 */
  values: Record<string, number>;
  /** eje → valor. Ej: { genero: "mujer", ubicacion: "rural" } */
  attributes: Record<string, string>;
};

export type EngineInput = {
  items: Item[];
  responses: ResponseRecord[];
};

export type Options = {
  /** Umbral mínimo de grupo para publicar un dato. Por defecto 10. */
  k?: number;
  /** 1 = un eje por grupo. 2 = también pares de ejes (interseccional). Por defecto 1. */
  depth?: 1 | 2;
};

export type Contribution = {
  itemId: string;
  /** Porcentaje del índice que explica este ítem, 0..100 */
  pct: number;
};

export type DimensionSummary = {
  dimension: string;
  /** Personas que respondieron al menos un ítem de la dimensión */
  n: number;
  index: number | null;
  /** Qué ítems mueven el índice, de mayor a menor */
  contributions: Contribution[];
};

export type GroupGap = {
  /** Ej: "genero=mujer" o "genero=mujer + ubicacion=rural" */
  label: string;
  axes: Record<string, string>;
  n: number;
  suppressed: boolean;
  /** dimension → índice 0..100, o null si suprimido */
  indices: Record<string, number | null>;
  /** dimension → índice del grupo − índice global, o null si suprimido */
  gaps: Record<string, number | null>;
};

export type GapResult = {
  total: number;
  dimensions: DimensionSummary[];
  groups: GroupGap[];
};

const roundTo = (n: number): number => Math.round(n * ROUNDING) / ROUNDING;

const isValidScaleValue = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= SCALE_MIN && n <= SCALE_MAX;

/** Índice 0..100 de una persona en una dimensión, o null si no respondió nada. */
function personIndex(response: ResponseRecord, items: Item[]): number | null {
  let sum = 0;
  let weights = 0;

  for (const item of items) {
    const value = response.values[item.id];
    if (!isValidScaleValue(value)) continue;
    sum += value * item.weight;
    weights += item.weight;
  }

  if (weights === 0) return null;

  const mean = sum / weights;
  return roundTo(((mean - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100);
}

function validateItems(items: Item[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`Item duplicado: ${item.id}`);
    }
    if (!Number.isFinite(item.weight) || item.weight <= 0) {
      throw new Error(`Peso inválido en el item ${item.id}: ${item.weight}`);
    }
    seen.add(item.id);
  }
}

/** Agrupa los ítems por dimensión, respetando el orden de aparición. */
function itemsByDimension(items: Item[]): Map<string, Item[]> {
  const map = new Map<string, Item[]>();
  for (const item of items) {
    const list = map.get(item.dimension);
    if (list) list.push(item);
    else map.set(item.dimension, [item]);
  }
  return map;
}

/** Qué porcentaje del índice de la dimensión aporta cada ítem. */
function calcContributions(
  responses: ResponseRecord[],
  items: Item[],
): Contribution[] {
  const accumulated = new Map<string, number>();
  for (const item of items) accumulated.set(item.id, 0);

  for (const response of responses) {
    for (const item of items) {
      const value = response.values[item.id];
      if (!isValidScaleValue(value)) continue;
      accumulated.set(
        item.id,
        (accumulated.get(item.id) ?? 0) + value * item.weight,
      );
    }
  }

  const total = [...accumulated.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  return items
    .map((item) => ({
      itemId: item.id,
      pct: roundTo(((accumulated.get(item.id) ?? 0) / total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);
}

type GroupKey = {
  label: string;
  axes: Record<string, string>;
};

/** Genera las combinaciones de ejes a partir de los atributos presentes. */
function buildGroupKeys(
  responses: ResponseRecord[],
  depth: 1 | 2,
): GroupKey[] {
  const valuesByAxis = new Map<string, Set<string>>();

  for (const response of responses) {
    for (const [axis, value] of Object.entries(response.attributes)) {
      const set = valuesByAxis.get(axis);
      if (set) set.add(value);
      else valuesByAxis.set(axis, new Set([value]));
    }
  }

  const axes = [...valuesByAxis.keys()].sort();
  const keys: GroupKey[] = [];

  for (const axis of axes) {
    const values = [...(valuesByAxis.get(axis) ?? [])].sort();
    for (const value of values) {
      keys.push({ label: `${axis}=${value}`, axes: { [axis]: value } });
    }
  }

  if (depth < 2) return keys;

  for (let i = 0; i < axes.length; i++) {
    for (let j = i + 1; j < axes.length; j++) {
      const axisA = axes[i]!;
      const axisB = axes[j]!;
      const valuesA = [...(valuesByAxis.get(axisA) ?? [])].sort();
      const valuesB = [...(valuesByAxis.get(axisB) ?? [])].sort();

      for (const valueA of valuesA) {
        for (const valueB of valuesB) {
          keys.push({
            label: `${axisA}=${valueA} + ${axisB}=${valueB}`,
            axes: { [axisA]: valueA, [axisB]: valueB },
          });
        }
      }
    }
  }

  return keys;
}

export function calcGaps(input: EngineInput, options: Options = {}): GapResult {
  const k = options.k ?? 10;
  const depth = options.depth ?? 1;

  const { items, responses } = input;
  validateItems(items);

  const byDimension = itemsByDimension(items);
  const dimensions = [...byDimension.keys()];

  // Índice de cada persona en cada dimensión.
  const indices = new Map<string, Record<string, number>>();
  for (const response of responses) {
    const row: Record<string, number> = {};
    for (const [dimension, dimensionItems] of byDimension) {
      const index = personIndex(response, dimensionItems);
      if (index !== null) row[dimension] = index;
    }
    indices.set(response.id, row);
  }

  // Agregado global por dimensión.
  const globals: Record<string, number | null> = {};
  const summaries: DimensionSummary[] = [];

  for (const [dimension, dimensionItems] of byDimension) {
    const values = [...indices.values()]
      .map((row) => row[dimension])
      .filter((v): v is number => typeof v === "number");

    const n = values.length;
    const index =
      n >= k ? roundTo(values.reduce((a, b) => a + b, 0) / n) : null;

    globals[dimension] = index;
    summaries.push({
      dimension,
      n,
      index,
      contributions: calcContributions(responses, dimensionItems),
    });
  }

  // Agregado por grupo de corte.
  const groups: GroupGap[] = [];

  for (const key of buildGroupKeys(responses, depth)) {
    const members = responses.filter((response) =>
      Object.entries(key.axes).every(
        ([axis, value]) => response.attributes[axis] === value,
      ),
    );

    const n = members.length;
    const suppressed = n < k;
    const groupIndices: Record<string, number | null> = {};
    const gaps: Record<string, number | null> = {};

    for (const dimension of dimensions) {
      const values = members
        .map((response) => indices.get(response.id)?.[dimension])
        .filter((v): v is number => typeof v === "number");

      const index =
        !suppressed && values.length >= k
          ? roundTo(values.reduce((a, b) => a + b, 0) / values.length)
          : null;

      const global = globals[dimension] ?? null;

      groupIndices[dimension] = index;
      gaps[dimension] =
        index !== null && global !== null ? roundTo(index - global) : null;
    }

    groups.push({
      label: key.label,
      axes: key.axes,
      n,
      suppressed,
      indices: groupIndices,
      gaps,
    });
  }

  return { total: responses.length, dimensions: summaries, groups };
}
