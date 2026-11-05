# Equilens

## Proyecto

Plataforma web para que el gestor de una escuela, ONG o club detecte y visualice
**brechas de acceso educativa** en su grupo, sin perfilar a ningún estudiante.

Reto 10 — Hack4Edu 2026: *"Tecnología que encuentre a quien estamos dejando atrás"*.

**MVP funcional.** No producto terminado. Todo lo que no sea necesario para una demo
que funcione el día del pitch queda fuera hasta que la demo funcione.

## Glosario (usar estos términos, no sinónimos)

| Término | Significado |
| --- | --- |
| **Dimensión** | Lo que se mide: `expectativas_genero`, `tiempo_edad`, `dispositivos`, `conectividad`, `lengua_comprension`, `accesibilidad`, `entorno_desplazamiento`. En código, `dimension`. |
| **Eje de corte** | Con quién se compara: `genero`, `edad`, `idioma`, `ubicacion`. En código, `axis`. |
| **Índice** | Media ponderada de los ítems de una dimensión, normalizada **0–100**. En código, `index`. |
| **Brecha** | `índice del grupo − índice global`, en puntos. Puede ser negativa. En código, `gap`. |
| **Interseccional** | Brecha de un grupo definido por **dos o más ejes** a la vez. Es la que los promedios esconden. |
| **k** | Umbral mínimo de grupo para publicar un dato. Por defecto **10**; en cruces, **20**. |

## Catálogo: dimensiones y ejes

La lista es **cerrada**. No se añaden dimensiones ni ejes sin decisión explícita
del equipo. El catálogo vive en `server/catalog.ts`. Sus ids y valores son
**datos**: se quedan en español (`conectividad`, `genero`, `mujer`) y no se
traducen nunca. Los símbolos y campos que los envuelven sí van en inglés.

### Dimensiones (lo que se mide)

Cada sección del instrumento es una dimensión con su índice propio.
Los grupos `acceso`, `barreras` y `contexto` solo ordenan la navegación: no se
calculan. El equipo pedagógico puede dividir una sección en subtipos si detecta
constructos distintos.

| id | Grupo | Nombre | Qué mide |
| --- | --- | --- | --- |
| `expectativas_genero` | contexto | Expectativas y cuidados | Expectativas, cuidados y normas que condicionan la participación digital. |
| `tiempo_edad` | contexto | Tiempo y etapa vital | Obligaciones y percepciones ligadas a la etapa vital. |
| `dispositivos` | acceso | Dispositivos | Equipo, estado y disponibilidad para seguir las actividades. |
| `conectividad` | acceso | Conectividad | Cortes, datos, suministro y saturación de la red. |
| `lengua_comprension` | contexto | Lengua y comprensión | Dominio del idioma y comprensión de los mensajes. |
| `accesibilidad` | barreras | Accesibilidad | Barreras visuales, auditivas, motrices y de atención. |
| `entorno_desplazamiento` | contexto | Entorno y desplazamiento | Desplazamiento, espacio, apoyo técnico y horarios. |

`acceso` agrupa dispositivos y conectividad.
`barreras` agrupa accesibilidad.
`contexto` agrupa expectativas de género, tiempo, lengua y entorno.

### Ejes (con quién se compara)

| id | Nombre | Valores |
| --- | --- | --- |
| `genero` | Género | mujer · hombre · otra · prefiero no responder |
| `edad` | Edad | menos de 18 · 18-34 · 35-54 · 55 o más · prefiero no responder |
| `ubicacion` | Ubicación | rural · urbana · periferia · prefiero no responder |
| `idioma` | Idioma | nativo · fluido · básico · prefiero no responder |

`otra` y `prefiero_no_responder` son valores **no comparables**: se cuentan como
sin dato y no producen grupo ni índice. El motor los excluye con
`NON_COMPARISON_VALUES`.

El eje `idioma` mide **dominio declarado** del idioma principal de la organización,
no una lengua concreta.

**Se cruzan pares de ejes.** El panel muestra cada eje por separado y, debajo,
los cruces de dos ejes (`depth: 2`): «género × edad», «género × ubicación», etc.
Nunca se cruzan tres o más ejes.

Cada tabla —un eje o un cruce— se publica **entera o no se publica**: si una
sola celda tiene `n < k`, se oculta la tabla completa. Para cruces,
`kCross = 20`. Así no se puede despejar la celda pequeña a partir de las demás.

