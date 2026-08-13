const express = require("express");
const cors = require("cors");
require("dotenv").config();

const aiRoutes = require("./routes/ai.routes");
const projectRoutes = require("./routes/projects.routes");
const userRoutes = require("./routes/users.routes");
const authRoutes = require("./routes/auth.routes");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────────────
app.use(cors({ origin: ["http://localhost:3000"], credentials: true }));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api", aiRoutes);
app.use("/api", projectRoutes);
app.use("/api", userRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "BuildSmart AI Backend", version: "1.0.0" });
});

// ── Start ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[OK] BuildSmart Backend running on http://localhost:${PORT}`);
});
