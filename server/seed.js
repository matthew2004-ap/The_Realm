import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "./db.js";

// Only create initial council account if none exists
if (!db.findOne("users", (u) => u.role === "council")) {
  db.insert("users", {
    id: randomUUID(),
    name: "Student Council",
    reg_no: "COUNCIL/01",
    email: "council@therealm.edu",
    password_hash: bcrypt.hashSync("council123", 10),
    role: "council",
    hostel: null,
    phone: null,
    created_at: new Date().toISOString(),
  });
  console.log("Created council account: council@therealm.edu");
}

console.log("Database initialized.");
