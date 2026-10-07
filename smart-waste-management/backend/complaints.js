const express = require('express');
const { verifyToken } = require('./auth');
const Complaint = require('./Complaint');

const router = express.Router();
const categories = new Set(['OVERFLOW', 'DAMAGE', 'MISSED_COLLECTION', 'ILLEGAL_DUMPING', 'OTHER']);
const statuses = new Set(['NEW', 'IN_REVIEW', 'RESOLVED', 'REJECTED']);

router.post('/', async (req, res) => {
    try {
        const { reporterName, contact, category, description, locationName, latitude, longitude } = req.body;
        const descriptionText = String(description || '').trim();
        if (!categories.has(category) || !descriptionText || !String(locationName || '').trim()) {
            return res.status(400).json({ error: 'A valid category, description, and location are required.' });
        }
        if (descriptionText.length > 2000) return res.status(400).json({ error: 'Description must be 2000 characters or fewer.' });

        const complaint = await Complaint.create({
            reporterName: String(reporterName || '').trim().slice(0, 100),
            contact: String(contact || '').trim().slice(0, 150),
            category,
            description: descriptionText,
            locationName: locationName.trim().slice(0, 200),
            ...(latitude !== '' && latitude !== null && latitude !== undefined && Number.isFinite(Number(latitude)) ? { latitude: Number(latitude) } : {}),
            ...(longitude !== '' && longitude !== null && longitude !== undefined && Number.isFinite(Number(longitude)) ? { longitude: Number(longitude) } : {})
        });
        res.status(201).json({ id: complaint._id, status: complaint.status, message: 'Complaint submitted.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/', verifyToken, async (req, res) => {
    if (!['admin', 'operator'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Staff access required.' });
    }
    try {
        const complaints = await Complaint.find();
        res.json(complaints.sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt)));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id/status', verifyToken, async (req, res) => {
    if (!['admin', 'operator'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Staff access required.' });
    }
    const { status } = req.body;
    if (!statuses.has(status)) return res.status(400).json({ error: 'Invalid complaint status.' });

    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
        complaint.status = status;
        complaint.updatedAt = new Date();
        await complaint.save();
        res.json(complaint);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;