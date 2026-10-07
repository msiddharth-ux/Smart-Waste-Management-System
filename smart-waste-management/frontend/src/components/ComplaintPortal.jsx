import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { createComplaint, getComplaints, updateComplaintStatus } from '../utils/api';
import LocationPicker from './LocationPicker';
import '../styles/ComplaintPortal.css';

const complaintCategories = ['OVERFLOW', 'DAMAGE', 'MISSED_COLLECTION', 'ILLEGAL_DUMPING', 'OTHER'];
const complaintStatuses = ['NEW', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];

function ComplaintPortal({ isStaff = false, onClose }) {
    const [complaints, setComplaints] = useState([]);
    const [formData, setFormData] = useState({
        reporterName: '', contact: '', category: 'OVERFLOW', description: '', locationName: '', latitude: '', longitude: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadComplaints = async () => {
        try {
            const response = await getComplaints();
            setComplaints(response.data);
        } catch (loadError) {
            setError(loadError.response?.data?.error || 'Could not load reports.');
        }
    };

    useEffect(() => {
        if (!isStaff) return undefined;
        let active = true;
        getComplaints().then((response) => {
            if (active) setComplaints(response.data);
        }).catch((loadError) => {
            if (active) setError(loadError.response?.data?.error || 'Could not load reports.');
        });
        return () => {
            active = false;
        };
    }, [isStaff]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setMessage('');
        setError('');
        try {
            const response = await createComplaint(formData);
            setMessage(`${response.data.message} Reference: ${response.data.id}`);
            setFormData({ reporterName: '', contact: '', category: 'OVERFLOW', description: '', locationName: '', latitude: '', longitude: '' });
            if (isStaff) loadComplaints();
        } catch (submitError) {
            setError(submitError.response?.data?.error || 'Could not submit the report.');
        } finally {
            setSubmitting(false);
        }
    };

    const changeStatus = async (id, status) => {
        try {
            await updateComplaintStatus(id, status);
            await loadComplaints();
        } catch (updateError) {
            setError(updateError.response?.data?.error || 'Could not update report status.');
        }
    };

    return (
        <section className="complaint-portal">
            <header className="complaint-heading">
                <div>
                    <p className="eyebrow">COMMUNITY REPORTING</p>
                    <h1>{isStaff ? 'Complaint desk' : 'Report a waste issue'}</h1>
                    <p>Send the location and details of a collection or waste-site problem.</p>
                </div>
                {onClose && <button type="button" className="complaint-back" onClick={onClose}>Back to login</button>}
            </header>

            <div className="complaint-layout">
                <form className="complaint-form" onSubmit={handleSubmit}>
                    <h2>New report</h2>
                    <label>Issue type
                        <select value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value })}>
                            {complaintCategories.map((category) => <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>)}
                        </select>
                    </label>
                    <label>Location name
                        <input required value={formData.locationName} onChange={(event) => setFormData({ ...formData, locationName: event.target.value })} placeholder="Street, landmark, or campus area" />
                    </label>
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
                    <label>Details
                        <textarea required maxLength={2000} rows={4} value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} placeholder="Describe what happened" />
                    </label>
                    <div className="complaint-row">
                        <label>Your name (optional)
                            <input maxLength={100} value={formData.reporterName} onChange={(event) => setFormData({ ...formData, reporterName: event.target.value })} />
                        </label>
                        <label>Contact (optional)
                            <input maxLength={150} value={formData.contact} onChange={(event) => setFormData({ ...formData, contact: event.target.value })} placeholder="Email or phone" />
                        </label>
                    </div>
                    {message && <p className="complaint-message" role="status">{message}</p>}
                    {error && <p className="complaint-error" role="alert">{error}</p>}
                    <button className="complaint-submit" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit report'}</button>
                </form>

                {isStaff && (
                    <section className="complaint-list">
                        <div className="complaint-list-heading"><h2>Submitted reports</h2><button type="button" onClick={loadComplaints}>Refresh</button></div>
                        {complaints.length === 0 ? <p className="complaint-empty">No reports submitted yet.</p> : complaints.map((complaint) => (
                            <article className="complaint-item" key={complaint._id}>
                                <div className="complaint-item-heading">
                                    <strong>{complaint.category.replaceAll('_', ' ')}</strong>
                                    <time>{new Date(complaint.createdAt).toLocaleString()}</time>
                                </div>
                                <p className="complaint-location">{complaint.locationName}</p>
                                <p>{complaint.description}</p>
                                {(complaint.reporterName || complaint.contact) && <small>{[complaint.reporterName, complaint.contact].filter(Boolean).join(' · ')}</small>}
                                <label className="complaint-status">Status
                                    <select value={complaint.status} onChange={(event) => changeStatus(complaint._id, event.target.value)}>
                                        {complaintStatuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                                    </select>
                                </label>
                            </article>
                        ))}
                    </section>
                )}
            </div>
        </section>
    );
}

ComplaintPortal.propTypes = {
    isStaff: PropTypes.bool,
    onClose: PropTypes.func
};

export default ComplaintPortal;