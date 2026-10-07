import { useState, useEffect } from 'react';
import { createBin, updateBin, deleteBin, getBins } from '../utils/api';
import LocationPicker from './LocationPicker';
import '../styles/AdminPanel.css';

function AdminPanel({ userRole }) {
    const [bins, setBins] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        locationName: '',
        latitude: '',
        longitude: '',
        wasteType: 'GENERAL',
        capacity: 100,
        alertThreshold: 80,
    });

    useEffect(() => {
        fetchBins();
    }, []);

    const fetchBins = async () => {
        try {
            const response = await getBins();
            setBins(response.data);
        } catch (error) {
            console.error('Error fetching bins:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateBin(editingId, formData);
            } else {
                await createBin(formData);
            }
            fetchBins();
            resetForm();
        } catch (error) {
            console.error('Error saving bin:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure?')) {
            try {
                await deleteBin(id);
                fetchBins();
            } catch (error) {
                console.error('Error deleting bin:', error);
            }
        }
    };

    const handleEdit = (bin) => {
        setFormData({
            name: bin.name,
            locationName: bin.locationName || '',
            latitude: bin.latitude,
            longitude: bin.longitude,
            wasteType: bin.wasteType,
            capacity: bin.capacity,
            alertThreshold: bin.alertThreshold,
        });
        setEditingId(bin._id);
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            locationName: '',
            latitude: '',
            longitude: '',
            wasteType: 'GENERAL',
            capacity: 100,
            alertThreshold: 80,
        });
        setEditingId(null);
        setShowForm(false);
    };

    if (userRole !== 'admin') {
        return <div className="admin-panel"><p>⚠️ Admin access only</p></div>;
    }

    return (
        <div className="admin-panel">
            <div className="admin-header">
                <h2>🔧 Admin Panel</h2>
                <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : '+ Add New Bin'}
                </button>
            </div>

            {showForm && (
                <form className="bin-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Bin Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Location Name</label>
                        <input
                            type="text"
                            value={formData.locationName}
                            onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                            placeholder="e.g. Library entrance"
                            required
                        />
                    </div>
                    <LocationPicker
                        latitude={formData.latitude}
                        longitude={formData.longitude}
                        onLocationSelect={({ latitude, longitude, locationName }) => setFormData((current) => ({
                            ...current,
                            latitude,
                            longitude,
                            ...(locationName ? { locationName } : {})
                        }))}
                    />
                    <div className="form-row">
                        <div className="form-group">
                            <label>Latitude</label>
                            <input
                                type="number"
                                step="0.0001"
                                value={formData.latitude}
                                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Longitude</label>
                            <input
                                type="number"
                                step="0.0001"
                                value={formData.longitude}
                                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Waste Type</label>
                            <select value={formData.wasteType} onChange={(e) => setFormData({ ...formData, wasteType: e.target.value })}>
                                <option>ORGANIC</option>
                                <option>RECYCLABLE</option>
                                <option>GENERAL</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Capacity</label>
                            <input
                                type="number"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Alert Threshold (%)</label>
                        <input
                            type="number"
                            value={formData.alertThreshold}
                            onChange={(e) => setFormData({ ...formData, alertThreshold: parseInt(e.target.value) })}
                        />
                    </div>
                    <button type="submit" className="submit-btn">
                        {editingId ? 'Update' : 'Create'} Bin
                    </button>
                </form>
            )}

            <table className="bins-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Location</th>
                        <th>Capacity</th>
                        <th>Threshold</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {bins.map((bin) => (
                        <tr key={bin._id}>
                            <td>{bin.name}</td>
                            <td>{bin.wasteType}</td>
                            <td>{bin.locationName || 'Name not set'}</td>
                            <td>{bin.capacity}</td>
                            <td>{bin.alertThreshold}%</td>
                            <td className="actions">
                                <button className="edit-btn" onClick={() => handleEdit(bin)}>Edit</button>
                                <button className="delete-btn" onClick={() => handleDelete(bin._id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AdminPanel;
