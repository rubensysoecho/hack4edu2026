/**
 * Banco de preguntas, dimensiones y ejes de corte.
 *
 * El gestor elige de aquí. Un instrumento es una selección de dimensiones
 * (lo que se mide) y de ejes (con quién se compara).
 *
 * Cada sección del instrumento es una dimensión con su índice propio.
 * Los grupos (`acceso`, `barreras`, `contexto`) solo agrupan la navegación;
 * no se calculan. El equipo pedagógico puede dividir una sección en subtipos
 * si detecta constructos distintos.
 *
 * Los ids y valores del catálogo son datos: se quedan en español y no se
 * traducen. Los enunciados son provisionales: los redacta y valida el equipo
 * pedagógico. Los pesos también los define quien valida el instrumento;
 * hoy todos valen lo mismo para no inventar importancia.
 */

export type DimensionGroup = "acceso" | "barreras" | "contexto";

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
export const DIMENSION_GROUPS: DimensionGroup[] = [
  "acceso",
  "barreras",
  "contexto",
];

export const DIMENSIONS: CatalogDimension[] = [
  {
    id: "expectativas_genero",
    group: "contexto",
    name: "Expectativas y cuidados",
    description:
      "Expectativas, cuidados y normas que condicionan la participación digital.",
    questions: [
      {
        code: "gen_1",
        dimension: "expectativas_genero",
        weight: 1,
        statement:
          "Indica cuánto sientes que las expectativas de los demás asociadas a tu género (si las percibieras) influyen en tu seguridad al usar las herramientas digitales del grupo.",
      },
      {
        code: "gen_2",
        dimension: "expectativas_genero",
        weight: 1,
        statement:
          "Valora en qué medida los turnos o prioridades familiares para usar la tecnología en casa según el género (en caso de existir) limitan tu seguimiento diario en la entidad.",
      },
      {
        code: "gen_3",
        dimension: "expectativas_genero",
        weight: 1,
        statement:
          "Señala hasta qué punto las tareas domésticas o el cuidado de otras personas (si recayeran más sobre ti) interfieren en tu disponibilidad para las dinámicas online.",
      },
      {
        code: "gen_4",
        dimension: "expectativas_genero",
        weight: 1,
        statement:
          "Indica hasta qué punto la falta de referentes de tu mismo género en puestos tecnológicos dentro de la organización (si la notaras) reduce tu interés por participar.",
      },
      {
        code: "gen_5",
        dimension: "expectativas_genero",
        weight: 1,
        statement:
          "Valora cuánto crees que las normas o permisos en tu hogar sobre el uso de internet (si se aplicaran de forma distinta según el género) condicionan tu participación activa.",
      },
    ],
  },
  {
    id: "tiempo_edad",
    group: "contexto",
    name: "Tiempo y etapa vital",
    description:
      "Obligaciones y percepciones ligadas a la etapa vital.",
    questions: [
      {
        code: "eda_1",
        dimension: "tiempo_edad",
        weight: 1,
        statement:
          "Indica en qué grado consideras que la diferencia de edad respecto al resto de miembros (de darse el caso) afecta tu motivación e integración digital en el grupo.",
      },
      {
        code: "eda_2",
        dimension: "tiempo_edad",
        weight: 1,
        statement:
          "Valora en qué medida la velocidad de actualización o complejidad de las aplicaciones respecto a tu etapa de edad (si la sintieras) te genera inseguridad al participar.",
      },
      {
        code: "eda_3",
        dimension: "tiempo_edad",
        weight: 1,
        statement:
          "Señala hasta qué punto otras obligaciones propias de tu edad, como estudios externos o trabajo (si las realizaras), agotan tu energía para involucrarte en la plataforma.",
      },
      {
        code: "eda_4",
        dimension: "tiempo_edad",
        weight: 1,
        statement:
          "Indica cuánto consideras que las restricciones de horario o supervisión por motivos de edad (en caso de tenerlas) limitan tu autonomía dentro de la organización.",
      },
      {
        code: "eda_5",
        dimension: "tiempo_edad",
        weight: 1,
        statement:
          "Valora hasta qué punto la percepción de que ciertas herramientas digitales «no están pensadas para tu edad» (si alguna vez la has tenido) ha afectado tu desarrollo en la entidad.",
      },
    ],
  },
  {
    id: "dispositivos",
    group: "acceso",
    name: "Dispositivos",
    description:
      "Equipo, estado y disponibilidad para seguir las actividades.",
    questions: [
      {
        code: "dis_1",
        dimension: "dispositivos",
        weight: 1,
        statement:
          "Indica cuánto consideras que han afectado los fallos técnicos o la lentitud de tu equipo (si los hubiera) en tu experiencia dentro de la organización.",
      },
      {
        code: "dis_2",
        dimension: "dispositivos",
        weight: 1,
        statement:
          "Valora en qué medida el tamaño o estado físico de la pantalla que utilizas (en caso de no ser el adecuado) dificulta el seguimiento de los contenidos.",
      },
      {
        code: "dis_3",
        dimension: "dispositivos",
        weight: 1,
        statement:
          "Señala hasta qué punto el hecho de compartir tu dispositivo con otras personas (si fuera tu situación) interrumpe tu continuidad en las actividades.",
      },
      {
        code: "dis_4",
        dimension: "dispositivos",
        weight: 1,
        statement:
          "Indica hasta qué punto la incompatibilidad de tu equipo con las plataformas oficiales del club u organización (de presentarse) te ha hecho sentir en desventaja.",
      },
      {
        code: "dis_5",
        dimension: "dispositivos",
        weight: 1,
        statement:
          "Señala cuánto estimas que la falta de disponibilidad inmediata de un dispositivo cuando lo necesitas (si se diera el caso) afecta tu implicación general.",
      },
    ],
  },
  {
    id: "conectividad",
    group: "acceso",
    name: "Conectividad",
    description:
      "Cortes, datos, suministro y saturación de la red.",
    questions: [
      {
        code: "con_1",
        dimension: "conectividad",
        weight: 1,
        statement:
          "Indica cuánto consideras que las interrupciones o caídas de internet en tu entorno (si las hubiera) han afectado tu participación regular.",
      },
      {
        code: "con_2",
        dimension: "conectividad",
        weight: 1,
        statement:
          "Valora en qué medida la preocupación por agotar tu tarifa de datos móviles (en caso de tener un límite) condiciona el tiempo que permaneces conectado a la plataforma.",
      },
      {
        code: "con_3",
        dimension: "conectividad",
        weight: 1,
        statement:
          "Indica cuánto crees que las fluctuaciones o cortes en el suministro eléctrico de tu zona (de producirse) han interferido en tu conexión con la entidad.",
      },
      {
        code: "con_4",
        dimension: "conectividad",
        weight: 1,
        statement:
          "Valora en qué grado la saturación de la red cuando varias personas se conectan a la vez (si ocurriera) obstaculiza que completes tus gestiones o actividades a tiempo.",
      },
      {
        code: "con_5",
        dimension: "conectividad",
        weight: 1,
        statement:
          "Valora en qué medida la imposibilidad de acceder a los recursos en modo sin conexión (si te afectara) repercute en tu desempeño o participación.",
      },
    ],
  },
  {
    id: "lengua_comprension",
    group: "contexto",
    name: "Lengua y comprensión",
    description:
      "Dominio del idioma y comprensión de los mensajes.",
    questions: [
      {
        code: "idi_1",
        dimension: "lengua_comprension",
        weight: 1,
        statement:
          "Indica cuánto consideras que las diferencias entre tu idioma habitual y el que se utiliza en las plataformas (si las hubiera) afectan tu fluidez de participación.",
      },
      {
        code: "idi_2",
        dimension: "lengua_comprension",
        weight: 1,
        statement:
          "Valora en qué medida los tecnicismos o el lenguaje de los menús y comunicados (en caso de resultarte confusos) dificultan que te manejes de forma autónoma.",
      },
      {
        code: "idi_3",
        dimension: "lengua_comprension",
        weight: 1,
        statement:
          "Valora en qué grado la ausencia de subtítulos o apoyos visuales traducidos (de necesitarlos) limita tu integración en las dinámicas digitales.",
      },
      {
        code: "idi_4",
        dimension: "lengua_comprension",
        weight: 1,
        statement:
          "Señala cuánto consideras que la barrera idiomática en las comunicaciones oficiales (en caso de afectar a tu entorno familiar) dificulta su vinculación con la entidad.",
      },
      {
        code: "idi_5",
        dimension: "lengua_comprension",
        weight: 1,
        statement:
          "Indica hasta qué punto la falta de opción para configurar la interfaz en tu lengua materna (si fuera distinta a la principal) frena tu comodidad de uso.",
      },
    ],
  },
  {
    id: "accesibilidad",
    group: "barreras",
    name: "Accesibilidad",
    description:
      "Barreras visuales, auditivas, motrices y de atención.",
    questions: [
      {
        code: "acc_1",
        dimension: "accesibilidad",
        weight: 1,
        statement:
          "Indica cuánto consideras que las características visuales de las pantallas, como el brillo o tamaño de letra (si te resultaran incómodas), afectan tu lectura y seguimiento.",
      },
      {
        code: "acc_2",
        dimension: "accesibilidad",
        weight: 1,
        statement:
          "Valora en qué medida la cantidad de estímulos visuales o sonoros simultáneos en las aplicaciones (en caso de saturarte) perjudica tu atención.",
      },
      {
        code: "acc_3",
        dimension: "accesibilidad",
        weight: 1,
        statement:
          "Señala hasta qué punto la precisión exigida para usar el ratón, teclado o pantalla táctil (si te supusiera alguna dificultad física) enlentece tu interacción.",
      },
      {
        code: "acc_4",
        dimension: "accesibilidad",
        weight: 1,
        statement:
          "Indica cuánto crees que las deficiencias en la claridad sonora de los contenidos digitales (si te costara percibirlos) limitan tu participación en las sesiones.",
      },
      {
        code: "acc_5",
        dimension: "accesibilidad",
        weight: 1,
        statement:
          "Señala cuánto consideras que la falta de funciones de apoyo como lectores de voz o lupas (de serte útiles) ha reducido tu comodidad al interactuar.",
      },
    ],
  },
  {
    id: "entorno_desplazamiento",
    group: "contexto",
    name: "Entorno y desplazamiento",
    description:
      "Desplazamiento, espacio, apoyo técnico y horarios.",
    questions: [
      {
        code: "ent_1",
        dimension: "entorno_desplazamiento",
        weight: 1,
        statement:
          "Indica cuánto consideras que el tiempo y esfuerzo de desplazamiento hasta la sede de la organización o club (si fuera elevado) reduce tu energía para participar desde casa.",
      },
      {
        code: "ent_2",
        dimension: "entorno_desplazamiento",
        weight: 1,
        statement:
          "Valora en qué medida las condiciones de ruido, espacio o interrupciones en tu lugar habitual de conexión (de haberlas) afectan tu concentración.",
      },
      {
        code: "ent_3",
        dimension: "entorno_desplazamiento",
        weight: 1,
        statement:
          "Señala hasta qué punto la falta de espacios públicos cercanos con internet gratuito, como bibliotecas o centros cívicos (si no los hubiera en tu zona), limita tus opciones de acceso.",
      },
      {
        code: "ent_4",
        dimension: "entorno_desplazamiento",
        weight: 1,
        statement:
          "Indica cuánto crees que la dificultad para recibir ayuda técnica de alguien cercano cuando algo falla (en caso de no contar con ella) retrasa tu participación.",
      },
      {
        code: "ent_5",
        dimension: "entorno_desplazamiento",
        weight: 1,
        statement:
          "Indica hasta qué punto la imposibilidad de utilizar las instalaciones y equipos de la organización fuera del horario habitual (de necesitarlo) limita tu progreso.",
      },
    ],
  },
];

