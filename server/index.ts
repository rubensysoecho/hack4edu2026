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
  questionsOf,
} from "./catalog.ts";
import {
  deleteReportSnapshot,
  listSummaries,
  saveInstrument,
  saveQuestion,
} from "./db.ts";
import { simulateResponses } from "./simulate.ts";
import {
  buildPanel,
  composeReport,
  createReportSnapshot,
  findInstrument,
  getReport,
  listReports,
} from "./reports.ts";

const app = new Hono();

app.use("/api/*", cors());

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
  // Modo demo: crea el instrumento y lo rellena con respuestas sintéticas
  // en la misma petición. El botón «Generar» del constructor lo usa.
  const demo = body.demo === true;

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

  const responseCount = demo ? simulateResponses(id, 800) : 0;

  return c.json(
    {
      id,
      title,
      question_count: questionsOf(validDimensions).length,
      response_count: responseCount,
      dimensions: validDimensions,
      axes: validAxes,
      form_id: null,
    },
    201,
  );
});

app.post("/api/instruments/:id/simulate", (c) => {
  const instrument = findInstrument(c.req.param("id"));
  if (!instrument) return c.json({ error: "Instrumento no encontrado" }, 404);

  const created = simulateResponses(instrument.id, 800);
  return c.json({ responses: created });
});

/** Panel vivo (debug). La interfaz consume snapshots en /api/reports. */
app.get("/api/panel", (c) => {
  const instrument = findInstrument(c.req.query("instrument"));
  if (!instrument) {
    return c.json({ error: "No hay instrumentos. Ejecuta `bun run seed`." }, 404);
  }

  return c.json(buildPanel(instrument));
});

/** Informe vivo (debug). La interfaz consume snapshots en /api/reports. */
app.get("/api/report", async (c) => {
  const instrument = findInstrument(c.req.query("instrument"));
  if (!instrument) {
    return c.json({ error: "No hay instrumentos. Ejecuta `bun run seed`." }, 404);
  }

  const composed = await composeReport(instrument);

  c.header("Cache-Control", "no-store");
  return c.json({
    source: composed.report.source,
    cached: composed.cached,
    report: composed.report,
  });
});

app.get("/api/reports", (c) => c.json(listReports()));

app.get("/api/reports/:id", (c) => {
  const report = getReport(c.req.param("id"));
  if (!report) return c.json({ error: "Informe no encontrado" }, 404);
  return c.json(report);
});

app.delete("/api/reports/:id", (c) => {
  const deleted = deleteReportSnapshot(c.req.param("id"));
  if (!deleted) return c.json({ error: "Informe no encontrado" }, 404);
  return c.body(null, 204);
});

app.post("/api/reports", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Cuerpo inválido" }, 400);

  const instrumentId = String(body.instrumentId ?? "").trim();
  if (!instrumentId) return c.json({ error: "Falta instrumentId" }, 400);

  const instrument = findInstrument(instrumentId);
  if (!instrument) return c.json({ error: "Instrumento no encontrado" }, 404);

  try {
    const snapshot = await createReportSnapshot(instrument);
    return c.json(snapshot, snapshot.created ? 201 : 200);
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("no tiene respuestas") ? 400 : 500;
    return c.json({ error: message }, status);
  }
});

app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));

export default {
  port: Number(process.env.PORT ?? 3000),
  // La llamada a la IA puede tardar; el límite por defecto son 10 s.
  idleTimeout: 120,
  fetch: app.fetch,
};
