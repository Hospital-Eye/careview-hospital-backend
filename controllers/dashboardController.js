const { Patient, Vital, Room, Staff, Admission } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../utils/logger');

//GET dashboard metrics
const getDashboardMetrics = async (req, res) => {
  const endpoint = 'getDashboardMetrics';
  const userEmail = req.user?.email || 'unknown';
  const startTime = Date.now();

  logger.info(`[${endpoint}] Request to view dashboard metrics received from ${userEmail}`);

  try {
    //Date Range for Metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    //Visitors Today (Unique Patients) 
    const uniquePatientIds = await Admission.findAll({
      where: {
        checkInTime: { [Op.gte]: today, [Op.lte]: endOfToday },
      },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('patientId')), 'patientId']],
      raw: true,
    });
    const visitorsTodayCount = uniquePatientIds.length;
    logger.info(`[${endpoint}] Number of Visitors Today: ${visitorsTodayCount}`);

    //Current Occupancy
    const totalRooms = await Room.count();
    const occupiedRoomsData = await Admission.findAll({
      where: { dischargeDate: null },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('room')), 'room']],
      raw: true,
    });
    const occupiedRooms = occupiedRoomsData.length;

    logger.info(`[${endpoint}] Occupancy`, {
      totalRooms,
      occupiedRooms,
    });

    //Equipment Utilization 
    const equipmentUtilizationData = [
      { name: 'CT Scanner', percentage: 78, scans: 42, scheduledSlots: 54 },
      { name: 'Infrared Unit A', percentage: 65, scans: 38, scheduledSlots: 58 },
    ];
    logger.debug(`[${endpoint}] Equipment Utilization`, equipmentUtilizationData);

    //Active Cases by Workflow Stage
    const totalActiveCasesToday = await Patient.count({
      where: {
        updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday },
        status: { [Op.ne]: 'Discharged' },
      },
    });

    const checkedInCases = await Admission.count({
      where: { currentWorkflowStage: 'Checked-In', updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday } },
    });
    const inThermalCases = await Admission.count({
      where: { currentWorkflowStage: 'In Thermal', updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday } },
    });
    const inCTCases = await Admission.count({
      where: { currentWorkflowStage: 'In CT', updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday } },
    });
    const awaitingResultsCases = await Admission.count({
      where: { currentWorkflowStage: 'Awaiting Results', updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday } },
    });

    logger.info(`[${endpoint}] Active Cases Today`, {
      total: totalActiveCasesToday,
      stages: { checkedInCases, inThermalCases, inCTCases, awaitingResultsCases },
    });

    //Average Turnaround Time (TAT)
    last24Hours.setHours(last24Hours.getHours() - 24);
    const completedCasesLast24Hours = await Admission.findAll({
      where: {
        reportSentTime: { [Op.gte]: last24Hours },
        checkInTime: { [Op.ne]: null },
      },
    });

    let totalTATMinutes = 0;
    let casesWithTAT = 0;

    completedCasesLast24Hours.forEach(admission => {
      if (admission.checkInTime && admission.reportSentTime) {
        const tatMs = admission.reportSentTime.getTime() - admission.checkInTime.getTime();
        totalTATMinutes += tatMs / (1000 * 60);
        casesWithTAT++;
      }
    });

    const averageTATMinutes = casesWithTAT > 0 ? totalTATMinutes / casesWithTAT : 0;
    const averageTATDisplay =
      averageTATMinutes > 60 ? `${(averageTATMinutes / 60).toFixed(1)} hrs` : `${Math.round(averageTATMinutes)} mins`;

    logger.info(`[${endpoint}] Average Turn Around Time`, {
      completedCases: completedCasesLast24Hours.length,
      averageTATMinutes,
      averageTATDisplay,
    });

    //Final Response
    const dashboardData = {
      visitorsToday: visitorsTodayCount,
      currentOccupancy: { occupied: occupiedRooms, total: totalRooms },
      equipmentUtilization: equipmentUtilizationData,
      activeCases: {
        total: totalActiveCasesToday,
        stages: {
          checkedIn: checkedInCases,
          inThermal: inThermalCases,
          inCT: inCTCases,
          awaitingResults: awaitingResultsCases,
        },
      },
      averageTurnaroundTime: {
        display: averageTATDisplay,
        valueInMinutes: averageTATMinutes,
      },
    };

    const durationMs = Date.now() - startTime;
    logger.info(`[${endpoint}] Dashboard metrics fetched successfully`, {
      user: userEmail,
      durationMs,
    });

    res.status(200).json(dashboardData);
  } catch (error) {
    logger.error(`[${endpoint}] Error fetching dashboard metrics: ${error.message}`, {
      stack: error.stack,
      user: userEmail,
    });
    res.status(500).json({ error: 'Server error: Unable to fetch dashboard metrics.' });
  }
};

