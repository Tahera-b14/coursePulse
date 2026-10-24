import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedDemoData } from "./seed-data.js";

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");
const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(directory, "courseflow.sqlite");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
export const uploadsDirectory = path.join(path.dirname(databasePath), "uploads");
fs.mkdirSync(uploadsDirectory, { recursive: true });

export const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'instructor', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE COLLATE NOCASE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'Beginner',
    credits INTEGER NOT NULL DEFAULT 3 CHECK (credits BETWEEN 1 AND 12),
    capacity INTEGER NOT NULL DEFAULT 40 CHECK (capacity BETWEEN 1 AND 500),
    instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, course_id)
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date TEXT NOT NULL,
    max_points INTEGER NOT NULL DEFAULT 100 CHECK (max_points BETWEEN 1 AND 1000),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    grade REAL,
    feedback TEXT,
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (assignment_id, student_id)
  );
`);

const submissionColumns = db.prepare("PRAGMA table_info(submissions)").all().map((column) => column.name);
if (!submissionColumns.includes("file_key")) db.exec("ALTER TABLE submissions ADD COLUMN file_key TEXT");
if (!submissionColumns.includes("file_name")) db.exec("ALTER TABLE submissions ADD COLUMN file_name TEXT");
if (!submissionColumns.includes("file_size")) db.exec("ALTER TABLE submissions ADD COLUMN file_size INTEGER");

const count = db.prepare("SELECT COUNT(*) AS total FROM users").get().total;
if (count === 0 && process.env.NODE_ENV !== "production" && !process.env.COURSEFLOW_SEED_SCRIPT) {
  seedDemoData(db, bcrypt, uploadsDirectory);
}
