import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "the-realm-dev-secret-change-in-production";

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, regNo: user.reg_no },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

export function requireCouncil(req, res, next) {
  if (req.user?.role !== "council") {
    return res.status(403).json({ error: "Council access required." });
  }
  next();
}
