/**
 * Banco de preguntas, dimensiones y ejes de corte.
 *
 * El gestor elige de aquí. Un instrumento es una selección de dimensiones
 * (lo que se mide) y de ejes (con quién se compara).
 *
 * Cada subtipo de barrera o de apoyo es una dimensión propia: así tiene su
 * nota y se puede decir "visual: 35 de barrera", no un promedio que mezcla
 * cosas distintas. Los grupos (`acceso`, `barreras`, `apoyo`) solo agrupan
 * la navegación; no se calculan.
 *
 * Los ids y valores del catálogo son datos: se quedan en español y no se
 * traducen. Los enunciados son provisionales: los redacta y valida el equipo
 * pedagógico. Los pesos también los define quien valida el instrumento;
 * hoy todos valen lo mismo para no inventar importancia.
 */

export type DimensionGroup = "acceso" | "barreras" | "apoyo";

export type CatalogQuestion = {
  code: string;
  dimension: string;
  weight: number;
  statement: string;
};

export type CatalogDimension = {
  id: string;
  group: DimensionGroup;
  name: string;
  description: string;
  questions: CatalogQuestion[];
};

export type CatalogAxis = {
  id: string;
  name: string;
  description: string;
  values: string[];
};

/** Orden de las cabeceras en la interfaz. Los nombres viven en `texts.ts`. */
export const DIMENSION_GROUPS: DimensionGroup[] = ["acceso", "barreras", "apoyo"];

export const DIMENSIONS: CatalogDimension[] = [
  {
    id: "conectividad",
    group: "acceso",
    name: "Conectividad",
    description: "Si la conexión alcanza para seguir las clases.",
    questions: [
      {
        code: "con_1",
        dimension: "conectividad",
        weight: 1,
        statement: "¿Se corta tu conexión durante las clases?",
      },
      {
        code: "con_2",
        dimension: "conectividad",
        weight: 1,
        statement: "¿Te quedas sin datos antes de terminar el mes?",
      },
    ],
  },
  {
    id: "dispositivos",
    group: "acceso",
    name: "Dispositivos",
    description: "Con qué equipo estudia y cuánto puede usarlo.",
    questions: [
      {
        code: "dis_1",
        dimension: "dispositivos",
        weight: 1,
        statement: "¿Tu dispositivo se cuelga o falla durante las clases?",
      },
      {
        code: "dis_2",
        dimension: "dispositivos",
        weight: 1,
        statement: "¿Tienes que compartir el dispositivo con otras personas?",
      },
      {
        code: "dis_3",
        dimension: "dispositivos",
        weight: 1,
        statement:
          "¿Haces las tareas desde el móvil porque no tienes otro equipo?",
      },
    ],
  },

  // Barreras de acceso — discapacidades de nivel 1: identificables.
  {
    id: "visual",
    group: "barreras",
    name: "Visual",
    description: "Dificultad declarada para ver la pizarra o la pantalla.",
    questions: [
      {
        code: "bar_visual",
        dimension: "visual",
        weight: 1,
        statement: "¿Te cuesta ver con claridad la pizarra o la pantalla?",
      },
    ],
  },
  {
    id: "auditiva",
    group: "barreras",
    name: "Auditiva",
    description: "Dificultad declarada para oír lo que se dice en clase.",
    questions: [
      {
        code: "bar_auditiva",
        dimension: "auditiva",
        weight: 1,
        statement: "¿Te cuesta oír lo que se dice en clase?",
      },
    ],
  },
  {
    id: "motriz",
    group: "barreras",
    name: "Motriz",
    description: "Dificultad declarada para desplazarse o usar el equipo.",
    questions: [
      {
        code: "bar_motriz",
        dimension: "motriz",
        weight: 1,
        statement: "¿Te cuesta desplazarte o usar el teclado y el ratón?",
      },
    ],
  },
  {
    id: "habla",
    group: "barreras",
    name: "Habla",
    description: "Dificultad declarada para expresarse hablando.",
    questions: [
      {
        code: "bar_habla",
        dimension: "habla",
        weight: 1,
        statement: "¿Te cuesta expresarte hablando para participar?",
      },
    ],
  },
  {
    id: "salud",
    group: "barreras",
    name: "Salud crónica",
    description: "Una condición de salud que condiciona la asistencia.",
    questions: [
      {
        code: "bar_salud",
        dimension: "salud",
        weight: 1,
        statement:
          "¿Una condición de salud te impide seguir el ritmo de las clases?",
      },
    ],
  },

  // Necesidades de apoyo — nivel 2: señales, nunca diagnóstico.
  {
    id: "tdah",
    group: "apoyo",
    name: "Señales TDAH",
    description: "Señales de atención. No es un diagnóstico.",
    questions: [
      {
        code: "apo_tdah",
        dimension: "tdah",
        weight: 1,
        statement: "¿Te cuesta mantener la atención en tareas largas?",
      },
    ],
  },
  {
    id: "tea",
    group: "apoyo",
    name: "Señales TEA",
    description: "Señales de comunicación social. No es un diagnóstico.",
    questions: [
      {
        code: "apo_tea",
        dimension: "tea",
        weight: 1,
        statement: "¿Te cuesta entender las normas sociales del aula?",
      },
    ],
  },
  {
    id: "dislexia",
    group: "apoyo",
    name: "Señales dislexia",
    description: "Señales de lectura. No es un diagnóstico.",
    questions: [
      {
        code: "apo_dislexia",
        dimension: "dislexia",
        weight: 1,
        statement: "¿Te cuesta leer con fluidez?",
      },
    ],
  },
  {
    id: "discalculia",
    group: "apoyo",
    name: "Señales discalculia",
    description: "Señales de cálculo. No es un diagnóstico.",
    questions: [
      {
        code: "apo_discalculia",
        dimension: "discalculia",
        weight: 1,
        statement: "¿Te cuestan los cálculos y las cantidades?",
      },
    ],
  },
];

export const AXES: CatalogAxis[] = [
  {
    id: "genero",
    name: "Género",
    description: "Género declarado.",
    values: ["mujer", "hombre"],
  },
  {
    id: "edad",
    name: "Edad",
    description: "Tramo de edad del grupo.",
    values: ["12-14", "15-16", "17-18"],
  },
  {
    id: "idioma",
    name: "Idioma",
    description: "Si la lengua de casa coincide con la de las clases.",
    values: ["igual", "distinta"],
  },
  {
    id: "ubicacion",
    name: "Ubicación",
    description: "Dónde vive la persona.",
    values: ["urbana", "periurbana", "rural"],
  },
];

export const questionsOf = (dimensions: string[]): CatalogQuestion[] =>
  DIMENSIONS.filter((d) => dimensions.includes(d.id)).flatMap(
    (d) => d.questions,
  );

/** Grupo de navegación de una dimensión. */
export const groupOf = (dimension: string): DimensionGroup =>
  DIMENSIONS.find((d) => d.id === dimension)?.group ?? "acceso";