export const AXES: CatalogAxis[] = [
  {
    id: "genero",
    name: "Género",
    description: "¿Con qué género te identificas?",
    values: ["mujer", "hombre", "otra", "prefiero_no_responder"],
  },
  {
    id: "edad",
    name: "Edad",
    description: "¿En qué tramo de edad te encuentras?",
    values: ["menos_18", "18-34", "35-54", "55_mas", "prefiero_no_responder"],
  },
  {
    id: "ubicacion",
    name: "Ubicación",
    description: "¿Cómo describirías la zona donde resides habitualmente?",
    values: ["rural", "urbana", "periferia", "prefiero_no_responder"],
  },
  {
    id: "idioma",
    name: "Idioma",
    description:
      "¿Cuál es tu nivel de dominio del idioma principal utilizado en la organización?",
    values: ["nativo", "fluido", "basico", "prefiero_no_responder"],
  },
];

/**
 * Valores que no se comparan: se cuentan como "sin dato" y nunca forman
 * un grupo con índice ni brecha. Se excluyen del cálculo por tabla.
 */
export const NON_COMPARISON_VALUES: readonly string[] = [
  "otra",
  "prefiero_no_responder",
];

export const questionsOf = (dimensions: string[]): CatalogQuestion[] =>
  DIMENSIONS.filter((d) => dimensions.includes(d.id)).flatMap(
    (d) => d.questions,
  );

/** Grupo de navegación de una dimensión. */
export const groupOf = (dimension: string): DimensionGroup =>
  DIMENSIONS.find((d) => d.id === dimension)?.group ?? "contexto";
