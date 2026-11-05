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
  NON_COMPARISON_VALUES,
  questionsOf,
} from "./catalog.ts";
import { calcGaps } from "./gaps.ts";
import {
  listInstruments,
  listSummaries,
  loadAnalysis,
  loadInput,
  saveAnalysis,
  saveInstrument,
  saveQuestion,
} from "./db.ts";
import {
  analyze,
  buildReportPayload,
  payloadHash,
  type ReportResult,
} from "./ai.ts";
import { simulateResponses } from "./simulate.ts";

const K = 10;
const K_CROSS = 20;
const DEPTH: 1 | 2 = 2;

/** Informes en vuelo: dos montajes simultáneos comparten una sola llamada. */
const pendingReports = new Map<string, Promise<ReportResult>>();

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

  const created = simulateResponses(instrument.id, 800);
  return c.json({ responses: created });
});

app.get("/api/panel", (c) => {
  const instrument = currentInstrument(c.req.query("instrument"));
  if (!instrument) {
    return c.json({ error: "No hay instrumentos. Ejecuta `bun run seed`." }, 404);
  }

  const result = calcGaps(loadInput(instrument.id), {
    k: K,
    kCross: K_CROSS,
    depth: DEPTH,
    excludedValues: NON_COMPARISON_VALUES,
  });

  // El grupo de navegación no se calcula: sale del catálogo.
  const dimensions = result.dimensions.map((d) => ({
    ...d,
    group: groupOf(d.dimension),
  }));

  const axisValues = Object.fromEntries(
    AXES.map((axis) => [axis.id, axis.values]),
  );

  return c.json({
    instrument,
    k: K,
    kCross: K_CROSS,
    axisValues,
    ...result,
    dimensions,
  });
});

app.get("/api/report", async (c) => {
  const instrument = currentInstrument(c.req.query("instrument"));
  if (!instrument) {
    return c.json({ error: "No hay instrumentos. Ejecuta `bun run seed`." }, 404);
  }

  const result = calcGaps(loadInput(instrument.id), {
    k: K,
    kCross: K_CROSS,
    depth: DEPTH,
    excludedValues: NON_COMPARISON_VALUES,
  });

  const payload = buildReportPayload(result, { k: K, kCross: K_CROSS });
  const model = process.env.OPENROUTER_MODEL?.trim() ?? "";
  const hash = payloadHash(payload, model);

  const cached = loadAnalysis(hash);
  if (cached) {
    try {
      return c.json({
        source: "ai",
        cached: true,
        report: JSON.parse(cached),
      });
    } catch {
      // Caché corrupta: se regenera.
    }
  }

  let pending = pendingReports.get(hash);
  if (!pending) {
    pending = analyze(payload);
    pendingReports.set(hash, pending);
    pending
      .catch(() => undefined)
      .finally(() => pendingReports.delete(hash));
  }

  const report = await pending;
  if (report.source === "ai") {
    saveAnalysis(
      hash,
      JSON.stringify({
        observaciones: report.observaciones,
        afrontamiento: report.afrontamiento,
        advertencias: report.advertencias,
      }),
    );
  }

  c.header("Cache-Control", "no-store");
  return c.json({ source: report.source, cached: false, report });
});

app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));

export default {
  port: Number(process.env.PORT ?? 3000),
  // La llamada a la IA puede tardar; el límite por defecto son 10 s.
  idleTimeout: 120,
  fetch: app.fetch,
};
