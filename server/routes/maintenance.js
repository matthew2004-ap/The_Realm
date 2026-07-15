import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "../db.js";
import { requireAuth, requireCouncil } from "../middleware/auth.js";

const router = Router();

const priorityRank = { High: 3, Medium: 2, Low: 1 };

router.get("/", requireAuth, (req, res) => {
  const { filter } = req.query;
  let rows = db.all("maintenance");

  if (filter && filter !== "all") {
    rows = rows.filter((r) => r.priority === filter);
  }

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

  const issue = db.insert("maintenance", {
    id: randomUUID(),
    user_id: req.user.id,
    location: location.trim(),
    issue_type: issueType,
    area: area.trim(),
    priority,
    details: details.trim(),
    status: "open",
    created_at: new Date().toISOString(),
  });

  // Log maintenance report
  db.insert("activities", {
    id: randomUUID(),
    type: "maintenance_reported",
    user_id: req.user.id,
    user_name: req.user.name,
    related_id: issue.id,
    description: `${req.user.name} reported ${issue.priority} priority issue: ${issue.issue_type} at ${issue.location} - ${issue.area}.`,
    created_at: new Date().toISOString(),
  });

  res.status(201).json({ issue });
});

router.patch("/:id/status", requireAuth, requireCouncil, (req, res) => {
  const { status } = req.body;
  if (!["open", "in_progress", "resolved"].includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const issue = db.update("maintenance", req.params.id, { status });
  if (!issue) {
    return res.status(404).json({ error: "Issue not found." });
  }

  // Log status update
  db.insert("activities", {
    id: randomUUID(),
    type: "maintenance_updated",
    user_id: req.user.id,
    user_name: req.user.name,
    related_id: issue.id,
    description: `${req.user.name} updated maintenance issue status to: ${status}.`,
    created_at: new Date().toISOString(),
  });

  res.json({ issue });
});

router.delete("/:id", requireAuth, requireCouncil, (req, res) => {
  const issue = db.get("maintenance", req.params.id);
  if (!db.remove("maintenance", req.params.id)) {
    return res.status(404).json({ error: "Issue not found." });
  }

  // Log deletion
  if (issue) {
    db.insert("activities", {
      id: randomUUID(),
      type: "maintenance_deleted",
      user_id: req.user.id,
      user_name: req.user.name,
      related_id: issue.id,
      description: `${req.user.name} removed maintenance issue.`,
      created_at: new Date().toISOString(),
    });
  }

  res.json({ ok: true });
});

export default router;
