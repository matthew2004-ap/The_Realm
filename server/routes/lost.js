import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "../db.js";
import { requireAuth, requireCouncil } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  const { filter, search } = req.query;
  let rows = db.all("lostItems").sort((a, b) => b.created_at.localeCompare(a.created_at));

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

  const item = db.insert("lostItems", {
    id: randomUUID(),
    user_id: req.user.id,
    item_name: itemName.trim(),
    last_seen: lastSeen.trim(),
    contact: contact.trim(),
    proof: proof.trim(),
    description: description.trim(),
    status: "missing",
    claim_proof: null,
    created_at: new Date().toISOString(),
  });

  // Log lost item report
  db.insert("activities", {
    id: randomUUID(),
    type: "lost_reported",
    user_id: req.user.id,
    user_name: req.user.name,
    related_id: item.id,
    description: `${req.user.name} reported missing item: "${item.item_name}".`,
    created_at: new Date().toISOString(),
  });

  res.status(201).json({ item });
});

router.patch("/:id/found", requireAuth, requireCouncil, (req, res) => {
  const item = db.update("lostItems", req.params.id, { status: "found" });
  if (!item) {
    return res.status(404).json({ error: "Item not found." });
  }

  // Log item found
  db.insert("activities", {
    id: randomUUID(),
    type: "item_found",
    user_id: req.user.id,
    user_name: req.user.name,
    related_id: item.id,
    description: `${req.user.name} marked "${item.item_name}" as found.`,
    created_at: new Date().toISOString(),
  });

  res.json({ item });
});

router.patch("/:id/claim", requireAuth, (req, res) => {
  const { claimProof } = req.body;
  if (!claimProof?.trim()) {
    return res.status(400).json({ error: "Proof of ownership is required to claim an item." });
  }

  const item = db.get("lostItems", req.params.id);
  if (!item) {
    return res.status(404).json({ error: "Item not found." });
  }

  if (item.status !== "found") {
    return res.status(400).json({ error: "Only found items can be claimed." });
  }

  const updated = db.update("lostItems", req.params.id, {
    status: "claimed",
    claim_proof: claimProof.trim(),
  });

  // Log item claimed
  db.insert("activities", {
    id: randomUUID(),
    type: "item_claimed",
    user_id: req.user.id,
    user_name: req.user.name,
    related_id: updated.id,
    description: `${req.user.name} claimed "${updated.item_name}".`,
    created_at: new Date().toISOString(),
  });

  res.json({ item: updated });
});

router.delete("/:id", requireAuth, requireCouncil, (req, res) => {
  const item = db.get("lostItems", req.params.id);
  if (!db.remove("lostItems", req.params.id)) {
    return res.status(404).json({ error: "Item not found." });
  }

  // Log deletion
  if (item) {
    db.insert("activities", {
      id: randomUUID(),
      type: "lost_deleted",
      user_id: req.user.id,
      user_name: req.user.name,
      related_id: item.id,
      description: `${req.user.name} removed lost item: "${item.item_name}".`,
      created_at: new Date().toISOString(),
    });
  }

  res.json({ ok: true });
});

export default router;