### Redacción de preguntas

Los enunciados del banco son **provisionales**. Los redacta y valida el equipo
pedagógico.

Regla que el motor asume hoy: **a más valor, más barrera**. Una pregunta redactada
en positivo ("¿tienes equipo propio?") hay que invertirla antes de meterla, porque
el índice mide barrera, no acceso.

Los pesos también los define quien valida el instrumento. Mientras no haya
validación, todos valen **1**.

## Reglas inviolables

1. **Nunca se perfila a un individuo.** La UI solo muestra agregados. No existe
   pantalla de "ficha del alumno" y no se debe construir.
2. **Supresión por umbral y por tabla.** Si una celda de una tabla tiene `n < k`,
   no se publica **ninguna** celda de esa tabla. No se muestra "oculto": se
   muestra "no publicable: hay grupos demasiado pequeños".
3. **Vocabulario.** No se usa la palabra "discriminación". Se dice
   **"barrera declarada"** o **"brecha de acceso"**. El dato es un autoinforme,
   no una acusación. Un 60% no prueba discriminación: solo un contraste entre
   grupos lo hace.
4. **Sin diagnósticos.** Las preguntas de accesibilidad se miden como
   *barreras declaradas*, nunca como diagnóstico clínico.
5. **Cero preguntas abiertas** en el MVP: riesgo de reidentificación y de PII.

## Nomenclatura

**El código se lee en inglés; el producto se lee en español.**

| Ámbito | Idioma | Ejemplo |
| --- | --- | --- |
| Símbolos TypeScript | inglés | `calcGaps`, `GroupGap`, `saveInstrument` |
| Ficheros y carpetas | inglés | `server/gaps.ts`, `src/views/Gaps.vue` |
| Tablas y columnas SQL | inglés, `snake_case` | `questions.position`, `responses.submitted_at` |
| Rutas y claves JSON de la API | inglés, `camelCase` | `POST /api/instruments`, `suppressed` |
| Clases y variables CSS | inglés | `.row-value`, `--accent` |
| Variables de entorno | inglés | `OPENROUTER_MODEL` |
| Ids y valores del catálogo | **español**, no se traducen | `conectividad`, `genero=mujer`, `con_1` |
| Textos visibles y enunciados | **español** | `texts.panel.title` |
| Claves del JSON de la IA | **español**, contrato bloqueado | `observaciones`, `afrontamiento` |
| Comentarios y documentación | **español** | este documento |

Reglas:

- Todo fichero, símbolo o columna nueva nace en inglés. Sin abreviaturas por comodidad.
- `PascalCase` para tipos y componentes; `camelCase` para variables y funciones;
  `SCREAMING_SNAKE_CASE` para constantes de módulo; `snake_case` en SQL.
- Un id del catálogo o un valor guardado nunca se traduce: cambiarlo rompe el histórico.
- Los textos de la interfaz viven solo en `src/texts.ts`, con claves de estructura
  en inglés y claves de catálogo iguales al id en español.
- Prohibido mezclar: `guardarInstrumento()` ❌ → `saveInstrument()` ✅.
  `dimension: "conectividad"` ✅ porque el valor es un dato, no un identificador.

## Reparto de responsabilidades (regla del proyecto)

Los datos NUNCA los produce la IA.

- **Programático** (SQL + TypeScript): índices 0–100 por dimensión, brechas,
  índice global, supresión de tablas con celdas `n < k`. Determinista, testeado, auditable.
- **IA** (OpenRouter, solo OpenRouter): recibe ese JSON ya calculado y escribe
  un informe en dos bloques: observaciones y formas de afrontarlo, más advertencias.
  No calcula, no estima, no inventa cifras.

Si la IA devuelve una cifra que no estaba en el payload, el informe se descarta
y se sirve la plantilla. `temperature: 0` + caché por hash del payload. Si la API
falla o faltan `OPENROUTER_API_KEY` y `OPENROUTER_MODEL`, se sirve una plantilla
determinista con las mismas conclusiones a partir de los mismos datos.

Frase para el pitch: **"el sistema mide, la IA explica"**.

## Stack

