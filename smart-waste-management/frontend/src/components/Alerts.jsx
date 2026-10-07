import { useState, useEffect } from 'react';
import { getBins } from '../utils/api';
import { connectSocket, onBinsUpdated, offBinsUpdated } from '../utils/socket';
import '../styles/Alerts.css';

function Alerts() {
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        const socket = connectSocket();
        onBinsUpdated(handleBinsUpdate);

        return () => {
            offBinsUpdated(handleBinsUpdate);
        };
    }, []);

    const handleBinsUpdate = (updatedBins) => {
        updatedBins.forEach(bin => {
            if (bin.status === 'FULL') {
                // Check if alert already exists
                const existingAlert = alerts.find(a => a.binId === bin._id && a.type === 'FULL');
                if (!existingAlert) {
                    const newAlert = {
                        id: `${bin._id}-${Date.now()}`,
                        binId: bin._id,
                        binName: bin.name,
                        type: 'FULL',
                        fillLevel: bin.fillLevel,
                        timestamp: new Date(),
                        read: false,
                    };
                    setAlerts(prev => [newAlert, ...prev]);

                    // Trigger browser notification
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification(`⚠️ ${bin.name} is FULL!`, {
                            body: `Fill level: ${bin.fillLevel}%`,
                            icon: '🗑️'
                        });
                    }
                }
            }
        });
    };

    const dismissAlert = (id) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    const requestNotificationPermission = () => {
        if ('Notification' in window) {
            Notification.requestPermission();
        }
    };

    useEffect(() => {
        requestNotificationPermission();
    }, []);

    return (
        <div className="alerts">
            <h2>🚨 Active Alerts</h2>

            {alerts.length === 0 ? (
                <div className="no-alerts">
                    <p>✅ No active alerts</p>
                </div>
            ) : (
                <div className="alerts-list">
                    {alerts.map((alert) => (
                        <div key={alert.id} className={`alert-item ${alert.type.toLowerCase()}`}>
                            <div className="alert-content">
                                <h3>⚠️ {alert.binName}</h3>
                                <p>Fill Level: <strong>{alert.fillLevel}%</strong></p>
                                <p className="timestamp">{alert.timestamp.toLocaleTimeString()}</p>
                            </div>
                            <button className="dismiss-btn" onClick={() => dismissAlert(alert.id)}>
                                Dismiss
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Alerts;