module.exports = { getDashboardMetrics };






















/*
const getDashboardMetrics = async (req, res) => {

    try {
    console.log("📊 Fetching dashboard metrics...");

    // --- Date Range for Metrics ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    console.log("📅 Date ranges:", { today, endOfToday, last24Hours });

    // --- 1. Visitors Today (Unique Patients) ---
    const uniquePatientIds = await Admission.findAll({
      where: {
        checkInTime: { [Op.gte]: today, [Op.lte]: endOfToday }
      },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('patientId')), 'patientId']],
      raw: true
    });

    const visitorsTodayCount = uniquePatientIds.length;
    console.log(`👥 Visitors Today: ${visitorsTodayCount}`);

    // --- 2. Current Occupancy ---
    const totalRooms = await Room.count();
    console.log(`🏠 Total Rooms: ${totalRooms}`);

    const occupiedRoomsData = await Admission.findAll({
      where: { dischargeDate: null },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('room')), 'room']],
      raw: true
    });

    const occupiedRooms = occupiedRoomsData.length;
    console.log(`🛏️ Occupied Rooms: ${occupiedRooms}`);

    // --- 3. Equipment Utilization ---
    const equipmentUtilizationData = [
      { name: 'CT Scanner', percentage: 78, scans: 42, scheduledSlots: 54 },
      { name: 'Infrared Unit A', percentage: 65, scans: 38, scheduledSlots: 58 }
    ];
    console.log("🧰 Equipment Utilization Data:", equipmentUtilizationData);

    // --- 4. Active Cases Today by Workflow Stage ---
    const totalActiveCasesToday = await Patient.count({
      where: {
        updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday },
        status: { [Op.ne]: 'Discharged' }
      }
    });
    console.log(`📋 Total Active Cases Today: ${totalActiveCasesToday}`);

    const checkedInCases = await Admission.count({
      where: { currentWorkflowStage: 'Checked-In', updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday } }
    });
    const inThermalCases = await Admission.count({
      where: { currentWorkflowStage: 'In Thermal', updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday } }
    });
    const inCTCases = await Admission.count({
      where: { currentWorkflowStage: 'In CT', updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday } }
    });
    const awaitingResultsCases = await Admission.count({
      where: { currentWorkflowStage: 'Awaiting Results', updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday } }
    });

    console.log("📈 Cases by Stage:", {
      checkedInCases,
      inThermalCases,
      inCTCases,
      awaitingResultsCases
    });

    // --- 5. Average Turnaround Time (TAT) ---

    last24Hours.setHours(last24Hours.getHours() - 24);

    // Find admissions that have both check-in and report-sent times in the last 24 hours
    const completedCasesLast24Hours = await Admission.findAll({
    where: {
        reportSentTime: { [Op.gte]: last24Hours },
        checkInTime: { [Op.ne]: null }
    }
    });

    let totalTATMinutes = 0;
    let casesWithTAT = 0;

    completedCasesLast24Hours.forEach(admission => {
    if (admission.checkInTime && admission.reportSentTime) {
        const tatMs = admission.reportSentTime.getTime() - admission.checkInTime.getTime();
        totalTATMinutes += tatMs / (1000 * 60);
        casesWithTAT++;
    }
    });

    // Compute average and display string
    const averageTATMinutes = casesWithTAT > 0 ? totalTATMinutes / casesWithTAT : 0;
    const averageTATDisplay = averageTATMinutes > 60
    ? `${(averageTATMinutes / 60).toFixed(1)} hrs`
    : `${Math.round(averageTATMinutes)} mins`;

    console.log('✅ Completed cases (24h):', completedCasesLast24Hours.length);
    console.log('🧮 Average TAT (min):', averageTATMinutes);



    // --- Construct Final Response ---
    const dashboardData = {
    visitorsToday: visitorsTodayCount,
    currentOccupancy: { occupied: occupiedRooms, total: totalRooms },
    equipmentUtilization: equipmentUtilizationData,
    activeCases: {
        total: totalActiveCasesToday,
        stages: {
        checkedIn: checkedInCases,
        inThermal: inThermalCases,
        inCT: inCTCases,
        awaitingResults: awaitingResultsCases
        }
    },
    averageTurnaroundTime: {
        display: averageTATDisplay,
        valueInMinutes: averageTATMinutes
    }
    };

    res.status(200).json(dashboardData);


  } catch (error) {
    console.error('❌ Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Server error: Unable to fetch dashboard metrics.' });
  }  
};

*/
    