import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "../db.js";
import { requireAuth, requireCouncil } from "../middleware/auth.js";

const router = Router();

router.get("/", (_req, res) => {
  const gateDates = db
    .prepare("SELECT * FROM gate_dates WHERE is_active = 1 ORDER BY day_name ASC")
    .all();
  res.json({ gateDates });
});

router.post("/", requireAuth, requireCouncil, (req, res) => {
  const { dayName, title, description, startTime, endTime } = req.body;

  if (!dayName?.trim() || !title?.trim() || !description?.trim() || !startTime || !endTime) {
    return res.status(400).json({ error: "All gate date fields are required." });
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO gate_dates (id, day_name, title, description, start_time, end_time)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, dayName.trim(), title.trim(), description.trim(), startTime, endTime);

  const gateDate = db.prepare("SELECT * FROM gate_dates WHERE id = ?").get(id);
  res.status(201).json({ gateDate });
});

router.patch("/:id", requireAuth, requireCouncil, (req, res) => {
  const existing = db.prepare("SELECT * FROM gate_dates WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Gate date not found." });
  }

  const { dayName, title, description, startTime, endTime, isActive } = req.body;

  db.prepare(
    `UPDATE gate_dates SET
      day_name = ?, title = ?, description = ?, start_time = ?, end_time = ?, is_active = ?
     WHERE id = ?`
  ).run(
    dayName?.trim() || existing.day_name,
    title?.trim() || existing.title,
    description?.trim() || existing.description,
    startTime || existing.start_time,
    endTime || existing.end_time,
    isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
    req.params.id
  );

  const gateDate = db.prepare("SELECT * FROM gate_dates WHERE id = ?").get(req.params.id);
  res.json({ gateDate });
});

router.delete("/:id", requireAuth, requireCouncil, (req, res) => {
  const result = db.prepare("DELETE FROM gate_dates WHERE id = ?").run(req.params.id);
  if (!result.changes) {
    return res.status(404).json({ error: "Gate date not found." });
  }
  res.json({ ok: true });
});

export default router;
