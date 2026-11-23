import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const directory = resolve(process.env.DATA_DIR || '.storage');
mkdirSync(directory, { recursive: true });
export const db = new DatabaseSync(resolve(directory, 'atlas.sqlite'));
db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;
  PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('teacher','student')),
    class_code TEXT UNIQUE, teacher_id INTEGER REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS sessions(
    token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id), expires INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS attempts(
    id TEXT PRIMARY KEY, owner TEXT NOT NULL, user_id INTEGER REFERENCES users(id),
    grade INTEGER NOT NULL, mode TEXT NOT NULL, lesson TEXT NOT NULL, questions TEXT NOT NULL,
    expires INTEGER, result TEXT, date TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS attempts_user ON attempts(user_id,date);
  CREATE TABLE IF NOT EXISTS rooms(
    code TEXT PRIMARY KEY, teacher INTEGER NOT NULL REFERENCES users(id), team_mode INTEGER NOT NULL,
    state TEXT NOT NULL, idx INTEGER NOT NULL, questions TEXT NOT NULL, created INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS players(
    code TEXT NOT NULL REFERENCES rooms(code), token TEXT NOT NULL, name TEXT NOT NULL, team TEXT NOT NULL,
    PRIMARY KEY(code,token), UNIQUE(code,name)
  );
  CREATE TABLE IF NOT EXISTS responses(
    code TEXT NOT NULL, token TEXT NOT NULL, idx INTEGER NOT NULL, correct INTEGER NOT NULL,
    PRIMARY KEY(code,token,idx), FOREIGN KEY(code,token) REFERENCES players(code,token)
  );
`);
export const one = (sql, ...params) => db.prepare(sql).get(...params);
export const all = (sql, ...params) => db.prepare(sql).all(...params);
export const run = (sql, ...params) => db.prepare(sql).run(...params);

function localTeacherKey() {
  const path = resolve(directory, 'teacher-key.txt');
  try {
    writeFileSync(path, randomBytes(18).toString('base64url'), { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  return readFileSync(path, 'utf8').trim();
}
export const teacherKey = process.env.TEACHER_KEY || localTeacherKey();
