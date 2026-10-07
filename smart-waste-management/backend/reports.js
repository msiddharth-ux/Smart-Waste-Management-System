const express = require('express');
const { verifyToken } = require('./auth');
const Bin = require('./Bin');
const Complaint = require('./Complaint');
const { optimizeRoutes } = require('./routeOptimizer');

const router = express.Router();

router.get('/collection-performance', verifyToken, async (req, res) => {
    if (!['admin', 'operator'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Staff access required.' });
    }

    try {
        const [bins, complaints] = await Promise.all([Bin.find(), Complaint.find()]);
        const now = new Date();
        const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const totalBinsCollectedToday = bins.reduce((total, bin) => total + (bin.collectionHistory || []).filter((entry) => (
            new Date(entry.timestamp) >= startOfTodayUtc
        )).length, 0);
        const averageFillLevel = bins.length
            ? Number((bins.reduce((total, bin) => total + (Number(bin.fillLevel) || 0), 0) / bins.length).toFixed(1))
            : 0;
        const pendingComplaints = complaints.filter((complaint) => ['NEW', 'IN_REVIEW'].includes(complaint.status)).length;
        const fullBins = bins.filter((bin) => bin.status === 'FULL');

        let routeEfficiency = null;
        if (fullBins.length > 0) {
            const depot = {
                latitude: fullBins.reduce((total, bin) => total + Number(bin.latitude || 0), 0) / fullBins.length,
                longitude: fullBins.reduce((total, bin) => total + Number(bin.longitude || 0), 0) / fullBins.length
            };
            const estimatedVehicles = Math.max(1, Math.ceil(fullBins.length / 3));
            const result = optimizeRoutes({
                bins: fullBins,
                depot,
                vehicleCount: estimatedVehicles,
                vehicleCapacity: 300
            });
            routeEfficiency = result.feasible ? {
                routeEfficiencyPct: result.routeEfficiencyPct,
                optimizedDistanceKm: result.totalDistance,
                baselineDistanceKm: result.baselineDistance,
                binsRouted: fullBins.length,
                vehicles: result.routes.length,
                basis: 'Distance reduction against current bin order using straight-line distances.'
            } : null;
        }

        res.json({
            generatedAt: now.toISOString(),
            dayBoundary: 'UTC',
            totalBinsCollectedToday,
            averageFillLevel,
            pendingComplaints,
            routeEfficiency
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;