import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "../db.js";
import { requireAuth, requireCouncil } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  const { filter, search } = req.query;
  let rows = db.prepare("SELECT * FROM lost_items ORDER BY created_at DESC").all();

  if (filter === "missing") rows = rows.filter((r) => r.status === "missing");
  if (filter === "found") rows = rows.filter((r) => r.status === "found");
  if (filter === "claimed") rows = rows.filter((r) => r.status === "claimed");

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter((r) =>
      [r.item_name, r.last_seen, r.contact, r.proof, r.description]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  res.json({ items: rows });
});

router.post("/", requireAuth, (req, res) => {
  const { itemName, lastSeen, contact, proof, description } = req.body;

  if (!itemName?.trim() || !lastSeen?.trim() || !contact?.trim() || !proof?.trim() || !description?.trim()) {
    return res.status(400).json({ error: "All lost item fields are required." });
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO lost_items (id, user_id, item_name, last_seen, contact, proof, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.user.id, itemName.trim(), lastSeen.trim(), contact.trim(), proof.trim(), description.trim());

  const item = db.prepare("SELECT * FROM lost_items WHERE id = ?").get(id);
  res.status(201).json({ item });
});

router.patch("/:id/found", requireAuth, requireCouncil, (req, res) => {
  const existing = db.prepare("SELECT id FROM lost_items WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Item not found." });
  }

  db.prepare("UPDATE lost_items SET status = 'found' WHERE id = ?").run(req.params.id);
  const item = db.prepare("SELECT * FROM lost_items WHERE id = ?").get(req.params.id);
  res.json({ item });
});

router.patch("/:id/claim", requireAuth, (req, res) => {
  const { claimProof } = req.body;
  if (!claimProof?.trim()) {
    return res.status(400).json({ error: "Proof of ownership is required to claim an item." });
  }

  const item = db.prepare("SELECT * FROM lost_items WHERE id = ?").get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: "Item not found." });
  }

  if (item.status !== "found") {
    return res.status(400).json({ error: "Only found items can be claimed." });
  }

  db.prepare("UPDATE lost_items SET status = 'claimed', claim_proof = ? WHERE id = ?").run(
    claimProof.trim(),
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM lost_items WHERE id = ?").get(req.params.id);
  res.json({ item: updated });
});

router.delete("/:id", requireAuth, requireCouncil, (req, res) => {
  const result = db.prepare("DELETE FROM lost_items WHERE id = ?").run(req.params.id);
  if (!result.changes) {
    return res.status(404).json({ error: "Item not found." });
  }
  res.json({ ok: true });
});

export default router;
