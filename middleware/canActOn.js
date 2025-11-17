const roleHierarchy = require("../models/roleHierarchy");
const { logger } = require("../utils/logger");

function canActOn(requesterRole, targetRole) {
  const requesterRank = roleHierarchy[requesterRole] ?? -1;
  const targetRank = roleHierarchy[targetRole] ?? -1;
  
  return requesterRank > targetRank;
}

module.exports = canActOn;