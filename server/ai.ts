/**
 * Informe en lenguaje llano a partir de los agregados ya calculados.
 *
 * Reparto de responsabilidades (AGENTS.md):
 *   - El motor calcula índices, brechas y supresión.
 *   - La IA solo explica esos números; no calcula, no estima, no inventa.
 *
 * Si falta configuración, la API falla o la respuesta no cumple el contrato,
 * se sirve una plantilla determinista con los MISMOS números del payload.
 */

import { createHash } from "node:crypto";
import { OpenRouter } from "@openrouter/sdk";
import { z } from "zod";
import {
  axisName,
  axisValueLabel,
  DIMENSION_GROUP_NAMES,
  DIMENSIONS,
  groupOf,
} from "./catalog.ts";
import type { GapResult } from "./gaps.ts";

/** Sube cuando cambia el prompt o el contrato: invalida la caché. */
const PROMPT_VERSION = "report-v6";

/** Brecha mínima para que un cruce entre el payload. */
const CROSS_RELEVANCE = 0.5;

/** Grupos por dimensión que se envían al modelo: los de mayor impacto. */
const GROUPS_PER_DIMENSION = 4;
const CONTRASTS_PER_DIMENSION = 2;

/** Términos que el informe nunca debe usar: son diagnósticos o acusaciones. */
const FORBIDDEN_TERMS =
  /discriminaci|dislexia|discalculia|tdah|autismo|asperger|trastorno|s[ií]ndrome|ansiedad|depresi[oó]n|hiperactividad|d[eé]ficit de atenci[oó]n/i;

/** Jerga que no debe aparecer en "observaciones": el gestor no la conoce. */
const OBSERVATION_JARGON =
  /brecha|índice|indice|\bdimensi[oó]n\b|promedio|punto de corte|\bpuntos\b|\bla media\b|escala|0\s*a\s*100/i;

export type ReportPayload = {
  sample: { responses: number; k: number; kCross: number };
  dimensions: {
    id: string;
    name: string;
    group: string;
    index: number;
    groups: {
      axes: string;
      name: string;
      n: number;
      index: number;
      gap: number;
    }[];
  }[];
  suppressed: string[];
};

export type ReportObservation = { titulo: string; detalle: string };
export type ReportAction = {
  titulo: string;
  detalle: string;
  derivacion: string;
};

export type Report = {
  observaciones: ReportObservation[];
  afrontamiento: ReportAction[];
  advertencias: string[];
};

export type ReportResult = Report & { source: "ai" | "fallback" };

/** Contrato de salida del modelo. Claves en español, fijadas por el prompt. */
const reportSchema = z
  .object({
    observaciones: z
      .array(
        z
          .object({
            titulo: z.string().trim().min(3).max(100),
            detalle: z.string().trim().min(20).max(600),
          })
          .strict(),
      )
      .min(3)
      .max(5),
    afrontamiento: z
      .array(
        z
          .object({
            titulo: z.string().trim().min(3).max(100),
            detalle: z.string().trim().min(20).max(600),
            derivacion: z.string().trim().min(10).max(400),
          })
          .strict(),
      )
      .min(3)
      .max(5),
    advertencias: z.array(z.string().trim().min(10).max(300)).max(4),
  })
  .strict();

