const express = require('express');
const router = express.Router();
const Bin = require('./Bin');
const { optimizeRoutes } = require('./routeOptimizer');

// GET all bins
router.get('/', async (req, res) => {
    try {
        const bins = await Bin.find();
        res.json(bins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET single bin
router.get('/:id', async (req, res) => {
    try {
        const bin = await Bin.findById(req.params.id);
        if (!bin) return res.status(404).json({ error: 'Bin not found' });
        res.json(bin);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CREATE bin
router.post('/', async (req, res) => {
    try {
        const { name, locationName, latitude, longitude, wasteType, capacity, alertThreshold } = req.body;
        const newBin = await Bin.create({
            name,
            locationName,
            latitude,
            longitude,
            wasteType: wasteType || 'GENERAL',
            capacity: capacity || 100,
            alertThreshold: alertThreshold || 80,
            fillLevel: 0,
            status: 'NORMAL'
        });
        res.status(201).json(newBin);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE bin
router.put('/:id', async (req, res) => {
    try {
        const { name, locationName, latitude, longitude, wasteType, capacity, alertThreshold, fillLevel } = req.body;
        const bin = await Bin.findById(req.params.id);
        if (!bin) return res.status(404).json({ error: 'Bin not found' });

        if (name) bin.name = name;
        if (locationName !== undefined) bin.locationName = locationName;
        if (latitude) bin.latitude = latitude;
        if (longitude) bin.longitude = longitude;
        if (wasteType) bin.wasteType = wasteType;
        if (capacity) bin.capacity = capacity;
        if (alertThreshold) bin.alertThreshold = alertThreshold;
        if (fillLevel !== undefined) {
            const previousFillLevel = Number(bin.fillLevel) || 0;
            if (previousFillLevel > 0 && Number(fillLevel) === 0) {
                if (!Array.isArray(bin.collectionHistory)) bin.collectionHistory = [];
                bin.collectionHistory.push({ timestamp: new Date(), fillLevel: previousFillLevel });
            }
            bin.fillLevel = fillLevel;
            bin.status = fillLevel >= bin.alertThreshold ? 'FULL' : 'NORMAL';
        }
        bin.updatedAt = new Date();
        await bin.save();
        res.json(bin);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE bin
router.delete('/:id', async (req, res) => {
    try {
        const bin = await Bin.findByIdAndDelete(req.params.id);
        if (!bin) return res.status(404).json({ error: 'Bin not found' });
        res.json({ message: 'Bin deleted', bin });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET bin history (analytics)
router.get('/:id/history', async (req, res) => {
    try {
        const bin = await Bin.findById(req.params.id);
        if (!bin) return res.status(404).json({ error: 'Bin not found' });
        res.json(bin.history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET forecasting data
router.get('/:id/forecast', async (req, res) => {
    try {
        const bin = await Bin.findById(req.params.id);
        if (!bin) return res.status(404).json({ error: 'Bin not found' });

        // Calculate average fill rate from history
        const history = bin.history.slice(-20)
            .map((entry) => ({
                fillLevel: Number(entry.fillLevel),
                timestamp: new Date(entry.timestamp).getTime()
            }))
            .filter((entry) => Number.isFinite(entry.fillLevel) && Number.isFinite(entry.timestamp));

        if (history.length < 3) {
            return res.json({
                currentFillLevel: bin.fillLevel,
                capacity: bin.capacity,
                timeToFull: null,
                timeToFullHours: null,
                estimatedFullTime: null,
                method: 'linear-regression',
                samples: history.length
            });
        }

        const meanTime = history.reduce((total, entry) => total + entry.timestamp, 0) / history.length;
        const meanFill = history.reduce((total, entry) => total + entry.fillLevel, 0) / history.length;
        let covariance = 0;
        let timeVariance = 0;
        let fillVariance = 0;
        for (const entry of history) {
            const timeOffset = entry.timestamp - meanTime;
            const fillOffset = entry.fillLevel - meanFill;
            covariance += timeOffset * fillOffset;
            timeVariance += timeOffset ** 2;
            fillVariance += fillOffset ** 2;
        }

        if (timeVariance === 0) {
            return res.json({ timeToFull: null, estimatedFullTime: null, method: 'linear-regression', samples: history.length });
        }

        const slopePerMs = covariance / timeVariance;
        const correlationSquared = fillVariance === 0 ? 0 : (covariance ** 2) / (timeVariance * fillVariance);

        if (slopePerMs <= 0 || bin.fillLevel >= bin.capacity) {
            return res.json({ timeToFull: null, estimatedFullTime: null, method: 'linear-regression', samples: history.length, fit: Number(correlationSquared.toFixed(3)) });
        }

        const remainingCapacity = bin.capacity - bin.fillLevel;
        const timeToFullMs = remainingCapacity / slopePerMs;
        const timeToFullHours = timeToFullMs / (1000 * 60 * 60);

        const estimatedFullTime = new Date(Date.now() + timeToFullMs);

        res.json({
            currentFillLevel: bin.fillLevel,
            capacity: bin.capacity,
            avgFillRate: slopePerMs * 10000,
            method: 'linear-regression',
            samples: history.length,
            fit: Number(correlationSquared.toFixed(3)),
            timeToFullHours: timeToFullHours.toFixed(2),
            estimatedFullTime,
            remainingCapacity
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET route optimization (nearest full bins)
router.get('/optimize/route', async (req, res) => {
    try {
        const fullBins = await Bin.find({ status: 'FULL' });

        if (fullBins.length === 0) {
            return res.json({ optimizedRoute: [], routes: [], totalDistance: 0, method: 'genetic-algorithm' });
        }

        const vehicleCount = req.query.vehicles === undefined ? 1 : Number(req.query.vehicles);
        const vehicleCapacity = req.query.capacity === undefined ? 300 : Number(req.query.capacity);
        if (!Number.isInteger(vehicleCount) || vehicleCount < 1 || vehicleCount > 20 || !Number.isFinite(vehicleCapacity) || vehicleCapacity <= 0) {
            return res.status(400).json({ error: 'Vehicle count must be 1-20 and capacity must be positive.' });
        }
        const totalLoad = fullBins.reduce((total, bin) => total + Math.max(0, Number(bin.fillLevel) || 0), 0);
        if (fullBins.some((bin) => (Number(bin.fillLevel) || 0) > vehicleCapacity) || totalLoad > vehicleCount * vehicleCapacity) {
            return res.status(400).json({ error: 'Vehicle count and capacity are insufficient for the selected full bins.' });
        }

        const coordinates = fullBins.map((bin) => ({ latitude: Number(bin.latitude), longitude: Number(bin.longitude) }));
        const depot = {
            latitude: coordinates.reduce((total, point) => total + point.latitude, 0) / coordinates.length,
            longitude: coordinates.reduce((total, point) => total + point.longitude, 0) / coordinates.length
        };
        const result = optimizeRoutes({ bins: fullBins, depot, vehicleCount, vehicleCapacity });
        if (!result.feasible) {
            return res.status(422).json({ error: 'Could not fit the selected bins into the requested vehicle routes.' });
        }
        res.json({ ...result, optimizedRoute: result.routes.flatMap((route) => route.bins), depot });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
