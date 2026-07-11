import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "./db.js";

import authRoutes from "./routes/auth.js";
import arrivalRoutes from "./routes/arrivals.js";
import gateRoutes from "./routes/gate-dates.js";
import lostRoutes from "./routes/lost.js";
import maintenanceRoutes from "./routes/maintenance.js";
import statsRoutes from "./routes/stats.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(publicDir));

app.use("/api/auth", authRoutes);
app.use("/api/arrivals", arrivalRoutes);
app.use("/api/gate-dates", gateRoutes);
app.use("/api/lost", lostRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/stats", statsRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "The Realm Campus Operations" });
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`The Realm is running at http://localhost:${PORT}`);
});
