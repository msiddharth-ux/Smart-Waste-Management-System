import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import { getBins } from '../utils/api';
import { connectSocket, offBinsUpdated, onBinsUpdated } from '../utils/socket';
import '../styles/HeatmapView.css';

function HeatLayer({ bins, filter }) {
    const map = useMap();
    const hasInitialFit = useRef(false);

    useEffect(() => {
        const selectedBins = bins.filter((bin) => filter === 'all' || bin.status === 'FULL');
        const heatPoints = selectedBins
            .filter((bin) => Number.isFinite(bin.latitude) && Number.isFinite(bin.longitude))
            .map((bin) => [bin.latitude, bin.longitude, Math.max(0.05, Math.min(1, bin.fillLevel / 100))]);
        const heatLayer = L.heatLayer(heatPoints, {
            radius: 38,
            blur: 26,
            maxZoom: 17,
            max: 1,
            minOpacity: 0.25,
            gradient: { 0.2: '#3b9c72', 0.55: '#e5bd4d', 0.8: '#cf6046', 1: '#9d2936' }
        }).addTo(map);

        if (heatPoints.length && !hasInitialFit.current) {
            const bounds = L.latLngBounds(heatPoints.map(([latitude, longitude]) => [latitude, longitude]));
            map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
            hasInitialFit.current = true;
        }
        return () => map.removeLayer(heatLayer);
    }, [bins, filter, map]);

    return null;
}

HeatLayer.propTypes = {
    bins: PropTypes.array.isRequired,
    filter: PropTypes.string.isRequired
};

function HeatmapView() {
    const [bins, setBins] = useState([]);
    const [filter, setFilter] = useState('all');
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        const applyBins = (items) => setBins(items.map((bin) => ({
            ...bin,
            latitude: Number(bin.latitude),
            longitude: Number(bin.longitude),
            fillLevel: Number(bin.fillLevel) || 0
        })));
        const handleSocketUpdate = (items) => applyBins(items);
        getBins().then((response) => {
            if (active) applyBins(response.data);
        }).catch(() => {
            if (active) setError('Could not load bin data for the heatmap.');
        });
        connectSocket();
        onBinsUpdated(handleSocketUpdate);
        return () => {
            active = false;
            offBinsUpdated(handleSocketUpdate);
        };
    }, []);

    const visibleBins = bins.filter((bin) => filter === 'all' || bin.status === 'FULL');
    const fullCount = bins.filter((bin) => bin.status === 'FULL').length;
    const center = bins.length ? [bins[0].latitude, bins[0].longitude] : [12.9716, 77.5946];

    return (
        <section className="heatmap-view">
            <header className="heatmap-header">
                <div>
                    <p className="eyebrow">SPATIAL ANALYTICS</p>
                    <h1>Bin fill heatmap</h1>
                    <p>Hotter areas indicate collection points with higher fill levels.</p>
                </div>
                <div className="heatmap-filters" role="group" aria-label="Heatmap bin filter">
                    <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All bins ({bins.length})</button>
                    <button type="button" className={filter === 'full' ? 'active' : ''} onClick={() => setFilter('full')}>Full only ({fullCount})</button>
                </div>
            </header>
            {error && <p className="heatmap-error" role="alert">{error}</p>}
            <div className="heatmap-frame">
                <MapContainer center={center} zoom={12} scrollWheelZoom className="heatmap-map">
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <HeatLayer bins={bins} filter={filter} />
                    {visibleBins.map((bin) => (
                        <CircleMarker
                            key={bin._id}
                            center={[bin.latitude, bin.longitude]}
                            radius={5}
                            pathOptions={{ color: '#fff', weight: 2, fillColor: '#1d4334', fillOpacity: 0.95 }}
                        >
                            <Popup>
                                <strong>{bin.locationName || bin.name}</strong><br />
                                {bin.fillLevel}% full · {bin.status}
                            </Popup>
                        </CircleMarker>
                    ))}
                </MapContainer>
                <div className="heatmap-legend" aria-label="Low to high fill level">
                    <span>Lower fill</span><span className="heatmap-gradient" /><span>Higher fill</span>
                </div>
            </div>
            <p className="heatmap-note">Density reflects current bin fill levels, not measured waste volume or population density.</p>
        </section>
    );
}

export default HeatmapView;