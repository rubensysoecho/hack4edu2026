<p align="center">
  <img src="public/logo.svg" alt="Equilens" width="72" height="72" />
</p>

# Equilens

Plataforma web para que una escuela, ONG o club detecte y visualice **brechas de
acceso educativa** en su grupo, sin perfilar a ninguna persona.

Reto 10 — Hack4Edu 2026: *"Tecnología que encuentre a quien estamos dejando atrás"*.

**Estado: MVP funcional.** Pensado para una demo que funcione el día del pitch.

> [!IMPORTANT]
> **IA opcional.** Para que los informes usen OpenRouter, crea un `.env.dev` copiando
> `.env.example` y rellena `OPENROUTER_API_KEY` y `OPENROUTER_MODEL`. Si no existe, el
> proyecto funciona en modo demo y los informes se generan con la plantilla
> determinista: los datos presentados son los de prueba.

> **El sistema mide, la IA explica.** Los índices, las brechas y la supresión las
> calcula un motor determinista. La IA solo redacta un informe en lenguaje llano
> a partir de esos números.

---

## Qué hace

- Crea un cuestionario eligiendo **dimensiones** (qué se mide) y **ejes** (con quién
  se compara).
- Muestra una **vista previa del formulario** con las preguntas reales antes de generarlo.
- Genera el cuestionario y, en modo demo, lo rellena con **800 respuestas sintéticas**.
- Calcula índices de barrera de 0 a 100, brechas por grupo y cruces entre dos ejes.
- Publica solo tablas completas: si una celda tiene menos de `k` personas, se oculta
  la tabla entera.
- Redacta un **informe en lenguaje llano** (observaciones, acciones y advertencias)
  con IA o con una plantilla determinista si la IA no está disponible.
- Guarda cada informe como un **snapshot congelado** y los lista en **Informes** para
  volver a consultarlos sin recalcular nada.

**Nunca** muestra una ficha individual ni permite reidentificar a un estudiante.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | Vue 3 + Vite + TypeScript |
| API | Bun + Hono |
| Base de datos | SQLite (`bun:sqlite`) |
| Captura | Google Forms API *(pendiente: hoy la creación es simulada)* |
| IA | OpenRouter (`@openrouter/sdk`) |
| Gráficas | SVG a mano |
| Idioma | Solo español, sin i18n |

---

## Arranque rápido

