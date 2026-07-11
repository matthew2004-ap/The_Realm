import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "realm.db");

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    reg_no TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'council')),
    hostel TEXT,
    phone TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS arrivals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    reg_no TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    eta TEXT NOT NULL,
    phone TEXT NOT NULL,
    note TEXT NOT NULL,
    fulfillment TEXT NOT NULL CHECK(fulfillment IN ('pickup', 'delivery')),
    hostel TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled'
      CHECK(status IN ('scheduled', 'arrived', 'ready', 'collected', 'delivered')),
    delivery_fee INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS gate_dates (
    id TEXT PRIMARY KEY,
    day_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lost_items (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    item_name TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    contact TEXT NOT NULL,
    proof TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'missing'
      CHECK(status IN ('missing', 'found', 'claimed')),
    claim_proof TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS maintenance (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    location TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    area TEXT NOT NULL,
    priority TEXT NOT NULL CHECK(priority IN ('High', 'Medium', 'Low')),
    details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'
      CHECK(status IN ('open', 'in_progress', 'resolved')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);