| Capa | Qué |
| --- | --- |
| Frontend | Vue 3 + Vite + TypeScript |
| API | Bun + Hono (un solo proceso sirve el build y la API) |
| Base de datos | SQLite (`bun:sqlite`) |
| Captura | Google Forms API |
| IA | OpenRouter (`@openrouter/sdk`) |
| Gráficas | SVG a mano |
| Idioma | **Solo español.** Sin i18n, sin librería de traducción. |
| Entrada | Botón "Entrar". Sin autenticación, sin Supabase, sin RLS. |

Todos los textos visibles viven en `src/texts.ts`, no dispersos en componentes.

### Variables de entorno (`.env.dev`)

```
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
GOOGLE_FORMS_CLIENT_ID=
GOOGLE_FORMS_CLIENT_SECRET=
GOOGLE_FORMS_REFRESH_TOKEN=
```

En desarrollo, `dev.ts` carga `.env.dev` **solo si existe**. Si no existe (o faltan la
clave y el modelo), la app funciona en modo demo y los informes salen con la plantilla:
los datos presentados son los de prueba. `bun run seed` y `bun start` no requieren
`.env.dev`. `.env` y `.env.dev` quedan ignorados por git.

Para IA en producción: `bun --env-file=.env.dev server/index.ts`.

Sin interruptores: si faltan la clave o el modelo, el informe se genera con la
plantilla y la interfaz lo indica. Para forzar la plantilla en local:
`OPENROUTER_MODEL= bun run dev`.

## Modelo de datos

Dimensiones y ejes se guardan como **filas, no como columnas**: añadir un eje nuevo
es insertar datos, no migrar el esquema.

```sql
instruments (id, title, version, approved_by, form_id, axes, created_at)
questions   (id, instrument_id, position, statement, dimension, google_item_id, weight)
responses   (id, instrument_id, form_response_id, submitted_at)
answers     (response_id, item_id, dimension, value)   -- resultado, escala 1..5
attributes  (response_id, axis, value)                 -- corte del respondente
analyses    (id, payload_hash, report_json, created_at) -- cache de la IA
reports     (id, instrument_id, instrument_title, payload_hash, source, model,
             response_count, dimension_count, axis_count, panel_json,
             report_json, created_at)                   -- snapshots de Informes
```

`reports` guarda la foto congelada que consume la pantalla de Informes: `panel_json`
y `report_json` no se recalculan al abrirla. El índice único
`(instrument_id, payload_hash, source)` reutiliza snapshots idénticos y permite que
convivan uno con IA y otro de plantilla para los mismos datos. Borrar un snapshot no
toca el cuestionario ni sus respuestas.

`questions.id` es global dentro del instrumento (`<instrumento>.<código>`) y es lo
que referencia `answers.item_id`. `questions.google_item_id` guarda el id que asigna
Google Forms, para que editar el formulario no rompa el histórico. `instruments.axes`
es un JSON con los ejes que el gestor marcó al crear el cuestionario.

`questions.weight` lo define **quien valida el instrumento**, no el gestor.
Los pesos no se tocan después de recoger datos: es versionado del instrumento.

Los valores guardados en `dimension`, `axis` y `value` de `attributes` son ids del
catálogo y siguen en español (`conectividad`, `genero`, `mujer`).

## Fórmulas (deterministas, en `server/gaps.ts`)

```
person_index_dim  = (( Σ (value_i × weight_i) / Σ weight_i ) − 1) / 4 × 100
group_index_dim   = mean(person_index_dim de las personas del grupo)
gap               = group_index − global_index
contribution_i    = (value_i × weight_i) / Σ (value_j × weight_j)     -- qué ítem mueve el índice
```

Escala 1..5 → 0..100. Una persona con valores 4 y 5 y pesos 3 y 2 obtiene
`((4×3 + 5×2)/5 − 1)/4 × 100 = 85`.

Si una persona no respondió algún ítem de la dimensión, se re-normaliza sobre los
pesos de los ítems respondidos. Si no respondió ninguno, no cuenta para esa dimensión.

## IA: contrato

`server/ai.ts` expone `analyze(payload): Promise<ReportResult>`.

Los símbolos, tipos y campos internos van en inglés. El JSON que devuelve el modelo
conserva las claves en español que fija el system prompt: `ai.ts` traduce en el borde
(`Report` ↔ JSON del modelo). El payload solo lleva tablas publicadas y valores
comparables: ni celdas suprimidas, ni `prefiero_no_responder`, ni el nombre del
centro. Además se recorta a los grupos de mayor impacto (brecha × personas) y un
par de contrastes por dimensión, para que el modelo no tenga que resumir 150 filas.

