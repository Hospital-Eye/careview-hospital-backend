const { Patient, Vital, Room, Staff, Admission } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

const getDashboardMetrics = async (req, res) => {
    try {
        // --- Date Range for Metrics ---
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

        // --- 1. Calculate Visitors Today (Unique) ---
        const uniquePatientIds = await Admission.findAll({
            where: {
                checkInTime: { [Op.gte]: today, [Op.lte]: endOfToday }
            },
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('patientId')), 'patientId']],
            raw: true
        });
        const visitorsTodayCount = uniquePatientIds.length;

        // --- 2. Calculate Current Occupancy ---
        //total number of rooms
        const totalRooms = await Room.count();

        //rooms currently occupied, based on unique roomId documents
        const occupiedRoomsData = await Admission.findAll({
            where: { dischargeDate: null },
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('roomId')), 'roomId']],
            raw: true
        });

        const occupiedRooms = occupiedRoomsData.length;

        // --- 3. Calculate Equipment Utilization Rate ---
        const equipmentUtilizationData = [
            {
                name: 'CT Scanner',
                percentage: 78, // Placeholder value for now, needs real data
                scans: 42,
                scheduledSlots: 54
            },
            {
                name: 'Infrared Unit A',
                percentage: 65,
                scans: 38,
                scheduledSlots: 58
            }
        ];

        // --- 4. Calculate Active Cases Today by Workflow Stage ---
        const totalActiveCasesToday = await Patient.count({
            where: {
                updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday },
                status: { [Op.ne]: 'Discharged' }
            }
        });

        const checkedInCases = await Patient.count({
            where: {
                currentStage: 'Checked-In',
                updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday }
            }
        });
        const inThermalCases = await Patient.count({
            where: {
                currentStage: 'In Thermal',
                updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday }
            }
        });
        const inCTCases = await Patient.count({
            where: {
                currentStage: 'In CT',
                updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday }
            }
        });
        const awaitingResultsCases = await Patient.count({
            where: {
                currentStage: 'Awaiting Results',
                updatedAt: { [Op.gte]: today, [Op.lte]: endOfToday }
            }
        });

        // --- 5. Calculate Average Turnaround Time (TAT) ---
        const completedCasesLast24Hours = await Patient.findAll({
            where: {
                finalReportSentTime: { [Op.gte]: last24Hours },
                checkInTime: { [Op.ne]: null }
            }
        });

        let totalTATMinutes = 0;
        let casesWithTAT = 0;
        completedCasesLast24Hours.forEach(patient => {
            if (patient.checkInTime && patient.finalReportSentTime) {
                const tatMs = patient.finalReportSentTime.getTime() - patient.checkInTime.getTime();
                totalTATMinutes += tatMs / (1000 * 60);
                casesWithTAT++;
            }
        });
        const averageTATMinutes = casesWithTAT > 0 ? totalTATMinutes / casesWithTAT : 0;
        const hours = Math.floor(averageTATMinutes / 60);
        const minutes = Math.round(averageTATMinutes % 60);
        const averageTATDisplay = casesWithTAT > 0 ? `${hours}h ${minutes}m` : 'N/A';

        // --- Construct the Final Response Object ---
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
                    // ... other stages
                },
            },
            averageTurnaroundTime: {
                display: averageTATDisplay,
                valueInMinutes: averageTATMinutes
            },
        };

        res.status(200).json(dashboardData);

    } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        res.status(500).json({ error: 'Server error: Unable to fetch dashboard metrics.' });
    }
};

module.exports = {
    getDashboardMetrics,
};
