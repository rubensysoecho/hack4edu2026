/**
 * Datos sintéticos para la demo.
 *
 *   bun run seed
 *
 * Crea el instrumento de ejemplo con todas las dimensiones y ejes,
 * y lo rellena con 300 respuestas simuladas. No planta brechas:
 * cualquier diferencia entre grupos es variación de muestreo.
 */

import { AXES, DIMENSIONS } from "./server/catalog.ts";
import { calcGaps } from "./server/gaps.ts";
import {
  db,
  deleteAll,
  loadInput,
  saveInstrument,
  saveQuestion,
} from "./server/db.ts";
import { simulateResponses } from "./server/simulate.ts";

const INSTRUMENT_ID = "demo";
const RESPONSE_COUNT = 300;

deleteAll();

saveInstrument({
  id: INSTRUMENT_ID,
  title: "Acceso y apoyos — Club Los Pinos",
  version: 1,
  approved_by: "Equipo pedagógico (demo)",
  form_id: null,
  axes: JSON.stringify(AXES.map((e) => e.id)),
  created_at: new Date("2026-10-01T09:00:00Z").toISOString(),
});

DIMENSIONS.flatMap((d) => d.questions).forEach((q, position) => {
  saveQuestion({
    id: `${INSTRUMENT_ID}.${q.code}`,
    instrument_id: INSTRUMENT_ID,
    position,
    statement: q.statement,
    dimension: q.dimension,
    google_item_id: null,
    weight: q.weight,
  });
});

const created = simulateResponses(INSTRUMENT_ID, RESPONSE_COUNT);

const result = calcGaps(loadInput(INSTRUMENT_ID), { k: 10 });

console.log(`\n${created} respuestas sembradas.\n`);
console.log("dimension       n       indice");
for (const d of result.dimensions) {
  console.log(`${d.dimension.padEnd(16)}${String(d.n).padEnd(8)}${d.index}`);
}

console.log("\nBrechas de dispositivos:");
for (const g of result.groups) {
  const gap = g.gaps.dispositivos;
  const text =
    g.suppressed || gap === null || gap === undefined
      ? "grupo pequeño"
      : `${gap >= 0 ? "+" : ""}${gap}`;
  console.log(`${g.label.padEnd(36)} n=${String(g.n).padEnd(4)} ${text}`);
}

db.close();
