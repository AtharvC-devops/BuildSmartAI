const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { users } = require("../data/sampleData");
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

    const cleanRole = role.toLowerCase().trim();
    if (cleanRole !== "builder" && cleanRole !== "client") {
      return res.status(400).json({ error: "Role must be either 'builder' or 'client'." });
    }

    const existingUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (existingUser) {
      return res.status(409).json({ error: "User with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = {
      id: users.length + 1,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: cleanRole,
      company: company || (cleanRole === "builder" ? "Independent Builder" : null),
      phone: phone || "",
      avatar: getAvatar(name),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);

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
    console.error("[AUTH ERROR] Registration failed:", err);
    res.status(500).json({ error: "Internal server error during registration." });
  }
});

// ── POST /api/auth/login ────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
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
