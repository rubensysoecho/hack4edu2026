/**
 * Todos los textos visibles de la interfaz.
 * Nada hardcodeado en los componentes.
 *
 * Las claves de catálogo (dimensiones, grupos, ejes, etiquetas) son ids:
 * se quedan en español porque son datos, no código.
 */

export const texts = {
  app: "Equilens",

  entry: {
    brand: "Equilens",
    title: "Quién se está quedando atrás",
    text:
      "Una escuela, una ONG o un club responden un cuestionario. Equilens devuelve dónde se concentran las barreras de acceso, sin mostrar nunca a un estudiante.",
    button: "Entrar",
    footer: "Hack4Edu 2026 · Reto 10",
  },

  nav: {
    gaps: "Brechas",
    instruments: "Cuestionarios",
  },

  panel: {
    title: "Brechas de acceso",
    subtitle:
      "Distancia de cada grupo al conjunto, en puntos sobre 100. Positivo significa más barrera. El número pequeño son las personas del grupo.",
    gap: "Brecha",
    level: "nivel",
    people: (n: number) => (n === 1 ? "1 persona" : `${n} personas`),
    peopleLabel: "personas",
    groupsLabel: "grupos publicados",
    largestGap: "brecha mayor",
    summary: "Resumen del conjunto",
    suppressed: "Grupo pequeño",
    noData: "Sin respuestas todavía",
    noDataDetail:
      "Comparte el formulario o usa el modo demo para simular respuestas.",
  },

  instruments: {
    title: "Cuestionarios",
    subtitle:
      "Elige qué quieres medir y con quién quieres comparar. Solo se pregunta eso.",
    newInstrument: "Nuevo cuestionario",
    titleLabel: "Nombre del cuestionario",
    titleHelp: "Por ejemplo: Acceso digital del club, 2026.",
    whatToMeasure: "¿Qué quieres medir?",
    whatToMeasureHelp: "Cada dimensión produce un nivel de 0 a 100.",
    compareWith: "¿Con quién quieres comparar?",
    compareWithHelp:
      "Opcional. Sin ejes verás el nivel del grupo, sin brechas.",
    questions: (n: number) => (n === 1 ? "1 pregunta" : `${n} preguntas`),
    create: "Crear cuestionario",
    cancel: "Cancelar",
    creating: "Creando…",
    empty: "Todavía no hay cuestionarios.",
    created: "Cuestionario creado",
    createdDetail:
      "En cuanto conectes Google Forms, aquí aparecerá el enlace para compartir.",
    simulate: "Simular respuestas (modo demo)",
    simulating: "Generando…",
    viewGaps: "Ver brechas",
    noResponses: "Sin respuestas",
    responses: (n: number) => (n === 1 ? "1 respuesta" : `${n} respuestas`),
    createError: "No se pudo crear el cuestionario.",
  },

  states: {
    loading: "Cargando datos…",
    error: "No se pudieron cargar los datos.",
  },

  dimensions: {
    conectividad: "Conectividad",
    dispositivos: "Dispositivos",
    visual: "Visual",
    auditiva: "Auditiva",
    motriz: "Motriz",
    habla: "Habla",
    salud: "Salud crónica",
    tdah: "Señales TDAH",
    tea: "Señales TEA",
    dislexia: "Señales dislexia",
    discalculia: "Señales discalculia",
  } as Record<string, string>,

  groups: {
    acceso: "Acceso digital",
    barreras: "Barreras de acceso",
    apoyo: "Necesidades de apoyo",
  } as Record<string, string>,

  groupOrder: ["acceso", "barreras", "apoyo"],

  axes: {
    genero: "Género",
    edad: "Edad",
    idioma: "Idioma",
    ubicacion: "Ubicación",
  } as Record<string, string>,

  axisOrder: ["genero", "edad", "idioma", "ubicacion"],

  labels: {
    "genero=mujer": "Mujeres",
    "genero=hombre": "Hombres",
    "edad=12-14": "De 12 a 14 años",
    "edad=15-16": "De 15 a 16 años",
    "edad=17-18": "De 17 a 18 años",
    "idioma=igual": "Idioma igual al de clase",
    "idioma=distinta": "Idioma distinto al de clase",
    "ubicacion=urbana": "Zona urbana",
    "ubicacion=periurbana": "Zona periurbana",
    "ubicacion=rural": "Zona rural",
  } as Record<string, string>,

  nullGap: "—",
};

export function formatNumber(value: number | null, signed = false): string {
  if (value === null) return texts.nullGap;
  const text = Math.abs(value).toFixed(1).replace(".", ",");
  if (!signed) return text;
  return value > 0 ? `+${text}` : value < 0 ? `−${text}` : "0,0";
}
