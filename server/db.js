import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const storePath = path.join(dataDir, "store.json");

const defaultStore = {
  users: [],
  arrivals: [],
  gateDates: [],
  lostItems: [],
  maintenance: [],
  activities: [],
};

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify(defaultStore, null, 2));
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(storePath, "utf8"));
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
}

export const db = {
  all(table) {
    return readStore()[table] || [];
  },

  get(table, id) {
    return this.all(table).find((row) => row.id === id) || null;
  },

  insert(table, row) {
    const store = readStore();
    store[table] = [row, ...(store[table] || [])];
    writeStore(store);
    return row;
  },

  update(table, id, updates) {
    const store = readStore();
    const index = (store[table] || []).findIndex((row) => row.id === id);
    if (index === -1) return null;
    store[table][index] = { ...store[table][index], ...updates };
    writeStore(store);
    return store[table][index];
  },

  remove(table, id) {
    const store = readStore();
    const before = (store[table] || []).length;
    store[table] = (store[table] || []).filter((row) => row.id !== id);
    writeStore(store);
    return before !== store[table].length;
  },

  findOne(table, predicate) {
    return this.all(table).find(predicate) || null;
  },

  count(table) {
    return this.all(table).length;
  },
};
