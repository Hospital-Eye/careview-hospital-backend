const Patient = require('../models/Patient'); 
const Vital = require('../models/Vital');     
const Room = require('../models/Room');       
const Staff = require('../models/Staff');
const Admission = require('../models/Admission');

const getDashboardMetrics = async (req, res) => {
    try {
        // --- Date Range for Metrics ---
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999); 

        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

        // --- 1. Calculate Visitors Today (Unique) ---
        const visitorsTodayCount = await Admission.distinct("patientId", {
        checkInTime: { $gte: today, $lte: endOfToday }
        }).then(uniquePatients => uniquePatients.length);

        // --- 2. Calculate Current Occupancy ---
        //total number of rooms
        const totalRooms = await Room.countDocuments({});

        //rooms currently occupied, based on unique roomId documents
        const occupiedRoomsAgg = await Admission.aggregate([
        { $match: { dischargeDate: null } },
        { $group: { _id: "$roomId" } }
        ]);

        const occupiedRooms = occupiedRoomsAgg.length;

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
        const totalActiveCasesToday = await Patient.countDocuments({
            updatedAt: { $gte: today, $lte: endOfToday },
            status: { $ne: 'Discharged' }
        });

        const checkedInCases = await Patient.countDocuments({ currentStage: 'Checked-In', updatedAt: { $gte: today, $lte: endOfToday } });
        const inThermalCases = await Patient.countDocuments({ currentStage: 'In Thermal', updatedAt: { $gte: today, $lte: endOfToday } });
        const inCTCases = await Patient.countDocuments({ currentStage: 'In CT', updatedAt: { $gte: today, $lte: endOfToday } });
        const awaitingResultsCases = await Patient.countDocuments({ currentStage: 'Awaiting Results', updatedAt: { $gte: today, $lte: endOfToday } });

        // --- 5. Calculate Average Turnaround Time (TAT) ---
        const completedCasesLast24Hours = await Patient.find({
            finalReportSentTime: { $gte: last24Hours },
            checkInTime: { $ne: null }
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
