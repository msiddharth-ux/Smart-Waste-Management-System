const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
    reporterName: { type: String, default: '' },
    contact: { type: String, default: '' },
    category: { type: String, enum: ['OVERFLOW', 'DAMAGE', 'MISSED_COLLECTION', 'ILLEGAL_DUMPING', 'OTHER'], required: true },
    description: { type: String, required: true, maxlength: 2000 },
    locationName: { type: String, required: true },
    latitude: Number,
    longitude: Number,
    status: { type: String, enum: ['NEW', 'IN_REVIEW', 'RESOLVED', 'REJECTED'], default: 'NEW' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

let memoryStore = [];
let mongooseModel;
let memoryId = 1;

const wrapMemoryRecord = (record) => {
    const item = { ...record };
    item.save = async function () {
        this.updatedAt = new Date();
        const index = memoryStore.findIndex((stored) => stored._id === this._id);
        if (index >= 0) memoryStore[index] = { ...this };
        else memoryStore.push({ ...this });
        return this;
    };
    return item;
};

const memoryModel = {
    create: async (data) => {
        const record = {
            _id: (memoryId++).toString(),
            reporterName: '',
            contact: '',
            status: 'NEW',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data
        };
        memoryStore.push(record);
        return wrapMemoryRecord(record);
    },
    find: async () => memoryStore.map(wrapMemoryRecord),
    findById: async (id) => {
        const record = memoryStore.find((item) => item._id === String(id));
        return record ? wrapMemoryRecord(record) : null;
    }
};

const getModel = () => {
    if (mongoose.connection.readyState !== 1) return memoryModel;
    mongooseModel ||= mongoose.models.Complaint || mongoose.model('Complaint', ComplaintSchema);
    return mongooseModel;
};

module.exports = {
    create: (...args) => getModel().create(...args),
    find: (...args) => getModel().find(...args),
    findById: (...args) => getModel().findById(...args)
};