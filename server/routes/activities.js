import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireCouncil } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requireCouncil, (req, res) => {
  const activities = db.all("activities")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  res.json({ activities });
});

export default router;
