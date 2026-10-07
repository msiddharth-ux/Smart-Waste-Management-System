import { useState, useEffect } from 'react';
import { getOptimizedRoute, getBins } from '../utils/api';
import '../styles/RouteOptimizer.css';

function RouteOptimizer() {
    const [routes, setRoutes] = useState([]);
    const [totalDistance, setTotalDistance] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fullBinsCount, setFullBinsCount] = useState(0);
    const [vehicleCount, setVehicleCount] = useState(2);
    const [vehicleCapacity, setVehicleCapacity] = useState(200);
    const [error, setError] = useState('');

    useEffect(() => {
        checkFullBins();
    }, []);

    const checkFullBins = async () => {
        try {
            const response = await getBins();
            const fullBins = response.data.filter(b => b.status === 'FULL');
            setFullBinsCount(fullBins.length);
        } catch (error) {
            console.error('Error checking bins:', error);
        }
    };

    const handleOptimizeRoute = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await getOptimizedRoute({ vehicles: vehicleCount, capacity: vehicleCapacity });
            setRoutes(response.data.routes || []);
            setTotalDistance(response.data.totalDistance);
        } catch (error) {
            console.error('Error optimizing route:', error);
            setError(error.response?.data?.error || 'Could not plan routes.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="route-optimizer">
            <h2>Collection Route Planner</h2>

            <div className="optimizer-info">
                <div className="route-settings">
                    <label>
                        Vehicles
                        <input type="number" min="1" max="20" value={vehicleCount} onChange={(event) => setVehicleCount(Number(event.target.value))} />
                    </label>
                    <label>
                        Capacity per vehicle
                        <input type="number" min="1" step="10" value={vehicleCapacity} onChange={(event) => setVehicleCapacity(Number(event.target.value))} />
                        <small>Fill percentage points</small>
                    </label>
                    <span className="full-count">{fullBinsCount} full bins</span>
                </div>
                <div className="route-action">
                    <p>Genetic search · round-trip distance from the bin centroid</p>
                    <button onClick={handleOptimizeRoute} disabled={fullBinsCount === 0 || loading || vehicleCount < 1 || vehicleCapacity < 1} className="optimize-btn">
                        {loading ? 'Optimizing...' : 'Optimize routes'}
                    </button>
                </div>
            </div>

            {error && <p className="route-error" role="alert">{error}</p>}

            {routes.length > 0 && (
                <div className="route-display">
                    <div className="route-summary">
                        <h3>Planned collection routes</h3>
                        <p className="distance">{totalDistance} km total estimated distance</p>
                    </div>
                    {routes.map((route) => (
                        <section className="vehicle-route" key={route.vehicle}>
                            <header>
                                <h4>Vehicle {route.vehicle}</h4>
                                <span>{route.load} / {vehicleCapacity} load units · {route.distance} km</span>
                            </header>
                            <ol className="route-list">
                                {route.bins.map((bin, index) => (
                                    <li key={bin._id} className="route-stop">
                                        <div className="stop-number">{index + 1}</div>
                                        <div className="stop-info">
                                            <h4>{bin.locationName || bin.name}</h4>
                                            <p>{bin.wasteType} · {bin.fillLevel}% full</p>
                                            <p>{Number(bin.latitude).toFixed(4)}, {Number(bin.longitude).toFixed(4)}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    ))}
                </div>
            )}

            {routes.length === 0 && !loading && fullBinsCount === 0 && (
                <div className="no-route">
                    <p>✅ No full bins at the moment</p>
                </div>
            )}
        </div>
    );
}

export default RouteOptimizer;
