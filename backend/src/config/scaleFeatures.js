const SCALE_FEATURES = [
  "dashboard",
  "projects",
  "boq",
  "cost_tracking",
  "contractors",
  "ra_billing",
  "ra_bill_pdf",
  "labour",
  "material_rates",
  "material_procurement",
  "daily_logs",
  "milestones",
  "risk_checklist",
  "compliance",
  "rera_compliance",
  "gst_billing",
  "notifications",
  "audit_history",
  "regional_languages",
  // Legacy UI keys retained as aliases during the migration.
  "worker_allocation",
  "material_sourcing",
  "risk_advisory",
  "enterprise_compliance"
];

const SCALE_CONFIG = {
  SMALL: {
    label: "Small Contractor / Individual Builder",
    maxProjects: 2,
    enabledFeatures: SCALE_FEATURES,
    advancedFeatures: []
  },
  MID: {
    label: "Mid-size Regional Developer",
    maxProjects: 10,
    enabledFeatures: SCALE_FEATURES,
    advancedFeatures: ["portfolio_dashboard", "bulk_procurement"]
  },
  LARGE: {
    label: "Large Branded Developer",
    maxProjects: null,
    enabledFeatures: SCALE_FEATURES,
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
