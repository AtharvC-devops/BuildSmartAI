/**
 * Centralized agent and supplier scoring formulas
 */

function calculateAgentScore(agent, requiredSkill) {
  const dist = agent.distance !== undefined ? agent.distance : 50;
  const rating = agent.rating !== undefined ? agent.rating : 3;
  const workload = agent.workload !== undefined ? agent.workload : 5;
  const skill = agent.skill || "";

  const distScore = 1 - Math.min(dist, 100) / 100;
  const ratScore = rating / 5;
  const wlScore = 1 - Math.min(workload, 10) / 10;
  const skillMatch = skill.toLowerCase() === (requiredSkill || "").toLowerCase() ? 1.0 : 0.5;

  const score = 0.4 * distScore + 0.3 * ratScore + 0.2 * wlScore + 0.1 * skillMatch;
  return Math.round(score * 1000) / 1000;
}

function calculateSupplierScore(supplier) {
  const dist = supplier.distance !== undefined ? supplier.distance : 50;
  const rating = supplier.rating !== undefined ? supplier.rating : 3;
  // Handle both camelCase priceIndex (sampleData.js) and snake_case price_index (pydantic model)
  const priceIndex = supplier.priceIndex !== undefined ? supplier.priceIndex : (supplier.price_index !== undefined ? supplier.price_index : 1.0);
  const availability = supplier.availability !== undefined ? supplier.availability : true;

  const distScore = 1.0 - (Math.min(dist, 50.0) / 50.0);
  const priceVal = Math.min(Math.max(priceIndex, 0.7), 1.5);
  const priceScore = 1.0 - ((priceVal - 0.7) / (1.5 - 0.7));
  const ratingScore = rating / 5.0;
  const availScore = availability ? 1.0 : 0.0;

  const score = 0.35 * distScore + 0.30 * priceScore + 0.25 * ratingScore + 0.10 * availScore;
  return Math.round(score * 1000) / 1000;
}

module.exports = {
  calculateAgentScore,
  calculateSupplierScore
};
