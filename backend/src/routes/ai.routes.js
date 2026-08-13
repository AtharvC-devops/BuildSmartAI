const express = require("express");
const axios = require("axios");
const router = express.Router();
const { suppliers } = require("../data/sampleData");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

// ── POST /api/predict-cost ──────────────────────────────────────────────
router.post("/predict-cost", async (req, res) => {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/predict-cost`, req.body);
    res.json(data);
  } catch (err) {
    console.error(`[ERROR] AI service unavailable at ${AI_SERVICE_URL}:`, err.message);
    const { area = 1000, material_quality = 3, location_tier = 2, floors = 1 } = req.body;
    const matMult = [0, 0.7, 0.85, 1.0, 1.3, 1.8][material_quality] || 1;
    const locMult = [0, 1.4, 1.0, 0.7][location_tier] || 1;
    const cost = 1200 * area * matMult * locMult * (1 + 0.15 * (floors - 1));
    res.json({
      predicted_cost: Math.round(cost),
      breakdown: {
        Materials:  Math.round(cost * 0.35),
        Labor:      Math.round(cost * 0.28),
        Foundation: Math.round(cost * 0.10),
        Overhead:   Math.round(cost * 0.08),
        Permits:    Math.round(cost * 0.05),
        Finishing:  Math.round(cost * 0.14),
      },
      confidence: 0.82,
      fallback: true,
    });
  }
});

// ── POST /api/predict-time ──────────────────────────────────────────────
router.post("/predict-time", async (req, res) => {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/predict-time`, req.body);
    res.json(data);
  } catch (err) {
    console.warn("[WARN] AI service unavailable, using fallback prediction");
    const { area = 1000, workers = 10, complexity = 3 } = req.body;
    const days = Math.max(Math.round(area * 0.05 * complexity / Math.pow(workers, 0.6)), 30);
    res.json({
      estimated_days: days,
      phases: [
        { name: "Planning & Permits",    days: Math.max(Math.round(days * 0.08), 7),  color: "#6366f1" },
        { name: "Foundation",            days: Math.max(Math.round(days * 0.12), 10), color: "#f59e0b" },
        { name: "Structure & Framing",   days: Math.max(Math.round(days * 0.25), 15), color: "#10b981" },
        { name: "Electrical & Plumbing", days: Math.max(Math.round(days * 0.18), 10), color: "#3b82f6" },
        { name: "Interior Finishing",    days: Math.max(Math.round(days * 0.22), 12), color: "#ec4899" },
        { name: "Final Inspection",      days: Math.max(Math.round(days * 0.08), 5),  color: "#8b5cf6" },
        { name: "Handover",             days: Math.max(Math.round(days * 0.07), 3),  color: "#14b8a6" },
      ],
      confidence: 0.80,
      fallback: true,
    });
  }
});

// ── POST /api/assign-agent ──────────────────────────────────────────────
router.post("/assign-agent", async (req, res) => {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/allocate-agent`, req.body);
    res.json(data);
  } catch (err) {
    console.warn("[WARN] AI service unavailable, using fallback allocation");
    const { required_skill, agents = [] } = req.body;
    const rankings = agents
      .map((a) => {
        const distScore = 1 - Math.min(a.distance || 50, 100) / 100;
        const ratScore = (a.rating || 3) / 5;
        const wlScore = 1 - Math.min(a.workload || 5, 10) / 10;
        const skillMatch = (a.skill || "").toLowerCase() === (required_skill || "").toLowerCase() ? 1 : 0.5;
        const score = 0.4 * distScore + 0.3 * ratScore + 0.2 * wlScore + 0.1 * skillMatch;
        return { ...a, score: Math.round(score * 1000) / 1000 };
      })
      .sort((a, b) => b.score - a.score);

    res.json({ rankings, best_agent: rankings[0] || {}, fallback: true });
  }
});

// ── POST /api/predict-materials ─────────────────────────────────────────
router.post("/predict-materials", async (req, res) => {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/predict-materials`, req.body);
    res.json(data);
  } catch (err) {
    console.warn("[WARN] AI service unavailable, using fallback materials estimation");
    const { area = 1000, floors = 1, material_quality = 3, construction_type = "residential" } = req.body;
    
    const quality_mult = [0, 0.8, 1.0, 1.2, 1.4, 1.6][material_quality] || 1.0;
    let type_cement_mult = 1.0;
    let type_steel_mult = 1.0;
    let type_brick_mult = 1.0;
    
    const c_type = (construction_type || "").toLowerCase();
    if (c_type.includes("commercial")) {
      type_cement_mult = 1.2;
      type_steel_mult = 1.3;
      type_brick_mult = 0.4;
    } else if (c_type.includes("industrial")) {
      type_cement_mult = 1.3;
      type_steel_mult = 1.5;
      type_brick_mult = 0.2;
    }
    
    const cement_bags = Math.round(area * 0.4 * floors * quality_mult * type_cement_mult);
    const steel_tons = Math.round(area * 0.005 * floors * quality_mult * type_steel_mult * 100) / 100;
    const bricks_count = Math.round(area * 12 * floors * quality_mult * type_brick_mult);
    const sand_cuft = Math.round(area * 1.8 * floors * quality_mult);
    const paint_liters = Math.round(area * 0.15 * floors * quality_mult);
    
    res.json({
      materials: {
        "Cement (bags)": cement_bags,
        "Steel (tons)": steel_tons,
        "Bricks (units)": bricks_count,
        "Sand (cu ft)": sand_cuft,
        "Paint (liters)": paint_liters,
      },
      confidence: 0.90,
      fallback: true,
    });
  }
});

