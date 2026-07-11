import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "../db.js";
import { requireAuth, requireCouncil } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  const { filter } = req.query;
  let rows = db.prepare("SELECT * FROM maintenance ORDER BY created_at DESC").all();

  if (filter && filter !== "all") {
    rows = rows.filter((r) => r.priority === filter);
  }

  const priorityRank = { High: 3, Medium: 2, Low: 1 };
  rows.sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);

  res.json({ issues: rows });
});

router.post("/", requireAuth, (req, res) => {
  const { location, issueType, area, priority, details } = req.body;

  if (!location?.trim() || !issueType || !area?.trim() || !priority || !details?.trim()) {
    return res.status(400).json({ error: "All maintenance fields are required." });
  }

  if (!["High", "Medium", "Low"].includes(priority)) {
    return res.status(400).json({ error: "Invalid priority." });
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO maintenance (id, user_id, location, issue_type, area, priority, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.user.id, location.trim(), issueType, area.trim(), priority, details.trim());

  const issue = db.prepare("SELECT * FROM maintenance WHERE id = ?").get(id);
  res.status(201).json({ issue });
});

router.patch("/:id/status", requireAuth, requireCouncil, (req, res) => {
  const { status } = req.body;
  if (!["open", "in_progress", "resolved"].includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const existing = db.prepare("SELECT id FROM maintenance WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Issue not found." });
  }

  db.prepare("UPDATE maintenance SET status = ? WHERE id = ?").run(status, req.params.id);
  const issue = db.prepare("SELECT * FROM maintenance WHERE id = ?").get(req.params.id);
  res.json({ issue });
});

router.delete("/:id", requireAuth, requireCouncil, (req, res) => {
  const result = db.prepare("DELETE FROM maintenance WHERE id = ?").run(req.params.id);
  if (!result.changes) {
    return res.status(404).json({ error: "Issue not found." });
  }
  res.json({ ok: true });
});

export default router;
