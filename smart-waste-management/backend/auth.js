const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_jwt_secret_key_change_this_in_production';

// Hardcoded users for demo (in production, use a database)
const users = {
    admin: { password: 'admin123', role: 'admin' },
    operator: { password: 'operator123', role: 'operator' },
    viewer: { password: 'viewer123', role: 'viewer' }
};

// Login endpoint
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const user = users[username];
    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username, role: user.role });
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Verify endpoint (to check if token is valid)
router.get('/verify', verifyToken, (req, res) => {
    res.json({ user: req.user });
});

module.exports = { router, verifyToken, requireAdmin, JWT_SECRET };