// ── POST /api/predict-risk ──────────────────────────────────────────────
router.post("/predict-risk", async (req, res) => {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/predict-risk`, req.body);
    res.json(data);
  } catch (err) {
    console.warn("[WARN] AI service unavailable, using fallback risk prediction");
    const { city = "Mumbai", floors = 1, workers = 10, start_month = "January" } = req.body;
    
    const safety = (floors > 5 || workers > 50) ? "High" : ((floors > 2 || workers > 15) ? "Medium" : "Low");
    
    const city_l = (city || "").toLowerCase();
    const month_l = (start_month || "").toLowerCase();
    const monsoon_months = ["june", "july", "august", "september"];
    const winter_months = ["december", "january"];
    
    let weather = "Low";
    if (["mumbai", "chennai", "kolkata"].includes(city_l) && monsoon_months.includes(month_l)) {
      weather = "High";
    } else if (["delhi", "noida", "gurgaon"].includes(city_l) && winter_months.includes(month_l)) {
      weather = "High";
    } else if (["delhi", "bangalore", "pune", "hyderabad"].includes(city_l) && ["july", "august"].includes(month_l)) {
      weather = "Medium";
    }
    
    const compliance = floors > 6 ? "High" : (floors > 3 ? "Medium" : "Low");
    
    const checklist = [];
    if (safety === "High") {
      checklist.push("Mandatory double-harness fall protection for heights above 15m.");
      checklist.push("Deploy dedicated Safety Officers with authority to stop work.");
      checklist.push("Weekly structural integrity audits on scaffolding.");
    } else if (safety === "Medium") {
      checklist.push("Daily safety briefings (tool box talks) before shifts.");
      checklist.push("Hard hats, steel-toed boots, and high-visibility vests mandatory for all.");
    } else {
      checklist.push("Standard construction site safety signage and first aid station setup.");
    }
    
    if (weather === "High") {
      checklist.push("Install high-capacity site drainage pumps to prevent waterlogging.");
      checklist.push("Store cement bags and plaster materials on raised platforms under waterproof sheets.");
      checklist.push("Plan concrete pouring activities based on short-term hourly rain/fog forecasts.");
    } else if (weather === "Medium") {
      checklist.push("Keep active work zones covered and ensure backup power for sump pumps.");
    } else {
      checklist.push("Ensure regular water spraying to suppress dust emissions in dry conditions.");
    }
    
    if (compliance === "High") {
      checklist.push("Secure High-Rise Fire Safety NOC from local municipal corporation.");
      checklist.push("Obtain environmental clearance certificate (noise, air, debris disposal).");
      checklist.push("Submit structural stability certificate signed by a licensed civil engineer.");
    } else if (compliance === "Medium") {
      checklist.push("Verify local zoning permits and height clearance NOC from authorities.");
    } else {
      checklist.push("File standard building plan sanction and local ward office notification.");
    }
    
    res.json({
      safety_risk: safety,
      weather_risk: weather,
      compliance_risk: compliance,
      mitigation_checklist: checklist,
      confidence: 0.88,
      fallback: true,
    });
  }
});

// ── GET /api/suppliers ──────────────────────────────────────────────────
router.get("/suppliers", async (req, res) => {
  const { material } = req.query;
  let filteredSuppliers = [...suppliers];
  
  if (material) {
    filteredSuppliers = filteredSuppliers.filter(
      (s) => s.material.toLowerCase() === material.toLowerCase()
    );
  }
  
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/allocate-supplier`, {
      material: material || "Cement",
      suppliers: filteredSuppliers.map((s) => ({
        id: s.id,
        name: s.name,
        material: s.material,
        rating: s.rating,
        distance: s.distance,
        price_index: s.priceIndex,
        availability: s.availability,
        location: s.location,
      })),
    });
    res.json(data);
  } catch (err) {
    console.warn("[WARN] AI service unavailable, using fallback supplier ranking");
    const rankings = filteredSuppliers.map((s) => {
      const distScore = 1.0 - (Math.min(s.distance, 50.0) / 50.0);
      const priceVal = Math.min(Math.max(s.priceIndex, 0.7), 1.5);
      const priceScore = 1.0 - ((price_val - 0.7) / (1.5 - 0.7));
      const ratingScore = s.rating / 5.0;
      const availScore = s.availability ? 1.0 : 0.0;
      
      const score = 0.35 * distScore + 0.30 * priceScore + 0.25 * ratingScore + 0.10 * avail_score;
      return {
        id: s.id,
        name: s.name,
        material: s.material,
        rating: s.rating,
        distance: s.distance,
        price_index: s.priceIndex,
        availability: s.availability,
        location: s.location,
        score: Math.round(score * 1000) / 1000,
      };
    }).sort((a, b) => b.score - a.score);
    
    res.json({
      rankings,
      best_supplier: rankings[0] || {},
      fallback: true,
    });
  }
});

