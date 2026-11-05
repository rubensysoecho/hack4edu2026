/**
 * Capa de datos de Equilens: SQLite con bun:sqlite.
 *
 * Dimensiones y ejes son filas, no columnas: añadir un eje es insertar datos.
 * Este módulo es el único que habla con la base de datos.
 */

import { Database } from "bun:sqlite";
import type { EngineInput, Item, ResponseRecord } from "./gaps.ts";

export const DB_PATH = process.env.EQUILENS_DB ?? "equilens.db";

export const db = new Database(DB_PATH, { create: true });

db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS instruments (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  version      INTEGER NOT NULL DEFAULT 1,
  approved_by  TEXT,
  form_id      TEXT,
  axes         TEXT NOT NULL DEFAULT '[]',
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id              TEXT PRIMARY KEY,
  instrument_id   TEXT NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL,
  statement       TEXT NOT NULL,
  dimension       TEXT NOT NULL,
  google_item_id  TEXT,
  weight          REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS responses (
  id               TEXT PRIMARY KEY,
  instrument_id    TEXT NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  form_response_id TEXT UNIQUE,
  submitted_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS answers (
  response_id  TEXT NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  item_id      TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  dimension    TEXT NOT NULL,
  value        REAL NOT NULL,
  PRIMARY KEY (response_id, item_id)
);

CREATE TABLE IF NOT EXISTS attributes (
  response_id  TEXT NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  axis         TEXT NOT NULL,
  value        TEXT NOT NULL,
  PRIMARY KEY (response_id, axis)
);

CREATE TABLE IF NOT EXISTS analyses (
  id           TEXT PRIMARY KEY,
  payload_hash TEXT NOT NULL,
  report_json  TEXT NOT NULL,
  created_at   TEXT NOT NULL
);
`;

db.run(SCHEMA);

export type Instrument = {
  id: string;
  title: string;
  version: number;
  approved_by: string | null;
  form_id: string | null;
  axes: string;
  created_at: string;
};

export type Question = {
  id: string;
  instrument_id: string;
  position: number;
  statement: string;
  dimension: string;
  google_item_id: string | null;
  weight: number;
};

export function saveInstrument(i: Instrument): void {
  db.query(
    `INSERT INTO instruments (id, title, version, approved_by, form_id, axes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       version = excluded.version,
       approved_by = excluded.approved_by,
       form_id = excluded.form_id,
       axes = excluded.axes`,
  ).run(
    i.id,
    i.title,
    i.version,
    i.approved_by,
    i.form_id,
    i.axes,
    i.created_at,
  );
}

export function saveQuestion(q: Question): void {
  db.query(
    `INSERT INTO questions (id, instrument_id, position, statement, dimension, google_item_id, weight)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       position = excluded.position,
       statement = excluded.statement,
       dimension = excluded.dimension,
       google_item_id = excluded.google_item_id,
       weight = excluded.weight`,
  ).run(
    q.id,
    q.instrument_id,
    q.position,
    q.statement,
    q.dimension,
    q.google_item_id,
    q.weight,
  );
}

export function saveResponse(r: {
  id: string;
  instrument_id: string;
  form_response_id?: string | null;
  submitted_at: string;
  answers: { item_id: string; dimension: string; value: number }[];
  attributes: Record<string, string>;
}): void {
  const insert = db.transaction(() => {
    db.query(
      `INSERT INTO responses (id, instrument_id, form_response_id, submitted_at)
       VALUES (?, ?, ?, ?)`,
    ).run(r.id, r.instrument_id, r.form_response_id ?? null, r.submitted_at);

    for (const a of r.answers) {
      db.query(
        `INSERT INTO answers (response_id, item_id, dimension, value)
         VALUES (?, ?, ?, ?)`,
      ).run(r.id, a.item_id, a.dimension, a.value);
    }

    for (const [axis, value] of Object.entries(r.attributes)) {
      db.query(
        `INSERT INTO attributes (response_id, axis, value)
         VALUES (?, ?, ?)`,
      ).run(r.id, axis, value);
    }
  });

  insert();
}

export function listInstruments(): Instrument[] {
  return db
    .query("SELECT * FROM instruments ORDER BY created_at DESC")
    .all() as Instrument[];
}

export type InstrumentSummary = Instrument & {
  question_count: number;
  response_count: number;
  dimensions: string | null;
};

export function listSummaries(): InstrumentSummary[] {
  return db
    .query(
      `SELECT i.*,
        (SELECT COUNT(*) FROM questions q WHERE q.instrument_id = i.id) AS question_count,
        (SELECT COUNT(*) FROM responses r WHERE r.instrument_id = i.id) AS response_count,
        (SELECT GROUP_CONCAT(DISTINCT q.dimension) FROM questions q WHERE q.instrument_id = i.id) AS dimensions
       FROM instruments i
       ORDER BY i.created_at DESC`,
    )
    .all() as InstrumentSummary[];
}

export function deleteAll(): void {
  db.run("DELETE FROM attributes");
  db.run("DELETE FROM answers");
  db.run("DELETE FROM responses");
  db.run("DELETE FROM questions");
  db.run("DELETE FROM instruments");
  db.run("DELETE FROM analyses");
}

/** Vacía las respuestas de un instrumento (la cascada limpia answers y attributes). */
export function deleteResponses(instrumentId: string): void {
  db.query("DELETE FROM responses WHERE instrument_id = ?").run(instrumentId);
}

/** Caché de informes: una fila por hash de payload y modelo. */
export function loadAnalysis(hash: string): string | null {
  const row = db
    .query("SELECT report_json FROM analyses WHERE payload_hash = ?")
    .get(hash) as { report_json: string } | null;
  return row?.report_json ?? null;
}

export function saveAnalysis(hash: string, reportJson: string): void {
  db.query(
    `INSERT INTO analyses (id, payload_hash, report_json, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`,
  ).run(hash, hash, reportJson, new Date().toISOString());
}

/** Carga todo lo necesario para el motor, ya en la forma que espera. */
export function loadInput(instrumentId: string): EngineInput {
  const items = db
    .query(
      "SELECT id, dimension, weight FROM questions WHERE instrument_id = ? ORDER BY position",
    )
    .all(instrumentId) as Item[];

  const ids = db
    .query("SELECT id FROM responses WHERE instrument_id = ?")
    .all(instrumentId) as { id: string }[];

  if (ids.length === 0) return { items, responses: [] };

  const answers = db
    .query(
      `SELECT a.response_id, a.item_id, a.value
       FROM answers a
       JOIN responses r ON r.id = a.response_id
       WHERE r.instrument_id = ?`,
    )
    .all(instrumentId) as {
    response_id: string;
    item_id: string;
    value: number;
  }[];

  const attributes = db
    .query(
      `SELECT attr.response_id, attr.axis, attr.value
       FROM attributes attr
       JOIN responses r ON r.id = attr.response_id
       WHERE r.instrument_id = ?`,
    )
    .all(instrumentId) as {
    response_id: string;
    axis: string;
    value: string;
  }[];

  const byResponse = new Map<string, ResponseRecord>();
  for (const { id } of ids) {
    byResponse.set(id, { id, values: {}, attributes: {} });
  }

  for (const a of answers) {
    const r = byResponse.get(a.response_id);
    if (r) r.values[a.item_id] = a.value;
  }

  for (const attr of attributes) {
    const r = byResponse.get(attr.response_id);
    if (r) r.attributes[attr.axis] = attr.value;
  }

  return { items, responses: [...byResponse.values()] };
}