Requisitos: [Bun](https://bun.sh/) y conexión a internet solo si vas a usar la IA.

```bash
bun install
# Opcional para IA: copia .env.example a .env.dev y rellena la clave y el modelo.
bun run seed             # crea el cuestionario de demo (datos de prueba)
bun run dev
```

Abre <http://localhost:5173>. Vite sirve el frontend y hace proxy de `/api` al
servidor Bun en el puerto 3000.

> `bun run seed` **borra toda la base de datos** y recrea el instrumento `demo`
> con 800 respuestas simuladas. Úsalo solo en local.

### Scripts

| Comando | Qué hace |
| --- | --- |
| `bun run dev` | Levanta API y Vite; carga `.env.dev` si existe. |
| `bun run seed` | Recrea la base de datos con el cuestionario de demo. |
| `bunx vite build` | Compila el frontend en `dist/`. |
| `bun start` | Sirve `dist/` y la API. Para IA: `bun --env-file=.env.dev server/index.ts`. |

No hay suite de tests: el proyecto se verifica ejecutándolo.

---

## Variables de entorno

Para activar la IA, crea `.env.dev` a partir de `.env.example`:

```bash
cp .env.example .env.dev
```

Rellena al menos `OPENROUTER_API_KEY` y `OPENROUTER_MODEL`. `dev.ts` carga `.env.dev`
solo si existe. Si no existe, o faltan esas variables, el proyecto funciona igual,
pero los informes se generan con la plantilla determinista (los datos de prueba) y la
interfaz lo indica. `.env.dev` está ignorado por git.

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | No | Clave de OpenRouter para el informe con IA. |
| `OPENROUTER_MODEL` | No | Modelo de OpenRouter, por ejemplo `proveedor/modelo`. |
| `EQUILENS_DB` | No | Ruta del SQLite. Por defecto `equilens.db`. |
| `PORT` | No | Puerto de la API. Por defecto `3000`. |
| `GOOGLE_FORMS_CLIENT_ID` | No | Prevista para la integración real de Google Forms. |
| `GOOGLE_FORMS_CLIENT_SECRET` | No | Prevista para la integración real. |
| `GOOGLE_FORMS_REFRESH_TOKEN` | No | Prevista para la integración real. |

Si faltan `OPENROUTER_API_KEY` o `OPENROUTER_MODEL`, el informe se sirve con la
plantilla determinista y la interfaz lo indica. Para forzarla en local:

```bash
OPENROUTER_MODEL= bun run dev
```

---

## Cómo funciona la demo

1. Pulsa **Entrar**: llegas a **Informes**.
2. Si ya hay informes, elige uno para ver sus brechas. Si no, ve a
   **Cuestionarios → Nuevo cuestionario**.
3. Escribe un título y marca dimensiones y ejes. La vista previa se actualiza en vivo
   con las preguntas del catálogo.
4. Pulsa **Generar cuestionario**.
5. Se crea el instrumento, se rellenan 800 respuestas sintéticas y se guarda su primer
   informe. Se abre directamente el panel de **Brechas**.
6. El informe queda en **Informes** como una foto de ese momento: aunque cambien las
   respuestas después, el informe guardado no cambia.

Desde la tarjeta de un informe puedes borrarlo con **Borrar**. Eso elimina solo el
snapshot: el cuestionario y sus respuestas se conservan.

La creación del formulario es **simulada**: no se llama todavía a la API de Google
Forms y `form_id` queda en `null`. La integración real es el siguiente paso del roadmap.

---

## Catálogo

La lista es cerrada y vive en `server/catalog.ts`.

### Dimensiones (qué se mide)

| id | Grupo | Qué mide |
| --- | --- | --- |
| `expectativas_genero` | contexto | Expectativas, cuidados y normas que condicionan la participación digital. |
| `tiempo_edad` | contexto | Obligaciones y percepciones ligadas a la etapa vital. |
| `dispositivos` | acceso | Equipo, estado y disponibilidad para seguir las actividades. |
| `conectividad` | acceso | Cortes, datos, suministro y saturación de la red. |
| `lengua_comprension` | contexto | Dominio del idioma y comprensión de los mensajes. |
| `accesibilidad` | barreras | Barreras visuales, auditivas, motrices y de atención. |
| `entorno_desplazamiento` | contexto | Desplazamiento, espacio, apoyo técnico y horarios. |

### Ejes (con quién se compara)

`genero`, `edad`, `ubicacion` e `idioma`. Los valores `otra` y
`prefiero_no_responder` no se comparan: cuentan como “sin dato”.

El panel muestra cada eje por separado y los cruces de dos ejes (`depth: 2`).
Nunca se cruzan tres o más ejes.

---

## Motor de cálculo

Todo vive en `server/gaps.ts` y no importa framework, base de datos ni red.

```
person_index_dim  = (( Σ (value_i × weight_i) / Σ weight_i ) − 1) / 4 × 100
group_index_dim   = media de person_index_dim dentro del grupo
gap               = group_index − global_index
contribution_i    = (value_i × weight_i) / Σ (value_j × weight_j)
```

- Escala de respuesta 1..5 → índice 0..100.
- Si falta un ítem, se re-normaliza sobre los pesos de los ítems respondidos.
- Una persona sin ningún ítem de la dimensión no cuenta para esa dimensión.
- `k = 10` para ejes; `kCross = 20` para cruces.
- Una tabla se publica **entera o no se publica**: no se ocultan celdas sueltas.

Los pesos los define quien valida el instrumento. Hoy todos valen `1`.

---

## Informe con IA

`server/ai.ts` expone `analyze(payload): Promise<ReportResult>`.

- **Entrada**: solo tablas publicadas y valores comparables. Ni celdas suprimidas,
  ni `prefiero_no_responder`, ni el nombre del centro. Se recorta a los grupos de
  mayor impacto y a un par de contrastes por dimensión.
- **Salida**: JSON con `observaciones`, `afrontamiento` y `advertencias`, validado con Zod.
- **Filtros**: todo número citado debe existir en el payload; `observaciones` no cita
  cifras (salvo edades de un nombre de grupo) ni jerga técnica; se descartan términos
  clínicos y la palabra “discriminación”.
- **Determinismo**: `temperature: 0` y caché por hash del payload + modelo.
- **Respaldo**: si la API falla, tarda demasiado o el JSON no cumple, se sirve una
  plantilla determinista con las mismas conclusiones a partir de los mismos datos.

Cada informe que se abre desde **Informes** es un snapshot: guarda el panel y el texto
en el momento de generarlo. No se vuelve a llamar a la IA al consultarlo.

Frase para el pitch: **“el sistema mide, la IA explica”**.

---

## API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/catalog` | Dimensiones, ejes y grupos de navegación. |
| `GET` | `/api/instruments` | Lista de cuestionarios con conteos. |
| `POST` | `/api/instruments` | Crea un cuestionario. Acepta `demo: true` para sembrar 800 respuestas. |
| `POST` | `/api/instruments/:id/simulate` | Regenera las respuestas sintéticas de un cuestionario. |
| `GET` | `/api/reports` | Lista de informes guardados. |
| `GET` | `/api/reports/:id` | Panel e informe congelados de un snapshot. |
| `POST` | `/api/reports` | Crea o reutiliza el snapshot de `{ "instrumentId": "..." }`. |
| `DELETE` | `/api/reports/:id` | Borra solo el informe; no toca el cuestionario. |
| `GET` | `/api/panel?instrument=:id` | Panel vivo (debug). |
| `GET` | `/api/report?instrument=:id` | Informe vivo (debug). |

Ejemplo de creación con datos de demo:

```bash
curl -X POST http://localhost:3000/api/instruments \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Acceso digital del club, 2026",
    "dimensions": ["conectividad", "accesibilidad"],
    "axes": ["genero", "ubicacion"],
    "demo": true
  }'
```

---

## Modelo de datos

SQLite, dimensiones y ejes como filas (no columnas). Esquema en `server/db.ts`:

```
instruments (id, title, version, approved_by, form_id, axes, created_at)
questions   (id, instrument_id, position, statement, dimension, google_item_id, weight)
responses   (id, instrument_id, form_response_id, submitted_at)
answers     (response_id, item_id, dimension, value)
attributes  (response_id, axis, value)
analyses    (id, payload_hash, report_json, created_at)
reports     (id, instrument_id, instrument_title, payload_hash, source, model,
             response_count, dimension_count, axis_count, panel_json,
             report_json, created_at)
```

`answers.item_id` referencia `questions.id`; `questions.google_item_id` guarda el id
de Google Forms para que editar el formulario no rompa el histórico.

`reports` guarda los snapshots que consume la pantalla de Informes. `panel_json` y
`report_json` son la foto congelada del panel y del texto; el índice único
`(instrument_id, payload_hash, source)` evita duplicados sin impedir que convivan
un informe con IA y otro de plantilla para los mismos datos.

---

## Estructura

```
server/
  catalog.ts    Catálogo cerrado: dimensiones, preguntas y ejes
  gaps.ts       Motor puro: índices, brechas, cruces y supresión
  db.ts         Única capa que habla con SQLite
  simulate.ts   Respuestas sintéticas para la demo
  ai.ts         Informe con OpenRouter, validación y plantilla
  reports.ts    Composición de informes y snapshots congelados
  index.ts      Rutas Hono y servido de dist/

src/
  App.vue           Shell y navegación
  views/Landing.vue Entrada
  views/Reports.vue Lista de informes guardados
  views/Instruments.vue  Constructor y lista de cuestionarios
  views/Gaps.vue    Visor de un informe: brechas + texto
  FormPreview.vue   Simulación del formulario a crear
  texts.ts          Todos los textos visibles
  styles.css        Sistema visual
```

---

## Privacidad y reglas del producto

- **Nunca se perfila a un individuo.** Solo hay agregados; no existe pantalla de
  “ficha del alumno”.
- **Supresión por umbral y por tabla**: con una celda menor que `k`, no se publica
  ninguna celda de esa tabla.
- **Vocabulario**: se habla de “barreras declaradas” o “brechas de acceso”, nunca de
  “discriminación”. Es un autoinforme, no una acusación.
- **Sin diagnósticos**: la accesibilidad se mide como barreras declaradas, no como
  condición clínica.
- **Cero preguntas abiertas** en el MVP, para evitar PII y reidentificación.
- **Sin autenticación** en esta versión: se entra con un botón.

---

## Estado del roadmap

| # | Paso | Estado |
| --- | --- | --- |
| 1 | `server/gaps.ts` + motor funcionando | Hecho |
| 2 | `db.ts` + `seed.ts` + pantallas Brechas/Informes | Hecho |
| 3 | Crear y leer cuestionarios sin Google | Hecho (creación simulada) |
| 4 | `server/forms/google.ts` real (crear, publicar, sync) | Pendiente |
| 5 | `server/ai.ts` + informe en pantalla | Hecho |
| 6 | Pulido visual y guion del pitch | En curso |

### Limitaciones conocidas

- La creación en Google Forms es simulada; `form_id` permanece en `null`.
- Las respuestas demo **no plantan brechas** a propósito: cualquier diferencia entre
  grupos es variación de muestreo, así que los valores del panel son pequeños.
- No hay autenticación ni multi-centro.
- No hay suite de tests automatizada.

---

## Documentación interna

`AGENTS.md` es la fuente de verdad del proyecto: glosario, catálogo, reglas
inviolables, convenciones de nomenclatura, contrato de la IA y roadmap.

Skills instaladas en `.agents/skills/`: `frontend-design`, `codebase-design` y
`find-skills`.