// ── POST /api/qa-chat ────────────────────────────────────────────────────
router.post("/qa-chat", async (req, res) => {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/qa-chat`, req.body);
    res.json(data);
  } catch (err) {
    console.warn("[WARN] AI service unavailable, using fallback QA advisor");
    const { question = "" } = req.body;
    const q = question.toLowerCase();
    
    let answer = "";
    if (q.includes("concrete") || q.includes("cure") || q.includes("curing") || q.includes("dry")) {
      answer = "Concrete generally takes 28 days to reach full design strength (typically strong enough for loads in 7 days). Curing (moisturizing) it for the first 3-7 days is essential to avoid cracking.";
    } else if (q.includes("foundation") || q.includes("soil") || q.includes("footing")) {
      answer = "Soft clay soils benefit from raft or pile foundations, whereas stable soils support standard isolated footings. Ensure proper compaction and leveling before pouring concrete.";
    } else if (q.includes("permit") || q.includes("noc") || q.includes("approval") || q.includes("compliance")) {
      answer = "Zoning permit sanction and environmental clearances are standard. High-rises exceeding 15 meters legally require a fire safety NOC and licensed structural stability certificate.";
    } else if (q.includes("paint") || q.includes("plaster") || q.includes("finishing")) {
      answer = "Wait 14-21 days for new plaster to cure and dry before painting. Wipe dust off the plaster, apply primer, and follow with two coats of weather-resistant acrylic emulsion.";
    } else if (q.includes("cost") || q.includes("save") || q.includes("budget") || q.includes("overrun")) {
      answer = "Control overruns by purchasing materials in bulk from wholesale vendors, tracking logs daily to curb wastage, and maintaining scaffolding schedules to avoid late rental fees.";
    } else if (q.includes("steel") || q.includes("reinforcement") || q.includes("rebar")) {
      answer = "Reinforcement rebar provides tensile strength. Fe 500 TMT bars are suggested for high earthquake zones. Ensure steel is scale-free and concrete cover is 20-40mm to prevent corrosion.";
    } else {
      answer = "Welcome to BuildSmart AI! For site safety, ensure daily tool-box meetings are held, protective gear (helmets, boots) is worn, and IS codes are followed for mixing M20 ratios.";
    }
    
    res.json({ answer, fallback: true });
  }
});

// ── POST /api/predict-price (Real ML Model) ─────────────────────────────
router.post("/predict-price", async (req, res) => {
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/predict-price`, req.body);
    res.json(data);
  } catch (err) {
    console.error(`[ERROR] AI predict-price failed:`, err.message);
    res.status(500).json({ error: "AI service unavailable. Ensure model is trained." });
  }
});

// ── GET /api/locations (Model Location List) ────────────────────────────
router.get("/locations", async (req, res) => {
  try {
    const { data } = await axios.get(`${AI_SERVICE_URL}/locations`);
    res.json(data);
  } catch (err) {
    console.warn("[WARN] AI service unavailable for locations");
    res.json({ locations: [], count: 0, fallback: true });
  }
});

module.exports = router;
