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
  let rows = db.prepare("SELECT * FROM arrivals ORDER BY eta ASC, created_at DESC").all();

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

  const id = randomUUID();
  const qty = Math.max(1, Number(quantity) || 1);
  const fee = calcDeliveryFee(fulfillment, qty);

  db.prepare(
    `INSERT INTO arrivals
      (id, user_id, student_name, reg_no, item_name, quantity, eta, phone, note, fulfillment, hostel, delivery_fee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    req.user.id,
    studentName.trim(),
    regNo.trim(),
    itemName.trim(),
    qty,
    eta,
    phone.trim(),
    note.trim(),
    fulfillment,
    hostel?.trim() || null,
    fee
  );

  const arrival = db.prepare("SELECT * FROM arrivals WHERE id = ?").get(id);
  res.status(201).json({ arrival });
});

router.patch("/:id/status", requireAuth, requireCouncil, (req, res) => {
  const { status } = req.body;
  const valid = ["scheduled", "arrived", "ready", "collected", "delivered"];

  if (!valid.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const existing = db.prepare("SELECT id FROM arrivals WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Arrival not found." });
  }

  db.prepare("UPDATE arrivals SET status = ? WHERE id = ?").run(status, req.params.id);
  const arrival = db.prepare("SELECT * FROM arrivals WHERE id = ?").get(req.params.id);
  res.json({ arrival });
});

router.delete("/:id", requireAuth, requireCouncil, (req, res) => {
  const result = db.prepare("DELETE FROM arrivals WHERE id = ?").run(req.params.id);
  if (!result.changes) {
    return res.status(404).json({ error: "Arrival not found." });
  }
  res.json({ ok: true });
});

export default router;
