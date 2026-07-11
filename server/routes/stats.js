import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (_req, res) => {
  const arrivals = db.prepare("SELECT * FROM arrivals").all();
  const lost = db.prepare("SELECT * FROM lost_items").all();
  const maintenance = db.prepare("SELECT * FROM maintenance").all();
  const gateDates = db.prepare("SELECT * FROM gate_dates WHERE is_active = 1").all();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  res.json({
    scheduledArrivals: arrivals.length,
    readyForPickup: arrivals.filter((a) => a.status === "ready").length,
    deliveryRequests: arrivals.filter((a) => a.fulfillment === "delivery" && !["collected", "delivered"].includes(a.status)).length,
    incomingGoods: arrivals.filter((a) => !["collected", "delivered"].includes(a.status)).length,
    openReports: lost.filter((l) => l.status !== "claimed").length + maintenance.filter((m) => m.status !== "resolved").length,
    urgentHostel: maintenance.filter((m) => m.priority === "High" && m.status !== "resolved").length,
    gateDates,
  });
});

export default router;