export const SYSTEM_PROMPT = `Eres analista de equidad educativa para Equilens. Recibes un JSON con niveles
de barrera (de 0 a 100) ya calculados, tamaños de grupo y diferencias con la media.

REGLAS INVIOLABLES
1. No calcules, estimes ni inventes cifras. Usa exclusivamente los números del JSON.
   Si un dato no está, no lo menciones.
2. No interpretes grupos con n < 10. Si no hay ninguno en el JSON, no lo menciones.
3. No diagnostiques ni describas individuos. El análisis es agregado.
4. No uses la palabra "discriminación". Habla de "barreras declaradas".
5. No atribuyas causas que no estén presentes en los datos.
6. Prioriza por impacto: diferencia × número de personas.
7. Español neutro, para un gestor escolar sin formación técnica.

CÓMO ESCRIBIR
8. Escribe para alguien que no ha visto las gráficas y no sabe estadística.
   Frases cortas. Una idea por punto. Máximo 2 frases y 25 palabras.
9. En "observaciones" no cites cifras ni expliques cálculos. Fuera de las
   edades que forman parte del nombre de un grupo, no escribas números.
   No uses "brecha", "índice", "dimensión", "media", "promedio", "puntos",
   "escala" ni "0 a 100".
10. Cada observación es una conclusión, no un dato. Nombra al grupo y el tema
    con palabras de todos los días: "les cuesta más", "encuentran más
    obstáculos", "participan menos", "tienen menos oportunidades".
11. Empieza por el grupo y por lo que le ocurre. No empieces por el cálculo
    ni por la cifra.
12. En "observaciones", 3 o 4 puntos. En "afrontamiento", 3 o 4 acciones concretas
    y realistas para una escuela, ONG o club. En "derivacion", di en lenguaje llano
    con quién consultarlo antes de actuar.
13. No nombres trastornos, condiciones clínicas ni diagnósticos. Si hace falta apoyo
    especializado, recomienda una evaluación por un profesional cualificado con
    instrumentos validados, sin ponerle nombre.
14. En "advertencias", solo 2 o 3 frases: límites de los datos y grupos pequeños.
15. No repitas el mismo grupo en varios puntos. Si un grupo destaca en varios temas,
    resúmelo en una sola frase y usa los demás puntos para otros grupos.

EJEMPLO DE TONO (sin cifras)
título: "Quienes viven en zonas rurales encuentran más dificultades para conectarse"
detalle: "Les cuesta más seguir las actividades por internet. Conviene preguntarles qué necesitan."

DEVUELVE ÚNICAMENTE ESTE JSON:
{ "observaciones": [{ "titulo": string, "detalle": string }],
  "afrontamiento": [{ "titulo": string, "detalle": string, "derivacion": string }],
  "advertencias": string[] }`;

export type BuildOptions = { k: number; kCross: number };

type PayloadGroup = ReportPayload["dimensions"][number]["groups"][number];

/**
 * Reduce el payload a lo que el informe necesita: los grupos con más impacto
 * (brecha × personas) y un par de contrastes con menos barrera.
 */
function mostRelevant(groups: PayloadGroup[]): PayloadGroup[] {
  const positives = groups
    .filter((group) => group.gap > 0)
    .sort((a, b) => b.gap * b.n - a.gap * a.n)
    .slice(0, GROUPS_PER_DIMENSION);

  const negatives = groups
    .filter((group) => group.gap < 0)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, CONTRASTS_PER_DIMENSION);

  return [...positives, ...negatives].sort((a, b) => b.gap - a.gap);
}

/** Construye el payload: solo tablas publicadas y valores comparables. */
export function buildReportPayload(
  result: GapResult,
  options: BuildOptions,
): ReportPayload {
  const dimensionNames = new Map(
    DIMENSIONS.map((dimension) => [dimension.id, dimension.name]),
  );

  const dimensions = result.dimensions
    .filter(
      (dimension): dimension is typeof dimension & { index: number } =>
        dimension.index !== null,
    )
    .map((dimension) => {
      const groups = result.tables
        .filter((table) => !table.suppressed)
        .flatMap((table) =>
          table.groups.flatMap((group) => {
            const index = group.indices[dimension.dimension];
            const gap = group.gaps[dimension.dimension];
            if (index === null || index === undefined) return [];
            if (gap === null || gap === undefined) return [];

            const isCross = table.axes.length > 1;
            if (isCross && Math.abs(gap) < CROSS_RELEVANCE) return [];
            if (group.n === null) return [];

            return [
              {
                axes: table.axes.map(axisName).join(" × "),
                name: table.axes
                  .map((axis) => axisValueLabel(axis, group.axes[axis] ?? ""))
                  .join(" · "),
                n: group.n,
                index,
                gap,
              },
            ];
          }),
        );

      return {
        id: dimension.dimension,
        name: dimensionNames.get(dimension.dimension) ?? dimension.dimension,
        group: DIMENSION_GROUP_NAMES[groupOf(dimension.dimension)],
        index: dimension.index,
        groups: mostRelevant(groups),
      };
    })
    .filter((dimension) => dimension.groups.length > 0);

  const suppressed = result.tables
    .filter((table) => table.suppressed)
    .map((table) => table.axes.map(axisName).join(" × "));

  return {
    sample: {
      responses: result.total,
      k: options.k,
      kCross: options.kCross,
    },
    dimensions,
    suppressed,
  };
}

