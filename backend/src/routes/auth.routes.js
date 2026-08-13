const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { users, addUser, findUserByEmail, UniqueConstraintError } = require("../data/sampleData");
const { JWT_SECRET, authenticateToken } = require("../middleware/auth.middleware");

// Helper to generate initials avatar
function getAvatar(name) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

// ── POST /api/auth/register ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, company, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields: name, email, password, role." });
    }

    // Strict role validation - only exact "builder" or "client"
    if (role !== "builder" && role !== "client") {
      return res.status(400).json({ error: "Invalid role specified. Must be 'builder' or 'client'." });
    }

    // Role-Specific Company Field Validation & Data Normalization
    let normalizedCompany = null;
    if (role === "builder") {
      const trimmedCompany = typeof company === "string" ? company.trim() : "";
      if (!trimmedCompany) {
        return res.status(400).json({ error: "Company / Organization is required for Builder accounts." });
      }
      normalizedCompany = trimmedCompany;
    } else if (role === "client") {
      normalizedCompany = (typeof company === "string" && company.trim()) ? company.trim() : null;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Application data-layer uniqueness check before insert
    const existingUser = findUserByEmail(normalizedEmail);
    if (existingUser) {
      const existingRole = existingUser.role === "builder" ? "builder" : "client";
      const displayRole = existingRole === "builder" ? "Builder" : "Client";
      return res.status(409).json({
        error: `An account with this email already exists as a ${displayRole}. Please log in as ${displayRole} or use a different email address.`,
        existingRole,
        isDuplicate: true,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Call data layer addUser which enforces data-layer email index uniqueness
    const newUser = addUser({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: role,
      company: normalizedCompany,
      phone: (typeof phone === "string" && phone.trim()) ? phone.trim() : "",
      avatar: getAvatar(name),
      joinedDate: new Date().toISOString().split("T")[0],
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { passwordHash: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: "Registration successful",
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    if (err instanceof UniqueConstraintError || err.isDuplicate) {
      const existingRole = err.existingUser?.role === "builder" ? "builder" : "client";
      const displayRole = existingRole === "builder" ? "Builder" : "Client";
      return res.status(409).json({
        error: `An account with this email already exists as a ${displayRole}. Please log in as ${displayRole} or use a different email address.`,
        existingRole,
        isDuplicate: true,
      });
    }
    console.error("[AUTH ERROR] Registration failed:", err);
    res.status(500).json({ error: "Internal server error during registration." });
  }
});

// ── POST /api/auth/login ────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password, requestedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Role anti-spoofing check if requestedRole is provided
    if (requestedRole && typeof requestedRole === "string") {
      const cleanReqRole = requestedRole.trim().toLowerCase();
      if (cleanReqRole && cleanReqRole !== user.role) {
        const displayRole = user.role === "builder" ? "Builder" : "Client";
        return res.status(400).json({
          error: `This email is registered as a ${displayRole}. Please log in using the ${displayRole} account.`,
          actualRole: user.role,
        });
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error("[AUTH ERROR] Login failed:", err);
    res.status(500).json({ error: "Internal server error during login." });
  }
});

// ── GET /api/auth/me ────────────────────────────────────────────────────
router.get("/me", authenticateToken, (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }
  const { passwordHash: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

module.exports = router;
