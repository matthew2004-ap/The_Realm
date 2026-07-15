import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (_req, res) => {
  const arrivals = db.all("arrivals");
  const lost = db.all("lostItems");
  const maintenance = db.all("maintenance");
  const gateDates = db.all("gateDates").filter((g) => g.is_active);

  res.json({
    scheduledArrivals: arrivals.length,
    readyForPickup: arrivals.filter((a) => a.status === "ready").length,
    deliveryRequests: arrivals.filter(
      (a) => a.fulfillment === "delivery" && !["collected", "delivered"].includes(a.status)
    ).length,
    incomingGoods: arrivals.filter((a) => !["collected", "delivered"].includes(a.status)).length,
    openReports:
      lost.filter((l) => l.status !== "claimed").length +
      maintenance.filter((m) => m.status !== "resolved").length,
    urgentHostel: maintenance.filter((m) => m.priority === "High" && m.status !== "resolved").length,
    gateDates,
  });
});

export default router;
