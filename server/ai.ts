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
const PROMPT_VERSION = "report-v3";

/** Brecha mínima para que un cruce entre el payload. */
const CROSS_RELEVANCE = 0.5;

/** Grupos por dimensión que se envían al modelo: los de mayor impacto. */
const GROUPS_PER_DIMENSION = 4;
const CONTRASTS_PER_DIMENSION = 2;

/** Términos que el informe nunca debe usar: son diagnósticos o acusaciones. */
const FORBIDDEN_TERMS =
  /discriminaci|dislexia|discalculia|tdah|autismo|asperger|trastorno|s[ií]ndrome|ansiedad|depresi[oó]n|hiperactividad|d[eé]ficit de atenci[oó]n/i;

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

export const SYSTEM_PROMPT = `Eres analista de equidad educativa para Equilens. Recibes un JSON con índices
agregados (0-100) ya calculados por el sistema, junto a tamaños de grupo y brechas.

REGLAS INVIOLABLES
1. No calcules, estimes ni inventes cifras. Usa exclusivamente los números del JSON.
   Si un dato no está, no lo menciones.
2. No interpretes grupos con n < 10. Indícalo en "advertencias".
3. No diagnostiques ni describas individuos. El análisis es agregado.
4. No uses la palabra "discriminación". Habla de "barreras declaradas" o
   "brechas de acceso".
5. No atribuyas causas que no estén presentes en los datos.
6. Prioriza por impacto: brecha × número de afectados.
7. Responde en español neutro, para un gestor escolar sin formación técnica.

SOBRE EL PRISMA PROFESIONAL
8. No nombres trastornos, condiciones clínicas ni diagnósticos. Si los datos sugieren
   una necesidad de apoyo, recomienda una evaluación por un profesional cualificado
   con instrumentos validados, sin ponerle nombre.
9. En "observaciones", explica los datos en lenguaje llano: qué grupo declara más
   barrera, cuánto, en qué dimensión y cuántas personas son. Sin tecnicismos.
10. En "afrontamiento", propón líneas de actuación realistas para una escuela, ONG o
    club. Cada línea indica en "derivacion" con quién validarla o qué evaluación
    profesional hace falta antes de actuar.
11. Sé breve y directo: en "titulo", máximo 8 palabras; en "detalle", una o dos
    frases (máximo 45 palabras); en "derivacion", máximo 25 palabras.
12. Devuelve entre 3 y 5 elementos en "observaciones" y entre 3 y 5 en
    "afrontamiento". No más.

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

function formatNumber(value: number, signed = false): string {
  const text = Math.abs(value).toFixed(1).replace(".", ",");
  if (!signed) return text;
  return value > 0 ? `+${text}` : value < 0 ? `−${text}` : "0,0";
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

/** Plantilla determinista: mismos números, sin red y sin interpretación libre. */
export function buildFallbackReport(payload: ReportPayload): Report {
  const ranked = rankGroups(payload);
  const observations: ReportObservation[] = [];
  const usedDimensions = new Set<string>();

  for (const item of ranked) {
    if (usedDimensions.has(item.dimensionName)) continue;
    usedDimensions.add(item.dimensionName);
    observations.push({
      titulo: `Brecha en ${item.dimensionName.toLowerCase()}`,
      detalle: `${item.name} declara ${formatNumber(item.gap, true)} puntos más de barrera que el conjunto en ${item.dimensionName.toLowerCase()}. Son ${item.n} personas.`,
    });
    if (observations.length === 2) break;
  }

  const lowest = [...ranked].sort((a, b) => a.gap - b.gap)[0];
  if (lowest && observations.length < 4) {
    observations.push({
      titulo: "Dónde hay menos barrera",
      detalle: `Entre los grupos con brecha positiva, ${lowest.name} es el más cercano al conjunto: ${formatNumber(lowest.gap, true)} puntos en ${lowest.dimensionName.toLowerCase()}.`,
    });
  }

  const highestLevel = [...payload.dimensions].sort((a, b) => b.index - a.index)[0];
  if (highestLevel) {
    observations.push({
      titulo: "Dimensión con más barrera declarada",
      detalle: `${highestLevel.name} es la dimensión con el nivel más alto del conjunto: ${formatNumber(highestLevel.index)} sobre 100.`,
    });
  }

  if (observations.length < 3) {
    observations.push({
      titulo: "Lectura general",
      detalle:
        "Los datos publicados no muestran diferencias suficientes para señalar un grupo concreto. Conviene ampliar la muestra antes de extraer conclusiones.",
    });
  }

  const top = ranked[0];
  const actions = actionsFor(top?.dimensionGroup ?? "contexto", top?.dimensionName);

  const advertencias: string[] = [];
  if (payload.suppressed.length > 0) {
    advertencias.push(
      `No se publican estas comparaciones porque alguna celda tiene menos de ${payload.sample.kCross} personas: ${payload.suppressed.join(", ")}.`,
    );
  }
  advertencias.push(
    "El informe usa autoinformes agregados: no identifica ni evalúa a personas concretas.",
  );

  return {
    observaciones: observations.slice(0, 4),
    afrontamiento: actions,
    advertencias: advertencias.slice(0, 3),
  };
}

function actionsFor(group: string, dimension?: string): ReportAction[] {
  const focus = dimension ? ` en ${dimension.toLowerCase()}` : "";

  const byGroup: Record<string, ReportAction> = {
    acceso: {
      titulo: "Revisar el acceso técnico",
      detalle: `Priorizar equipo disponible y conexión estable para las actividades${focus}: préstamo de dispositivos, franjas con red fiable y materiales que funcionen sin conexión.`,
      derivacion:
        "Validar con el equipo técnico y la dirección antes de asignar recursos.",
    },
    barreras: {
      titulo: "Revisar la accesibilidad de los materiales",
      detalle: `Revisar contraste, tamaño de letra, subtítulos y alternativas al uso del ratón${focus}. Son ajustes de bajo coste que reducen barreras declaradas.`,
      derivacion:
        "Contrastar con especialistas en accesibilidad y con las propias personas afectadas.",
    },
    contexto: {
      titulo: "Ajustar horarios y canales de participación",
      detalle: `Ofrecer más de una franja y más de un canal para participar${focus}, y revisar cómo se comunican las expectativas y las normas del grupo.`,
      derivacion:
        "Contrastar con el equipo pedagógico u orientación antes de cambiar la organización.",
    },
  };

  return [
    byGroup[group] ?? byGroup.contexto!,
    {
      titulo: "Escuchar a los grupos con más barrera",
      detalle:
        "Contrastar el dato agregado con las personas afectadas mediante una sesión o un grupo de discusión, sin registrar datos personales.",
      derivacion:
        "Acordar con el equipo responsable qué se pregunta y cómo se devuelve la información.",
    },
    {
      titulo: "Separar barrera declarada de diagnóstico",
      detalle:
        "Estos datos son autoinformes agregados y no permiten diagnosticar. Si aparece una necesidad de apoyo concreta, conviene derivarla a una evaluación profesional.",
      derivacion:
        "Derivar a orientación o a un profesional cualificado con instrumentos validados; nunca concluir desde este informe.",
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
