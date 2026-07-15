import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "../db.js";
import { requireAuth, requireCouncil } from "../middleware/auth.js";

const router = Router();

router.get("/", (_req, res) => {
  const gateDates = db
    .all("gateDates")
    .filter((g) => g.is_active)
    .sort((a, b) => a.day_name.localeCompare(b.day_name));
  res.json({ gateDates });
});

router.post("/", requireAuth, requireCouncil, (req, res) => {
  const { dayName, title, description, startTime, endTime } = req.body;

  if (!dayName?.trim() || !title?.trim() || !description?.trim() || !startTime || !endTime) {
    return res.status(400).json({ error: "All gate date fields are required." });
  }

  const gateDate = db.insert("gateDates", {
    id: randomUUID(),
    day_name: dayName.trim(),
    title: title.trim(),
    description: description.trim(),
    start_time: startTime,
    end_time: endTime,
    is_active: true,
    created_at: new Date().toISOString(),
  });

  // Log gate date creation
  db.insert("activities", {
    id: randomUUID(),
    type: "gate_date_added",
    user_id: req.user.id,
    user_name: req.user.name,
    related_id: gateDate.id,
    description: `${req.user.name} added gate date: "${gateDate.title}" (${gateDate.day_name}).`,
    created_at: new Date().toISOString(),
  });

  res.status(201).json({ gateDate });
});

router.patch("/:id", requireAuth, requireCouncil, (req, res) => {
  const existing = db.get("gateDates", req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Gate date not found." });
  }

  const { dayName, title, description, startTime, endTime, isActive } = req.body;
  const gateDate = db.update("gateDates", req.params.id, {
    day_name: dayName?.trim() || existing.day_name,
    title: title?.trim() || existing.title,
    description: description?.trim() || existing.description,
    start_time: startTime || existing.start_time,
    end_time: endTime || existing.end_time,
    is_active: isActive !== undefined ? Boolean(isActive) : existing.is_active,
  });

  // Log gate date update
  db.insert("activities", {
    id: randomUUID(),
    type: "gate_date_updated",
    user_id: req.user.id,
    user_name: req.user.name,
    related_id: gateDate.id,
    description: `${req.user.name} updated gate date: "${gateDate.title}".`,
    created_at: new Date().toISOString(),
  });

  res.json({ gateDate });
});

router.delete("/:id", requireAuth, requireCouncil, (req, res) => {
  const gateDate = db.get("gateDates", req.params.id);
  if (!db.remove("gateDates", req.params.id)) {
    return res.status(404).json({ error: "Gate date not found." });
  }

  // Log gate date deletion
  if (gateDate) {
    db.insert("activities", {
      id: randomUUID(),
      type: "gate_date_removed",
      user_id: req.user.id,
      user_name: req.user.name,
      related_id: gateDate.id,
      description: `${req.user.name} removed gate date: "${gateDate.title}".`,
      created_at: new Date().toISOString(),
    });
  }

  res.json({ ok: true });
});

export default router;
