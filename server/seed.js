import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "./db.js";

const councilExists = db.prepare("SELECT id FROM users WHERE role = 'council' LIMIT 1").get();
if (!councilExists) {
  db.prepare(
    `INSERT INTO users (id, name, reg_no, email, password_hash, role, phone)
     VALUES (?, ?, ?, ?, ?, 'council', ?)`
  ).run(
    randomUUID(),
    "Student Council",
    "COUNCIL/01",
    "council@therealm.edu",
    bcrypt.hashSync("council123", 10),
    "0800 000 0001"
  );
  console.log("Created council account: council@therealm.edu / council123");
}

const studentExists = db.prepare("SELECT id FROM users WHERE role = 'student' LIMIT 1").get();
if (!studentExists) {
  const studentId = randomUUID();
  db.prepare(
    `INSERT INTO users (id, name, reg_no, email, password_hash, role, hostel, phone)
     VALUES (?, ?, ?, ?, ?, 'student', ?, ?)`
  ).run(
    studentId,
    "Demo Student",
    "CSC/23/0142",
    "student@therealm.edu",
    bcrypt.hashSync("student123", 10),
    "Hostel B",
    "0803 220 1144"
  );
  console.log("Created student account: student@therealm.edu / student123");
}

const gateCount = db.prepare("SELECT COUNT(*) AS count FROM gate_dates").get().count;
if (gateCount === 0) {
  const gates = [
    ["Tuesday", "Gate intake from 8:00 AM - 1:00 PM", "Best for large incoming packages, delivery notes, and queue sorting.", "08:00", "13:00"],
    ["Thursday", "Pickup window from 8:00 AM - 1:00 PM", "Students collect ready items, sign against the list, and leave quickly.", "08:00", "13:00"],
    ["Saturday", "Delivery and follow-up from 9:00 AM - 12:00 PM", "Useful for hostel drop-offs, late orders, and missed pickups.", "09:00", "12:00"],
  ];

  const insert = db.prepare(
    `INSERT INTO gate_dates (id, day_name, title, description, start_time, end_time)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  for (const [day, title, desc, start, end] of gates) {
    insert.run(randomUUID(), day, title, desc, start, end);
  }
  console.log("Seeded default gate dates.");
}

const arrivalCount = db.prepare("SELECT COUNT(*) AS count FROM arrivals").get().count;
if (arrivalCount === 0) {
  const student = db.prepare("SELECT id FROM users WHERE email = 'student@therealm.edu'").get();
  if (student) {
    const insert = db.prepare(
      `INSERT INTO arrivals
        (id, user_id, student_name, reg_no, item_name, quantity, eta, phone, note, fulfillment, hostel, status, delivery_fee)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insert.run(randomUUID(), student.id, "Moses Ikenna", "CSC/23/0142", "Textbooks and coding headset", 3, "2026-07-12", "0803 220 1144", "Arriving by campus bus.", "pickup", null, "scheduled", 0);
    insert.run(randomUUID(), student.id, "Adaeze Okafor", "ENG/24/0088", "Mini printer and paper", 2, "2026-07-11", "0806 155 8090", "Courier: Swift Parcel.", "delivery", "Hostel B", "ready", 1400);
    insert.run(randomUUID(), student.id, "Ibrahim Yusuf", "MTH/22/0021", "Groceries and toiletries", 6, "2026-07-14", "0812 303 1194", "Needs same-day notification.", "pickup", null, "arrived", 0);
    console.log("Seeded sample arrivals.");
  }
}

const lostCount = db.prepare("SELECT COUNT(*) AS count FROM lost_items").get().count;
if (lostCount === 0) {
  const insert = db.prepare(
    `INSERT INTO lost_items (id, item_name, last_seen, contact, proof, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  insert.run(randomUUID(), "Blue water bottle", "Hostel C corridor", "0803 555 7741", "Sticker with initials", "Metal bottle with a white cap.", "missing");
  insert.run(randomUUID(), "Calculus notebook", "Library reading room", "0802 115 9901", "Name on first page", "Brown spiral notebook with green tabs.", "found");
  console.log("Seeded sample lost items.");
}

const maintCount = db.prepare("SELECT COUNT(*) AS count FROM maintenance").get().count;
if (maintCount === 0) {
  const insert = db.prepare(
    `INSERT INTO maintenance (id, location, issue_type, area, priority, details, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  insert.run(randomUUID(), "Hostel A", "Electrical", "Room 12", "High", "Two sockets are sparking.", "open");
  insert.run(randomUUID(), "Hostel C", "Water", "Ground floor tap line", "Medium", "Low water pressure in the afternoon.", "open");
  insert.run(randomUUID(), "Hostel B", "Carpentry", "Door hinge at Room 5", "Low", "Door needs tightening.", "in_progress");
  console.log("Seeded sample maintenance issues.");
}

console.log("Database seed complete.");
