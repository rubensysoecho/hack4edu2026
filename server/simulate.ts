/**
 * Generador de respuestas sintéticas para la demo.
 *
 * No es parte del producto: es el "modo demo" que permite enseñar el flujo
 * sin 300 personas contestando.
 *
 * No planta brechas. Cada persona tiene su propio nivel y cada respuesta
 * lleva su ruido. Si un grupo sale distinto, es variación de muestreo.
 */

import { db, deleteResponses, saveResponse } from "./db.ts";

/** Nivel medio de barrera por dimensión, 0-100. */
const BASE_LEVEL: Record<string, number> = {
  conectividad: 32,
  dispositivos: 38,
  visual: 22,
  auditiva: 18,
  motriz: 15,
  habla: 12,
  salud: 25,
  tdah: 33,
  tea: 26,
  dislexia: 28,
  discalculia: 30,
};

const DEFAULT_BASE_LEVEL = 35;

/** Cómo se reparten los valores de cada eje. */
const DISTRIBUTION: Record<string, { value: string; p: number }[]> = {
  genero: [
    { value: "mujer", p: 0.5 },
    { value: "hombre", p: 0.5 },
  ],
  edad: [
    { value: "12-14", p: 1 / 3 },
    { value: "15-16", p: 1 / 3 },
    { value: "17-18", p: 1 / 3 },
  ],
  idioma: [
    { value: "igual", p: 0.85 },
    { value: "distinta", p: 0.15 },
  ],
  ubicacion: [
    { value: "urbana", p: 0.6 },
    { value: "periurbana", p: 0.25 },
    { value: "rural", p: 0.15 },
  ],
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normal estándar (Box–Muller). */
function normal(rng: () => number): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pickValue(
  rng: () => number,
  distribution: { value: string; p: number }[],
): string {
  let r = rng();
  for (const option of distribution) {
    if (r < option.p) return option.value;
    r -= option.p;
  }
  return distribution[distribution.length - 1]!.value;
}

/** Lleva un objetivo 0-100 a la escala 1..5. */
function valueForTarget(target: number, rng: () => number): number {
  const x = 1 + (target / 100) * 4 + (rng() - 0.5) * 0.9;
  return Math.min(5, Math.max(1, Math.round(x)));
}

/**
 * Genera `count` respuestas para un instrumento, solo con los ejes
 * que el gestor marcó.
 */
export function simulateResponses(
  instrumentId: string,
  count = 300,
): number {
  const questions = db
    .query(
      "SELECT id, dimension, weight FROM questions WHERE instrument_id = ? ORDER BY position",
    )
    .all(instrumentId) as { id: string; dimension: string; weight: number }[];

  if (questions.length === 0) return 0;

  // Idempotente: simular dos veces regenera, no duplica.
  deleteResponses(instrumentId);

  const row = db
    .query("SELECT axes FROM instruments WHERE id = ?")
    .get(instrumentId) as { axes: string } | null;

  const axes = row ? (JSON.parse(row.axes) as string[]) : [];
  const rng = mulberry32(20260204);

  for (let i = 0; i < count; i++) {
    // Nivel general de la persona: unas tienen más barreras que otras.
    const overall = normal(rng);

    const attributes: Record<string, string> = {};
    for (const axis of axes) {
      const distribution = DISTRIBUTION[axis];
      if (distribution) attributes[axis] = pickValue(rng, distribution);
    }

    const answers = questions.map((q) => {
      const base = (BASE_LEVEL[q.dimension] ?? DEFAULT_BASE_LEVEL) + overall * 16;
      const target = base + normal(rng) * 10;

      return {
        item_id: q.id,
        dimension: q.dimension,
        value: valueForTarget(target, rng),
      };
    });

    saveResponse({
      id: `${instrumentId}-r${String(i + 1).padStart(3, "0")}`,
      instrument_id: instrumentId,
      submitted_at: new Date(
        Date.UTC(2026, 9, 5 + Math.floor(i / 20), 10, i % 60),
      ).toISOString(),
      answers,
      attributes,
    });
  }

  return count;
}
