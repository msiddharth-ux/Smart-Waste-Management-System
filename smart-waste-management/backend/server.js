const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const binRoutes = require('./bins');
const complaintRoutes = require('./complaints');
const reportRoutes = require('./reports');
const aiRoutes = require('./ai');
const { router: authRoutes, verifyToken } = require('./auth');
const simulateBins = require('./simulator');
const Bin = require('./Bin');

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

app.use(cors());
app.use(express.json());

// Auth routes (public)
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);

// Bin routes (all authenticated)
app.use('/api/bins', verifyToken, binRoutes);

const PORT = process.env.PORT || 5000;

const seedBins = async () => {
    const count = await Bin.countDocuments();
    if (count === 0) {
        await Bin.create([
            { name: 'Bin A', latitude: 12.9716, longitude: 77.5946, fillLevel: 30, status: 'NORMAL', wasteType: 'ORGANIC', capacity: 100 },
            { name: 'Bin B', latitude: 12.9616, longitude: 77.5846, fillLevel: 55, status: 'NORMAL', wasteType: 'RECYCLABLE', capacity: 100 },
            { name: 'Bin C', latitude: 12.9516, longitude: 77.5746, fillLevel: 75, status: 'NORMAL', wasteType: 'GENERAL', capacity: 100 }
        ]);
        console.log('Seeded initial bin data');
    }
};

const connectDB = async () => {
    const localUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartWasteDB';
    try {
        await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
        console.log('MongoDB Connected to local database');
    } catch (err) {
        console.log('Local MongoDB not available. Using in-memory fallback store.');
        // Do not attempt to start mongodb-memory-server here (may require VC++ redistributable).
        // The `Bin` model provides an in-memory fallback so we can continue without a MongoDB connection.
    }
    await seedBins();
    simulateBins(io);
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

connectDB();

// Socket.io connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the running process or set PORT to a free port.`);
        process.exit(1);
    }
    throw error;
});
