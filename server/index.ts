/**
 * Servidor de Equilens: Hono sobre Bun.
 *
 * En desarrollo, Vite sirve el frontend en :5173 y hace proxy de /api aquí.
 * En producción, este mismo proceso sirve `dist/` y la API.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import {
  AXES,
  DIMENSION_GROUPS,
  DIMENSIONS,
  groupOf,
  questionsOf,
} from "./catalog.ts";
import { calcGaps } from "./gaps.ts";
import {
  listInstruments,
  listSummaries,
  loadInput,
  saveInstrument,
  saveQuestion,
} from "./db.ts";
import { simulateResponses } from "./simulate.ts";

const K = 10;

const app = new Hono();

app.use("/api/*", cors());

/** Instrumento pedido por query, o el más reciente. */
function currentInstrument(id?: string) {
  const all = listInstruments();
  return id ? all.find((i) => i.id === id) : all[0];
}

app.get("/api/catalog", (c) =>
  c.json({ groups: DIMENSION_GROUPS, dimensions: DIMENSIONS, axes: AXES }),
);

app.get("/api/instruments", (c) => c.json(listSummaries()));

app.post("/api/instruments", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Cuerpo inválido" }, 400);

  const title = String(body.title ?? "").trim();
  const dimensions: string[] = Array.isArray(body.dimensions)
    ? body.dimensions
    : [];
  const axes: string[] = Array.isArray(body.axes) ? body.axes : [];

  if (!title) return c.json({ error: "Falta el título" }, 400);

  const validDimensions = dimensions.filter((d) =>
    DIMENSIONS.some((x) => x.id === d),
  );
  if (validDimensions.length === 0) {
    return c.json({ error: "Elige al menos una dimensión" }, 400);
  }

  const validAxes = axes.filter((a) => AXES.some((x) => x.id === a));
  const id = `inst_${Date.now().toString(36)}`;

  saveInstrument({
    id,
    title,
    version: 1,
    approved_by: null,
    form_id: null,
    axes: JSON.stringify(validAxes),
    created_at: new Date().toISOString(),
  });

  questionsOf(validDimensions).forEach((q, position) => {
    saveQuestion({
      id: `${id}.${q.code}`,
      instrument_id: id,
      position,
      statement: q.statement,
      dimension: q.dimension,
      google_item_id: null,
      weight: q.weight,
    });
  });

  return c.json(
    {
      id,
      title,
      question_count: questionsOf(validDimensions).length,
      dimensions: validDimensions,
      axes: validAxes,
      form_id: null,
    },
    201,
  );
});

app.post("/api/instruments/:id/simulate", (c) => {
  const id = c.req.param("id");
  const instrument = currentInstrument(id);
  if (!instrument) return c.json({ error: "Instrumento no encontrado" }, 404);

  const created = simulateResponses(instrument.id, 300);
  return c.json({ responses: created });
});

app.get("/api/panel", (c) => {
  const instrument = currentInstrument(c.req.query("instrument"));
  if (!instrument) {
    return c.json({ error: "No hay instrumentos. Ejecuta `bun run seed`." }, 404);
  }

  const result = calcGaps(loadInput(instrument.id), { k: K });

  // El grupo de navegación no se calcula: sale del catálogo.
  const dimensions = result.dimensions.map((d) => ({
    ...d,
    group: groupOf(d.dimension),
  }));

  return c.json({ instrument, k: K, ...result, dimensions });
});

app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
};
