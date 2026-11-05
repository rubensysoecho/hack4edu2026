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
    label: "Navegación principal",
    skip: "Saltar al contenido",
    gaps: "Brechas",
    instruments: "Cuestionarios",
  },

  panel: {
    title: "Brechas de acceso",
    dimensionsTitle: "Dimensiones",
    dimensionsNote: "Nivel global de cada dimensión, de 0 a 100.",
    subtitle:
      "Distancia de cada grupo al conjunto, en puntos sobre 100. Positivo significa más barrera. El número pequeño son las personas del grupo.",
    gap: "Brecha",
    contextLine: (responses: number, axes: number) =>
      `${responses} respuestas · ${axes} ${
        axes === 1 ? "eje" : "ejes"
      } de comparación`,
    keyFinding: "Lo más importante",
    heroGap: (gap: string, dimension: string) =>
      `La brecha es de ${gap} puntos más de barrera que el conjunto en ${dimension}.`,
    noPositiveGap:
      "Ningún grupo declara más barrera que el conjunto en esta dimensión.",
    scaleGlobal: "conjunto",
    scaleGroup: "grupo",
    people: (n: number) => (n === 1 ? "1 persona" : `${n} personas`),
    suppressedTable: (k: number) =>
      `No publicable: hay grupos con menos de ${k} personas.`,
    crosses: "Cruces",
    crossNote: (k: number) =>
      `Solo se publican cruces con ${k} personas o más en cada celda.`,
    crossGap: (dimension: string) => `Brecha en ${dimension}`,
    crossSuppressed: "Cruces no publicables",
    smallCell: (k: number) => `alguna celda tiene menos de ${k} personas`,
    excluded: (n: number) =>
      n === 1
        ? "1 persona sin dato en esta tabla"
        : `${n} personas sin dato en esta tabla`,
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
    expectativas_genero: "Expectativas y cuidados",
    tiempo_edad: "Tiempo y etapa vital",
    dispositivos: "Dispositivos",
    conectividad: "Conectividad",
    lengua_comprension: "Lengua y comprensión",
    accesibilidad: "Accesibilidad",
    entorno_desplazamiento: "Entorno y desplazamiento",
  } as Record<string, string>,

  groups: {
    acceso: "Acceso digital",
    barreras: "Barreras de acceso",
    contexto: "Contexto y participación",
  } as Record<string, string>,

  groupOrder: ["acceso", "barreras", "contexto"],

  axes: {
    genero: "Género",
    edad: "Edad",
    ubicacion: "Ubicación",
    idioma: "Idioma",
  } as Record<string, string>,

  axisOrder: ["genero", "edad", "ubicacion", "idioma"],

  labels: {
    "genero=mujer": "Mujeres",
    "genero=hombre": "Hombres",
    "genero=otra": "Otra identidad",
    "genero=prefiero_no_responder": "Prefiero no responder",
    "edad=menos_18": "Menos de 18 años",
    "edad=18-34": "Entre 18 y 34 años",
    "edad=35-54": "De 35 a 54 años",
    "edad=55_mas": "55 años o más",
    "edad=prefiero_no_responder": "Prefiero no responder",
    "idioma=nativo": "Nativo",
    "idioma=fluido": "Fluido",
    "idioma=basico": "Básico",
    "idioma=prefiero_no_responder": "Prefiero no responder",
    "ubicacion=rural": "Zona rural",
    "ubicacion=urbana": "Zona urbana",
    "ubicacion=periferia": "Periferia",
    "ubicacion=prefiero_no_responder": "Prefiero no responder",
  } as Record<string, string>,

  nullGap: "—",
};

export function formatNumber(value: number | null, signed = false): string {
  if (value === null) return texts.nullGap;
  const text = Math.abs(value).toFixed(1).replace(".", ",");
  if (!signed) return text;
  return value > 0 ? `+${text}` : value < 0 ? `−${text}` : "0,0";
}
