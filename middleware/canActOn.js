const roleHierarchy = require("../models/roleHierarchy");

function canActOn(requesterRole, targetRole) {
  const requesterRank = roleHierarchy[requesterRole] ?? -1;
  const targetRank = roleHierarchy[targetRole] ?? -1;
  
  // requester must be strictly higher than target
  return requesterRank > targetRank;
}

module.exports = canActOn;