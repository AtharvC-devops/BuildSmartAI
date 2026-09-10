const CORE_FEATURES = [
  "dashboard",
  "projects",
  "daily_logs",
  "boq",
  "ra_billing"
];

const MID_FEATURES = [
  ...CORE_FEATURES,
  "material_sourcing",
  "worker_allocation",
  "contractors",
  "cost_tracking"
];

const LARGE_FEATURES = [
  ...MID_FEATURES,
  "risk_advisory",
  "ai_cost_prediction",
  "time_prediction",
  "advanced_worker_allocation",
  "enterprise_compliance"
];

const SCALE_CONFIG = {
  SMALL: {
    label: "Small Contractor / Individual Builder",
    maxProjects: 2,
    enabledFeatures: CORE_FEATURES,
    advancedFeatures: []
  },
  MID: {
    label: "Mid-size Regional Developer",
    maxProjects: 10,
    enabledFeatures: MID_FEATURES,
    advancedFeatures: ["portfolio_dashboard", "bulk_procurement"]
  },
  LARGE: {
    label: "Large Branded Developer",
    maxProjects: null,
    enabledFeatures: LARGE_FEATURES,
    advancedFeatures: ["portfolio_dashboard", "bulk_procurement", "multi_entity_controls"]
  }
};

function getScaleConfig(scale) {
  return SCALE_CONFIG[String(scale || "SMALL").toUpperCase()] || SCALE_CONFIG.SMALL;
}

function hasFeature(scale, feature) {
  const config = getScaleConfig(scale);
  return config.enabledFeatures.includes(feature) || config.advancedFeatures.includes(feature);
}

module.exports = { SCALE_CONFIG, getScaleConfig, hasFeature };
