const mongoose = require('mongoose');

// Define schema shape for mongoose usage (when DB is available)
const BinSchema = new mongoose.Schema({
    name: String,
    locationName: String,
    latitude: Number,
    longitude: Number,
    fillLevel: Number,
    status: String,
    wasteType: { type: String, enum: ['ORGANIC', 'RECYCLABLE', 'GENERAL'], default: 'GENERAL' },
    capacity: { type: Number, default: 100 },
    alertThreshold: { type: Number, default: 80 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    history: [
        {
            fillLevel: Number,
            timestamp: { type: Date, default: Date.now }
        }
    ],
    alertHistory: [
        {
            type: { type: String },
            timestamp: { type: Date, default: Date.now },
            fillLevel: Number
        }
    ],
    collectionHistory: [
        {
            timestamp: { type: Date, default: Date.now },
            fillLevel: Number
        }
    ]
});

// If mongoose is connected, use the Mongoose model. Otherwise provide a
// lightweight in-memory fallback with the same async API used across the
// backend so the app can run without a real MongoDB (useful for quick dev).
function createInMemoryModel() {
    let store = [];
    let idCounter = 1;

    const ensureDefaults = (doc) => {
        const now = new Date();
        return Object.assign({
            _id: (idCounter++).toString(),
            name: 'Unnamed Bin',
            locationName: '',
            latitude: 0,
            longitude: 0,
            fillLevel: 0,
            status: 'NORMAL',
            wasteType: 'GENERAL',
            capacity: 100,
            alertThreshold: 80,
            createdAt: now,
            updatedAt: now,
            history: [],
            alertHistory: [],
            collectionHistory: []
        }, doc);
    };

    const wrapDocument = (raw) => {
        const doc = Object.assign({}, raw);
        doc.save = async function () {
            this.updatedAt = new Date();
            const idx = store.findIndex(s => s._id === this._id);
            if (idx >= 0) store[idx] = Object.assign({}, this);
            else store.push(Object.assign({}, this));
            return this;
        };
        return doc;
    };

    return {
        countDocuments: async () => store.length,
        create: async (items) => {
            if (Array.isArray(items)) {
                const created = items.map(i => {
                    const d = ensureDefaults(i);
                    store.push(d);
                    return wrapDocument(d);
                });
                return created;
            }
            const d = ensureDefaults(items);
            store.push(d);
            return wrapDocument(d);
        },
        find: async (filter) => {
            if (!filter || Object.keys(filter).length === 0) {
                return store.map(s => wrapDocument(s));
            }
            // very small filter implementation (supports equality checks)
            const results = store.filter(s => {
                return Object.keys(filter).every(k => {
                    if (typeof filter[k] === 'object' && filter[k] !== null) {
                        // handle simple $eq
                        if ('$eq' in filter[k]) return s[k] === filter[k].$eq;
                        return false;
                    }
                    return s[k] === filter[k];
                });
            });
            return results.map(r => wrapDocument(r));
        },
        findById: async (id) => {
            const found = store.find(s => s._id === id || s._id === (id && id.toString()));
            return found ? wrapDocument(found) : null;
        },
        findByIdAndDelete: async (id) => {
            const idx = store.findIndex(s => s._id === id || s._id === (id && id.toString()));
            if (idx === -1) return null;
            const [deleted] = store.splice(idx, 1);
            return wrapDocument(deleted);
        }
    };
}

const inMemoryModel = createInMemoryModel();
let mongooseModel;

const getModel = () => {
    if (mongoose.connection.readyState !== 1) return inMemoryModel;
    mongooseModel ||= mongoose.models.Bin || mongoose.model('Bin', BinSchema);
    return mongooseModel;
};

module.exports = {
    countDocuments: (...args) => getModel().countDocuments(...args),
    create: (...args) => getModel().create(...args),
    find: (...args) => getModel().find(...args),
    findById: (...args) => getModel().findById(...args),
    findByIdAndDelete: (...args) => getModel().findByIdAndDelete(...args)
};