Salida validada con Zod y tres filtros posteriores:

- **Cifras**: todo número citado debe existir en el payload; si no, se descarta.
- **Observaciones**: no citan cifras (salvo edades que formen parte de un nombre
  de grupo) ni jerga técnica ("brecha", "índice", "dimensión", "media",
  "promedio", "puntos", "escala").
- **Vocabulario**: se descartan términos clínicos o la palabra "discriminación".

```json
{
  "observaciones": [{ "titulo": "string", "detalle": "string" }],
  "afrontamiento": [
    { "titulo": "string", "detalle": "string", "derivacion": "string" }
  ],
  "advertencias": ["string"]
}
```

`afrontamiento[].derivacion` indica con quién validar la actuación o qué
evaluación profesional hace falta. El aviso de que el informe no sustituye una
evaluación profesional lo pone la interfaz, no el modelo.

### System prompt (verbatim — no modificar sin decisión explícita)

```
Eres analista de equidad educativa para Equilens. Recibes un JSON con niveles
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
  "advertencias": string[] }
```

## Skills integradas

Instaladas en `.agents/skills/` (copia versionada, registrada en `skills-lock.json`).
Mantenimiento: `npx skills list`, `npx skills check`, `npx skills update`.

| Skill | Origen | Cuándo usarla |
| --- | --- | --- |
| `frontend-design` | `anthropics/skills` | Diseñar o rediseñar UI en Vue con identidad visual propia, tipografía y layout deliberados (evitar look de plantilla). |
| `codebase-design` | `mattpocock/skills` | Diseñar módulos profundos: interfaces pequeñas, límites/seams claros. |
| `find-skills` | `vercel-labs/skills` | Descubrir e instalar skills. Ya instalada a nivel global (`~/.agents/skills/find-skills`): no se duplica aquí. |

`tdd` está instalada pero **no se usa** en este proyecto (decisión del equipo).

### MCP: Google Forms

`mcp-google-forms` **no es una skill**, es un servidor MCP (`npx -y mcp-google-forms@latest`, npm v1.3.1, MIT).
Configurado en `opencode.jsonc` como servidor local `google-forms`.

- Flujo recomendado: pedir *"connect Google Forms"* y seguir el asistente OAuth (PKCE en `127.0.0.1`); el servidor guarda los tokens.
- Alternativa no interactiva: exportar `GOOGLE_FORMS_CLIENT_ID`, `GOOGLE_FORMS_CLIENT_SECRET` y `GOOGLE_FORMS_REFRESH_TOKEN` y declararlos en `environment`.
- Scopes: `forms.body` y `forms.responses.readonly` (sin acceso amplio a Drive).
- Ojo: los formularios creados por API nacen **sin publicar** y la API no permite crear/editar respuestas.

## Convenciones para agentes

- **Sin TDD.** Se implementa de forma directa y se verifica ejecutándolo. No hay que escribir tests antes del código ni mantener una suite.
- Los módulos se diseñan con el vocabulario de `codebase-design` (módulo / interfaz / implementación / profundidad / seam / adapter). El motor de análisis es un módulo puro: no importa framework, ni DB, ni red.
- Cualquier pantalla nueva o rediseño pasa por `frontend-design`.
- Un paso a la vez, con supervisión del usuario: no se encadenan varios pasos sin revisión.
- Privacidad: nunca se perfilan alumnos individualmente; agregado y con umbral `k`.

## Roadmap MVP

1. ~~`server/gaps.ts` + test → motor funcionando.~~ **hecho**
2. ~~`db.ts` + `seed.ts` + pantalla `Brechas` → demo visible con datos sintéticos.~~ **hecho**
3. ~~`forms/fake.ts` + pantalla `Instrumentos` → crear y leer sin Google.~~ **hecho** (simulación en vez de adapter fake)
4. `forms/google.ts` real (crear, publicar, sync).
5. ~~`server/ai.ts` + informe en pantalla.~~ **hecho** (`GET /api/report`, plantilla si no hay IA)
6. Pulido visual y guion del pitch. **← siguiente**