export function payloadHash(payload: ReportPayload, model: string): string {
  return createHash("sha256")
    .update(JSON.stringify({ version: PROMPT_VERSION, model, payload }))
    .digest("hex");
}

/** Todos los números que el modelo puede citar. */
function allowedNumbers(payload: ReportPayload): Set<string> {
  const values = new Set<string>(["0"]);
  const add = (value: number) => {
    values.add(String(value));
    values.add(value.toFixed(1).replace(".", ","));
    values.add(value.toFixed(1));
    values.add(String(Math.round(value)));
  };

  add(payload.sample.responses);
  add(payload.sample.k);
  add(payload.sample.kCross);

  for (const dimension of payload.dimensions) {
    add(dimension.index);
    for (const group of dimension.groups) {
      add(group.n);
      add(Math.abs(group.gap));
      add(group.gap);
    }
  }

  // Números que forman parte de nombres ("18 a 34 años", "55 años o más").
  for (const match of JSON.stringify(payload).match(/\d+(?:[.,]\d+)?/g) ?? []) {
    values.add(match);
    const value = Number(match.replace(",", "."));
    if (Number.isFinite(value)) {
      values.add(String(value));
      values.add(value.toFixed(1));
      values.add(value.toFixed(1).replace(".", ","));
    }
  }

  return values;
}

function hasOnlyKnownNumbers(text: string, allowed: Set<string>): boolean {
  const matches = text.match(/-?\d+(?:[.,]\d+)?/g) ?? [];

  for (const match of matches) {
    const normalized = match.replace("−", "-").replace(",", ".");
    if (allowed.has(normalized) || allowed.has(match)) continue;

    const value = Number(normalized);
    if (!Number.isFinite(value)) return false;

    // Acepta el mismo valor con y sin decimales.
    if (
      allowed.has(String(value)) ||
      allowed.has(value.toFixed(1)) ||
      allowed.has(value.toFixed(1).replace(".", ","))
    ) {
      continue;
    }

    return false;
  }

  return true;
}

/** Números que forman parte de un nombre de grupo ("18-34", "55"). */
function labelNumbers(payload: ReportPayload): Set<string> {
  const values = new Set<string>();

  for (const dimension of payload.dimensions) {
    for (const group of dimension.groups) {
      for (const match of group.name.match(/\d+(?:[.,]\d+)?/g) ?? []) {
        values.add(match);
        values.add(match.replace(",", "."));
      }
    }
  }

  return values;
}

/** En observaciones solo se permiten cifras que formen parte de un nombre de grupo. */
function hasOnlyLabelNumbers(text: string, allowed: Set<string>): boolean {
  const matches = text.match(/\d+(?:[.,]\d+)?/g) ?? [];

  return matches.every((match) => {
    const normalized = match.replace(",", ".");
    return allowed.has(match) || allowed.has(normalized);
  });
}

function outputProblem(report: Report, payload: ReportPayload): string | null {
  const allowed = allowedNumbers(payload);
  const texts = [
    ...report.observaciones.flatMap((item) => [item.titulo, item.detalle]),
    ...report.afrontamiento.flatMap((item) => [
      item.titulo,
      item.detalle,
      item.derivacion,
    ]),
    ...report.advertencias,
  ];

  if (texts.some((text) => FORBIDDEN_TERMS.test(text))) {
    return "usa términos clínicos o acusatorios";
  }

  if (!texts.every((text) => hasOnlyKnownNumbers(text, allowed))) {
    return "cita cifras que no están en el payload";
  }

  const observations = report.observaciones.flatMap((item) => [
    item.titulo,
    item.detalle,
  ]);

  if (observations.some((text) => OBSERVATION_JARGON.test(text))) {
    return "usa jerga técnica en las observaciones";
  }

  const labels = labelNumbers(payload);
  if (!observations.every((text) => hasOnlyLabelNumbers(text, labels))) {
    return "cita cifras en las observaciones";
  }

  return null;
}

function extractContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (part && typeof part === "object" && "text" in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("");
}

function parseJson(raw: string): unknown {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return clampLists(JSON.parse(trimmed.slice(start, end + 1)));
  } catch {
    return null;
  }
}

/** El contrato admite 3–5 elementos; si el modelo se pasa, se recorta. */
function clampLists(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;

  const record = value as Record<string, unknown>;
  for (const key of ["observaciones", "afrontamiento", "advertencias"]) {
    const list = record[key];
    if (Array.isArray(list) && list.length > 5) {
      record[key] = list.slice(0, 5);
    }
  }
  return record;
}

function config(): { apiKey: string; model: string } | null {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  if (!apiKey || !model) return null;
  return { apiKey, model };
}

export function aiEnabled(): boolean {
  return config() !== null;
}

/** Llama a OpenRouter y valida el contrato. Devuelve null si no es fiable. */
async function askModel(
  payload: ReportPayload,
  settings: { apiKey: string; model: string },
): Promise<Report | null> {
  const client = new OpenRouter({
    apiKey: settings.apiKey,
    appTitle: "Equilens",
  });

  const response = await client.chat.send(
    {
      chatRequest: {
        model: settings.model,
        temperature: 0,
        maxTokens: 3000,
        reasoning: { effort: "none" },
        responseFormat: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(payload) },
        ],
      },
    },
    { timeoutMs: 30_000, retries: { strategy: "none" } },
  );

  const choice = Array.isArray(response.choices) ? response.choices[0] : undefined;
  const raw = extractContent(choice?.message?.content);
  if (!raw) {
    console.warn(
      `[ai] respuesta vacía del modelo (finish: ${choice?.finishReason ?? "?"}, tokens: ${response.usage?.completionTokens ?? "?"}, razonamiento: ${response.usage?.completionTokensDetails?.reasoningTokens ?? "?"})`,
    );
    return null;
  }

  const parsed = reportSchema.safeParse(parseJson(raw));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "raíz"}: ${issue.message}`)
      .join(" | ");
    console.warn(`[ai] respuesta descartada: no cumple el contrato (${issues})`);
    return null;
  }

  const report = parsed.data;
  const problem = outputProblem(report, payload);
  if (problem) {
    console.warn(`[ai] respuesta descartada: ${problem}`);
    return null;
  }

  return report;
}

type RankedGroup = {
  dimensionName: string;
  dimensionGroup: string;
  axes: string;
  name: string;
  n: number;
  gap: number;
  index: number;
};

function rankGroups(payload: ReportPayload): RankedGroup[] {
  return payload.dimensions
    .flatMap((dimension) =>
      dimension.groups.map((group) => ({
        dimensionName: dimension.name,
        dimensionGroup: dimension.group,
        axes: group.axes,
        name: group.name,
        n: group.n,
        gap: group.gap,
        index: group.index,
      })),
    )
    .filter((group) => group.gap > 0)
    .sort((a, b) => b.gap * b.n - a.gap * a.n);
}

/** Plantilla determinista: mismas conclusiones, sin red y sin interpretación libre. */
export function buildFallbackReport(payload: ReportPayload): Report {
  const ranked = rankGroups(payload);
  const observations: ReportObservation[] = [];

  // Dos grupos distintos, en temas distintos, si los datos lo permiten.
  const usedDimensions = new Set<string>();
  const usedGroups = new Set<string>();
  const picks: RankedGroup[] = [];

  for (const item of ranked) {
    if (usedDimensions.has(item.dimensionName) || usedGroups.has(item.name)) continue;
    picks.push(item);
    usedDimensions.add(item.dimensionName);
    usedGroups.add(item.name);
    if (picks.length === 2) break;
  }

  if (picks.length < 2) {
    for (const item of ranked) {
      if (usedDimensions.has(item.dimensionName)) continue;
      picks.push(item);
      usedDimensions.add(item.dimensionName);
      if (picks.length === 2) break;
    }
  }

  for (const item of picks) {
    observations.push({
      titulo: `${item.name}, con más dificultades en ${item.dimensionName.toLowerCase()}`,
      detalle:
        "Este grupo encuentra más obstáculos que el resto en este tema. Conviene escuchar qué le frena.",
    });
  }

  const highestLevel = [...payload.dimensions].sort((a, b) => b.index - a.index)[0];
  if (highestLevel) {
    observations.push({
      titulo: "El tema con más dificultades",
      detalle: `${highestLevel.name} es el tema donde se declaran más dificultades. Es un buen punto para empezar.`,
    });
  }

  if (observations.length < 3) {
    observations.push({
      titulo: "Sin diferencias claras",
      detalle:
        "Los datos no muestran un grupo con más dificultades que el resto. Conviene ampliar la muestra antes de sacar conclusiones.",
    });
  }

  const top = ranked[0];
  const actions = actionsFor(top?.dimensionGroup ?? "contexto");

  const advertencias: string[] = [];
  if (payload.suppressed.length > 0) {
    advertencias.push(
      "Algunas comparaciones no se muestran porque hay grupos demasiado pequeños para proteger el anonimato.",
    );
  }
  advertencias.push("Son autoinformes: no permiten diagnosticar a nadie.");

  return {
    observaciones: observations.slice(0, 4),
    afrontamiento: actions,
    advertencias: advertencias.slice(0, 3),
  };
}

function actionsFor(group: string): ReportAction[] {
  const byGroup: Record<string, ReportAction> = {
    acceso: {
      titulo: "Facilitar equipo y conexión",
      detalle:
        "Ofrece préstamo de dispositivos y una conexión estable para las actividades. Los materiales también pueden funcionar sin conexión.",
      derivacion:
        "Consúltalo con el equipo técnico antes de comprar o asignar recursos.",
    },
    barreras: {
      titulo: "Revisar si los materiales son accesibles",
      detalle:
        "Comprueba el contraste, el tamaño de letra, los subtítulos y las alternativas al ratón. Son cambios sencillos y baratos.",
      derivacion:
        "Consúltalo con especialistas en accesibilidad y con las personas afectadas.",
    },
    contexto: {
      titulo: "Dar más opciones para participar",
      detalle:
        "Ofrece otra franja horaria y otro canal, y revisa cómo se comunican las normas del grupo.",
      derivacion:
        "Consúltalo con el equipo pedagógico antes de cambiar la organización.",
    },
  };

  return [
    byGroup[group] ?? byGroup.contexto!,
    {
      titulo: "Escuchar a los grupos con más barreras",
      detalle:
        "Habla con las personas afectadas en una sesión, sin recoger datos personales.",
      derivacion:
        "Acuerda con el equipo qué se pregunta y cómo se devuelve la información.",
    },
    {
      titulo: "No convertir esto en un diagnóstico",
      detalle:
        "Son autoinformes agregados: no permiten diagnosticar a nadie. Si hace falta apoyo, deriva el caso.",
      derivacion:
        "Que lo valore un profesional cualificado con instrumentos validados.",
    },
  ];
}

function normalizeReport(report: Report): Report {
  const fix = (text: string) => text.replace(/(\d)\.(\d)/g, "$1,$2");

  return {
    observaciones: report.observaciones.map((item) => ({
      titulo: fix(item.titulo),
      detalle: fix(item.detalle),
    })),
    afrontamiento: report.afrontamiento.map((item) => ({
      titulo: fix(item.titulo),
      detalle: fix(item.detalle),
      derivacion: fix(item.derivacion),
    })),
    advertencias: report.advertencias.map(fix),
  };
}

/** Punto de entrada: IA si está configurada y responde; si no, plantilla. */
export async function analyze(
  payload: ReportPayload,
  settings = config(),
): Promise<ReportResult> {
  if (settings) {
    try {
      const report = await askModel(payload, settings);
      if (report) return { source: "ai", ...normalizeReport(report) };
    } catch (error) {
      console.warn("[ai] OpenRouter no disponible:", (error as Error).message);
    }
  }

  return { source: "fallback", ...buildFallbackReport(payload) };
}
