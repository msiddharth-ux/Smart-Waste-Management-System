import { useState, useEffect } from 'react';
import { getBins, updateBin } from '../utils/api';
import { connectSocket, onBinsUpdated, offBinsUpdated } from '../utils/socket';
import '../styles/Dashboard.css';

function Dashboard() {
    const [bins, setBins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchBins();
        const socket = connectSocket();
        onBinsUpdated(handleBinsUpdate);

        return () => {
            offBinsUpdated(handleBinsUpdate);
        };
    }, []);

    const fetchBins = async () => {
        try {
            const response = await getBins();
            setBins(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching bins:', error);
            setLoading(false);
        }
    };

    const handleBinsUpdate = (updatedBins) => {
        setBins(updatedBins);
    };

    const handleEmptyBin = async (bin) => {
        try {
            await updateBin(bin._id, { fillLevel: 0, status: 'NORMAL' });
            fetchBins();
        } catch (error) {
            console.error('Error emptying bin:', error);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString();
    };

    const filteredBins = bins.filter(bin => {
        if (filter === 'full') return bin.status === 'FULL';
        if (filter === 'normal') return bin.status === 'NORMAL';
        return true;
    });

    const fullBins = bins.filter(bin => bin.status === 'FULL').length;
    const normalBins = bins.length - fullBins;
    const averageFill = bins.length
        ? Math.round(bins.reduce((total, bin) => total + Number(bin.fillLevel || 0), 0) / bins.length)
        : 0;

    if (loading) return <div className="loading">Loading bins...</div>;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <p className="eyebrow">LIVE OPERATIONS</p>
                    <h1>Bin overview</h1>
                    <p className="dashboard-subtitle">Monitor collection points and their current capacity.</p>
                </div>
                <div className="data-mode"><span /> Simulation data</div>
            </div>

            <section className="metrics-grid" aria-label="Bin summary">
                <div className="metric-card">
                    <span className="metric-label">Total locations</span>
                    <strong>{bins.length}</strong>
                    <span className="metric-note">Monitored bins</span>
                </div>
                <div className="metric-card metric-warning">
                    <span className="metric-label">Needs collection</span>
                    <strong>{fullBins}</strong>
                    <span className="metric-note">At alert threshold</span>
                </div>
                <div className="metric-card metric-positive">
                    <span className="metric-label">Within capacity</span>
                    <strong>{normalBins}</strong>
                    <span className="metric-note">Below alert threshold</span>
                </div>
                <div className="metric-card metric-average">
                    <span className="metric-label">Average fill</span>
                    <strong>{averageFill}<small>%</small></strong>
                    <span className="metric-note">Across all locations</span>
                </div>
            </section>

            <div className="list-toolbar">
                <h2>Collection points</h2>
                <div className="filters">
                    <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
                        All <span>{bins.length}</span>
                    </button>
                    <button className={filter === 'full' ? 'active' : ''} onClick={() => setFilter('full')}>
                        Full <span>{fullBins}</span>
                    </button>
                    <button className={filter === 'normal' ? 'active' : ''} onClick={() => setFilter('normal')}>
                        Normal <span>{normalBins}</span>
                    </button>
                </div>
            </div>

            <div className="bins-grid">
                {filteredBins.length === 0 && (
                    <div className="empty-state">No collection points match this filter.</div>
                )}
                {filteredBins.map((bin) => (
                    <div
                        key={bin._id}
                        className={`bin-card ${bin.status.toLowerCase()}`}
                    >
                        <div className="bin-header">
                            <h3>{bin.name}</h3>
                            <span className={`status-badge ${bin.status.toLowerCase()}`}>
                                {bin.status}
                            </span>
                        </div>

                        <div className={`bin-type ${bin.wasteType?.toLowerCase() || 'general'}`}>
                            <span className="type-indicator" />
                            {bin.wasteType || 'GENERAL'} WASTE
                        </div>

                        <div className="fill-level">
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, Number(bin.fillLevel) || 0))}%` }}>
                                </div>
                            </div>
                            <div className="fill-text"><strong>{bin.fillLevel}%</strong><span>capacity used</span></div>
                        </div>

                        <div className="bin-info">
                            <p><span>Location</span>{bin.locationName || bin.name || 'Name not set'}</p>
                            <p><span>Last update</span>{formatTime(bin.updatedAt)}</p>
                        </div>

                        {bin.status === 'FULL' && (
                            <button className="empty-btn" onClick={() => handleEmptyBin(bin)}>
                                Empty Bin
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Dashboard;
