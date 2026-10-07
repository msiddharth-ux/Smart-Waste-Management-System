import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL
});

// Add token to all requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const login = (username, password) => {
    return api.post('/auth/login', { username, password });
};

export const verifyToken = () => {
    return api.get('/auth/verify');
};

export const getBins = () => {
    return api.get('/bins');
};

export const getBinById = (id) => {
    return api.get(`/bins/${id}`);
};

export const createBin = (binData) => {
    return api.post('/bins', binData);
};

export const updateBin = (id, binData) => {
    return api.put(`/bins/${id}`, binData);
};

export const deleteBin = (id) => {
    return api.delete(`/bins/${id}`);
};

export const getBinHistory = (id) => {
    return api.get(`/bins/${id}/history`);
};

export const getForecast = (id) => {
    return api.get(`/bins/${id}/forecast`);
};

export const getOptimizedRoute = (options = {}) => {
    return api.get('/bins/optimize/route', { params: options });
};

export const createComplaint = (complaint) => {
    return api.post('/complaints', complaint);
};

export const getComplaints = () => {
    return api.get('/complaints');
};

export const updateComplaintStatus = (id, status) => {
    return api.patch(`/complaints/${id}/status`, { status });
};

export const getCollectionPerformance = () => {
    return api.get('/reports/collection-performance');
};

export const sendAIChat = (message, history = []) => {
    return api.post('/ai/chat', { message, history });
};

export const getAIInsights = () => {
    return api.get('/ai/quick-insights');
};

export default api;
