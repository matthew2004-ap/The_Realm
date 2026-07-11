import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "../db.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = Router();

router.post("/register", (req, res) => {
  const { name, regNo, email, password, role = "student", hostel, phone } = req.body;

  if (!name?.trim() || !regNo?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Name, registration number, email, and password are required." });
  }

  if (!["student", "council"].includes(role)) {
    return res.status(400).json({ error: "Invalid role." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ? OR reg_no = ?").get(email.trim(), regNo.trim());
  if (existing) {
    return res.status(409).json({ error: "A user with that email or registration number already exists." });
  }

  const id = randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(
    `INSERT INTO users (id, name, reg_no, email, password_hash, role, hostel, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name.trim(), regNo.trim(), email.trim().toLowerCase(), passwordHash, role, hostel?.trim() || null, phone?.trim() || null);

  const user = db.prepare("SELECT id, name, reg_no, email, role, hostel, phone FROM users WHERE id = ?").get(id);
  const token = signToken(user);

  res.status(201).json({ token, user });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db
    .prepare("SELECT id, name, reg_no, email, role, hostel, phone, password_hash FROM users WHERE email = ?")
    .get(email.trim().toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  delete user.password_hash;
  const token = signToken(user);
  res.json({ token, user });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, name, reg_no, email, role, hostel, phone FROM users WHERE id = ?")
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  res.json({ user });
});

export default router;
