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
| **Dimensión** | Lo que se mide: `conectividad`, `dispositivos`, `barreras`, `apoyo`. En código, `dimension`. |
| **Eje de corte** | Con quién se compara: `genero`, `edad`, `idioma`, `ubicacion`. En código, `axis`. |
| **Índice** | Media ponderada de los ítems de una dimensión, normalizada **0–100**. En código, `index`. |
| **Brecha** | `índice del grupo − índice global`, en puntos. Puede ser negativa. En código, `gap`. |
| **Interseccional** | Brecha de un grupo definido por **dos o más ejes** a la vez. Es la que los promedios esconden. |
| **k** | Umbral mínimo de grupo para publicar un dato. Por defecto **10**. |

## Catálogo: dimensiones y ejes

La lista es **cerrada**. No se añaden dimensiones ni ejes sin decisión explícita
del equipo. El catálogo vive en `server/catalog.ts`. Sus ids y valores son
**datos**: se quedan en español (`conectividad`, `genero`, `mujer`) y no se
traducen nunca. Los símbolos y campos que los envuelven sí van en inglés.

### Dimensiones (lo que se mide)

Cada subtipo es una dimensión propia: tiene su índice y se puede decir
"visual: 35 de barrera" en vez de un promedio que mezcla cosas distintas.
Los grupos `acceso`, `barreras` y `apoyo` solo ordenan la navegación: no se
calculan.

| id | Grupo | Nombre | Qué mide |
| --- | --- | --- | --- |
| `conectividad` | acceso | Conectividad | Si la conexión alcanza para seguir las clases. |
| `dispositivos` | acceso | Dispositivos | Con qué equipo estudia y cuánto puede usarlo. |
| `visual` | barreras | Visual | Barrera declarada para ver la pizarra o la pantalla. |
| `auditiva` | barreras | Auditiva | Barrera declarada para oír lo que se dice en clase. |
| `motriz` | barreras | Motriz | Barrera declarada para desplazarse o usar el equipo. |
| `habla` | barreras | Habla | Barrera declarada para expresarse hablando. |
| `salud` | barreras | Salud crónica | Condición de salud que condiciona la asistencia. |
| `tdah` | apoyo | Señales TDAH | Señales de atención, no diagnóstico. |
| `tea` | apoyo | Señales TEA | Señales de comunicación social, no diagnóstico. |
| `dislexia` | apoyo | Señales dislexia | Señales de lectura, no diagnóstico. |
| `discalculia` | apoyo | Señales discalculia | Señales de cálculo, no diagnóstico. |

`barreras` = discapacidades de **nivel 1: identificables**.
`apoyo` = discapacidades de **nivel 2: por diagnóstico declarado**, medidas como
señales.

### Ejes (con quién se compara)

| id | Nombre | Valores |
| --- | --- | --- |
| `genero` | Género | mujer · hombre |
| `edad` | Edad | tramos que define el centro |
| `idioma` | Idioma | igual al de clase · distinto al de clase |
| `ubicacion` | Ubicación | urbana · periurbana · rural |

El eje `idioma` mide **distancia**, no una lengua concreta: la barrera es que la
lengua de casa no sea la de las clases. Así vale en cualquier país.

**No se cruzan ejes.** El panel muestra un eje a la vez: dentro de un eje ves sus
valores, y nunca "mujeres de zona rural". El motor sabe hacerlo (`profundidad: 2`),
pero no se usa ni se expone. Se decide más adelante, con datos reales.

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
2. **Supresión por umbral.** Todo grupo con `n < k` no publica índice ni brecha.
   No se muestra "oculto": se muestra "grupo demasiado pequeño para publicar".
3. **Vocabulario.** No se usa la palabra "discriminación". Se dice
   **"barrera declarada"** o **"brecha de acceso"**. El dato es un autoinforme,
   no una acusación. Un 60% no prueba discriminación: solo un contraste entre
   grupos lo hace.
4. **Sin diagnósticos.** TDAH, TEA, dislexia y discalculia se miden como
   *señales de necesidad de apoyo*, nunca como diagnóstico clínico.
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
| Variables de entorno | inglés | `AI_PROVIDER` |
| Ids y valores del catálogo | **español**, no se traducen | `conectividad`, `genero=mujer`, `con_1` |
| Textos visibles y enunciados | **español** | `texts.panel.title` |
| Claves del JSON de la IA | **español**, contrato bloqueado | `resumen`, `prioridades` |
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
  índice global, supresión de celdas con `n < k`. Determinista, testeado, auditable.
- **IA** (OpenRouter, solo OpenRouter): recibe ese JSON ya calculado y escribe
  conclusiones en lenguaje llano — resumen, prioridades, recomendaciones, advertencias.
  No calcula, no estima, no inventa cifras.

Si la IA devuelve una cifra que no estaba en el payload, se descarta.
`temperature: 0` + cache por hash del payload. Si la API falla o
`AI_PROVIDER=none`, se sirve una plantilla determinista con los mismos números.

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

### Variables de entorno (`.env`)

```
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
AI_PROVIDER=openrouter     # openrouter | none
GOOGLE_FORMS_CLIENT_ID=
GOOGLE_FORMS_CLIENT_SECRET=
GOOGLE_FORMS_REFRESH_TOKEN=
```

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
```

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

`server/ai.ts` expone `analyze(payload): Promise<Report>`.

Los símbolos, tipos y campos internos van en inglés. El JSON que devuelve el modelo
conserva las claves en español que fija el system prompt: `ai.ts` traduce en el borde
(`Report` ↔ JSON del modelo). Entrada: los índices y brechas ya calculados. Salida
validada con Zod:

```json
{
  "resumen": "string",
  "prioridades": [{ "grupo": "string", "dimension": "string", "motivo": "string" }],
  "recomendaciones": ["string"],
  "advertencias": ["string"]
}
```

### System prompt (verbatim — no modificar sin decisión explícita)

```
Eres analista de equidad educativa para Equilens. Recibes un JSON con índices
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

DEVUELVE ÚNICAMENTE ESTE JSON:
{ "resumen": string, "prioridades": [{ "grupo": string, "dimension": string,
  "motivo": string }], "recomendaciones": string[], "advertencias": string[] }
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
5. `server/ai.ts` + pulido visual. **← siguiente**
