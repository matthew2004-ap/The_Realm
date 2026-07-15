import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "../db.js";
import { requireAuth, requireCouncil } from "../middleware/auth.js";

const router = Router();

function calcDeliveryFee(fulfillment, quantity) {
  if (fulfillment !== "delivery") return 0;
  return 1200 + Math.max(1, quantity) * 100;
}

router.get("/", requireAuth, (req, res) => {
  const { filter } = req.query;
  let rows = db.all("arrivals").sort((a, b) => a.eta.localeCompare(b.eta));

  if (req.user.role === "student") {
    rows = rows.filter((row) => row.user_id === req.user.id);
  }

  if (filter === "pickup") rows = rows.filter((r) => r.fulfillment === "pickup");
  if (filter === "delivery") rows = rows.filter((r) => r.fulfillment === "delivery");
  if (filter === "soon") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    rows = rows.filter((r) => {
      const eta = new Date(`${r.eta}T00:00:00`);
      return Math.round((eta - today) / 86400000) <= 2;
    });
  }
  if (filter === "ready") rows = rows.filter((r) => r.status === "ready");

  res.json({ arrivals: rows });
});

router.post("/", requireAuth, (req, res) => {
  const { studentName, regNo, itemName, quantity, eta, phone, note, fulfillment, hostel } = req.body;

  if (!studentName?.trim() || !regNo?.trim() || !itemName?.trim() || !eta || !phone?.trim() || !note?.trim()) {
    return res.status(400).json({ error: "All arrival fields are required." });
  }

  if (!["pickup", "delivery"].includes(fulfillment)) {
    return res.status(400).json({ error: "Fulfillment must be pickup or delivery." });
  }

  const qty = Math.max(1, Number(quantity) || 1);
  const arrival = db.insert("arrivals", {
    id: randomUUID(),
    user_id: req.user.id,
    student_name: studentName.trim(),
    reg_no: regNo.trim(),
    item_name: itemName.trim(),
    quantity: qty,
    eta,
    phone: phone.trim(),
    note: note.trim(),
    fulfillment,
    hostel: hostel?.trim() || null,
    status: "scheduled",
    delivery_fee: calcDeliveryFee(fulfillment, qty),
    created_at: new Date().toISOString(),
  });

  // Log arrival creation activity
  db.insert("activities", {
    id: randomUUID(),
    type: "arrival_created",
    user_id: req.user.id,
    user_name: req.user.name,
    related_id: arrival.id,
    description: `${req.user.name} scheduled arrival: "${arrival.item_name}" (${arrival.quantity} items) for ${arrival.eta}.`,
    created_at: new Date().toISOString(),
  });

  res.status(201).json({ arrival });
});

router.patch("/:id/status", requireAuth, requireCouncil, (req, res) => {
  const { status } = req.body;
  const valid = ["scheduled", "arrived", "ready", "collected", "delivered"];

  if (!valid.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const arrival = db.update("arrivals", req.params.id, { status });
  if (!arrival) {
    return res.status(404).json({ error: "Arrival not found." });
  }

  // Log status update activity
  db.insert("activities", {
    id: randomUUID(),
    type: "arrival_updated",
    user_id: req.user.id,
    user_name: req.user.name,
    related_id: arrival.id,
    description: `${req.user.name} updated arrival "${arrival.item_name}" status to: ${status}.`,
    created_at: new Date().toISOString(),
  });

  res.json({ arrival });
});

router.delete("/:id", requireAuth, requireCouncil, (req, res) => {
  const arrival = db.get("arrivals", req.params.id);
  if (!db.remove("arrivals", req.params.id)) {
    return res.status(404).json({ error: "Arrival not found." });
  }

  // Log deletion activity
  if (arrival) {
    db.insert("activities", {
      id: randomUUID(),
      type: "arrival_deleted",
      user_id: req.user.id,
      user_name: req.user.name,
      related_id: arrival.id,
      description: `${req.user.name} removed arrival: "${arrival.item_name}".`,
      created_at: new Date().toISOString(),
    });
  }

  res.json({ ok: true });
});

export default router;
