const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { initDatabase } = require("./db/mysql");
const aiRoutes = require("./routes/ai.routes");
const projectRoutes = require("./routes/projects.routes");
const userRoutes = require("./routes/users.routes");
const authRoutes = require("./routes/auth.routes");
const portfolioRoutes = require("./routes/portfolio.routes");
const persistentRoutes = require("./routes/persistent.routes");
const errorHandler = require("./middleware/error.middleware");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────────────
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001"], credentials: true }));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api", aiRoutes);
app.use("/api", persistentRoutes);
app.use("/api", projectRoutes);
app.use("/api", userRoutes);
app.use("/api", portfolioRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "BuildSmart AI Backend", version: "1.0.0" });
});

// ── Global Error Handling Middleware ────────────────────────────────────
app.use(errorHandler);

// ── Initialize DB then Start Server ─────────────────────────────────────
(async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`[OK] BuildSmart Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("[FATAL] Failed to initialize database:", err);
    process.exit(1);
  }
})();
