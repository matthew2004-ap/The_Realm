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

  const existing = db.findOne("users", (u) => u.email === email.trim().toLowerCase() || u.reg_no === regNo.trim());
  if (existing) {
    return res.status(409).json({ error: "A user with that email or registration number already exists." });
  }

  const user = db.insert("users", {
    id: randomUUID(),
    name: name.trim(),
    reg_no: regNo.trim(),
    email: email.trim().toLowerCase(),
    password_hash: bcrypt.hashSync(password, 10),
    role,
    hostel: hostel?.trim() || null,
    phone: phone?.trim() || null,
    created_at: new Date().toISOString(),
  });

  // Log account creation activity
  db.insert("activities", {
    id: randomUUID(),
    type: "account_created",
    user_id: user.id,
    user_name: user.name,
    description: `${user.name} (${user.reg_no}) created a new ${user.role} account.`,
    created_at: new Date().toISOString(),
  });

  const { password_hash, ...safeUser } = user;
  const token = signToken(safeUser);
  res.status(201).json({ token, user: safeUser, welcomeMessage: `Hello ${user.name}! Welcome👋` });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = db.findOne("users", (u) => u.email === email.trim().toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const { password_hash, ...safeUser } = user;
  const token = signToken(safeUser);
  res.json({ token, user: safeUser });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.get("users", req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }
  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser });
});

export default router;
