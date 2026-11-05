/**
 * Composición de informes y snapshots congelados.
 *
 * El motor (`gaps.ts`) calcula; la IA solo explica. Este módulo une ambas
 * piezas, cachea el informe por hash y guarda una foto inmutable del panel y
 * del informe para la pantalla de Informes.
 */

import { AXES, NON_COMPARISON_VALUES, groupOf } from "./catalog.ts";
import { calcGaps, type GapResult } from "./gaps.ts";
import {
  findReportSnapshot,
  getReportSnapshot,
  listInstruments,
  listReportSnapshots,
  loadAnalysis,
  loadInput,
  saveAnalysis,
  saveReportSnapshot,
  type Instrument,
  type ReportSnapshotRow,
} from "./db.ts";
import {
  analyze,
  buildFallbackReport,
  buildReportPayload,
  payloadHash,
  type Report,
  type ReportPayload,
  type ReportResult,
} from "./ai.ts";

const K = 10;
const K_CROSS = 20;
const DEPTH: 1 | 2 = 2;

/** Informes en vuelo: dos montajes simultáneos comparten una sola llamada. */
const pendingReports = new Map<string, Promise<ReportResult>>();

export type Panel = GapResult & {
  instrument: Instrument;
  k: number;
  kCross: number;
  axisValues: Record<string, string[]>;
  dimensions: (GapResult["dimensions"][number] & { group: string })[];
};

export type ReportSummary = {
  id: string;
  instrument_id: string;
  title: string;
  source: "ai" | "fallback";
  response_count: number;
  dimension_count: number;
  axis_count: number;
  created_at: string;
};

export type ReportDetail = ReportSummary & {
  panel: Panel;
  report: Report;
};

/** Instrumento pedido por id, o el más reciente. */
export function findInstrument(id?: string): Instrument | undefined {
  const all = listInstruments();
  return id ? all.find((instrument) => instrument.id === id) : all[0];
}

function selectedAxes(instrument: Instrument): string[] {
  try {
    const parsed = JSON.parse(instrument.axes) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((axis): axis is string => typeof axis === "string")
      : [];
  } catch {
    return [];
  }
}

/** Panel completo tal y como lo consume la vista de brechas. */
export function buildPanel(instrument: Instrument): Panel {
  const result = calcGaps(loadInput(instrument.id), {
    k: K,
    kCross: K_CROSS,
    depth: DEPTH,
    excludedValues: NON_COMPARISON_VALUES,
  });

  const dimensions = result.dimensions.map((dimension) => ({
    ...dimension,
    group: groupOf(dimension.dimension),
  }));

  const axes = selectedAxes(instrument);
  const axisValues = Object.fromEntries(
    AXES.filter((axis) => axes.includes(axis.id)).map((axis) => [
      axis.id,
      axis.values,
    ]),
  );

  return {
    instrument,
    k: K,
    kCross: K_CROSS,
    axisValues,
    ...result,
    dimensions,
  };
}

type ComposedReport = {
  payload: ReportPayload;
  hash: string;
  report: ReportResult;
  cached: boolean;
};

async function composeReportFromPayload(
  payload: ReportPayload,
): Promise<ComposedReport> {
  const model = process.env.OPENROUTER_MODEL?.trim() ?? "";
  const hash = payloadHash(payload, model);

  const cached = loadAnalysis(hash);
  if (cached) {
    try {
      return {
        payload,
        hash,
        cached: true,
        report: { source: "ai", ...(JSON.parse(cached) as Report) },
      };
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

  return { payload, hash, cached: false, report };
}

/** Informe al vuelo (lo usa `GET /api/report`). */
export async function composeReport(
  instrument: Instrument,
): Promise<ComposedReport> {
  const panel = buildPanel(instrument);
  const payload = buildReportPayload(panel, { k: K, kCross: K_CROSS });
  return composeReportFromPayload(payload);
}

export function listReports(): ReportSummary[] {
  return listReportSnapshots();
}

export function getReport(id: string): ReportDetail | null {
  const row = getReportSnapshot(id);
  if (!row) return null;

  return {
    id: row.id,
    instrument_id: row.instrument_id,
    title: row.instrument_title,
    source: row.source,
    response_count: row.response_count,
    dimension_count: row.dimension_count,
    axis_count: row.axis_count,
    created_at: row.created_at,
    panel: JSON.parse(row.panel_json) as Panel,
    report: JSON.parse(row.report_json) as Report,
  };
}

export type SnapshotOptions = { useAi?: boolean };

/**
 * Guarda (o reutiliza) un snapshot del cuestionario.
 *
 * La clave es instrumento + datos + fuente: así un informe de plantilla no
 * bloquea un informe con IA posterior para los mismos datos.
 */
export async function createReportSnapshot(
  instrument: Instrument,
  options: SnapshotOptions = {},
): Promise<{ id: string; created: boolean }> {
  const panel = buildPanel(instrument);
  if (panel.total === 0) {
    throw new Error("El cuestionario no tiene respuestas");
  }

  const payload = buildReportPayload(panel, { k: K, kCross: K_CROSS });
  const useAi = options.useAi !== false;
  const model = useAi
    ? (process.env.OPENROUTER_MODEL?.trim() ?? "")
    : "";
  const hash = payloadHash(payload, model);

  // Si ya hay un informe con IA para estos datos, es el que se reutiliza.
  const existingAi = findReportSnapshot(instrument.id, hash, "ai");
  if (existingAi) return { id: existingAi.id, created: false };

  let report: ReportResult;

  if (!useAi) {
    const existingFallback = findReportSnapshot(
      instrument.id,
      hash,
      "fallback",
    );
    if (existingFallback) return { id: existingFallback.id, created: false };
    report = { source: "fallback", ...buildFallbackReport(payload) };
  } else {
    report = (await composeReportFromPayload(payload)).report;
    if (report.source === "fallback") {
      const existingFallback = findReportSnapshot(
        instrument.id,
        hash,
        "fallback",
      );
      if (existingFallback) {
        return { id: existingFallback.id, created: false };
      }
    }
  }

  const existing = findReportSnapshot(instrument.id, hash, report.source);
  if (existing) return { id: existing.id, created: false };

  const id = `rep_${instrument.id}_${hash.slice(0, 12)}_${report.source}`;
  const row: ReportSnapshotRow = {
    id,
    instrument_id: instrument.id,
    instrument_title: instrument.title,
    payload_hash: hash,
    source: report.source,
    model: report.source === "ai" ? model : null,
    response_count: panel.total,
    dimension_count: panel.dimensions.length,
    axis_count: Object.keys(panel.axisValues).length,
    panel_json: JSON.stringify(panel),
    report_json: JSON.stringify({
      observaciones: report.observaciones,
      afrontamiento: report.afrontamiento,
      advertencias: report.advertencias,
    }),
    created_at: new Date().toISOString(),
  };

  saveReportSnapshot(row);

  // Dos peticiones simultáneas pueden insertar el mismo id; se relee.
  const saved = findReportSnapshot(instrument.id, hash, report.source);
  return { id: saved?.id ?? id, created: saved?.id === id };
}
