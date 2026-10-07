import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getBins } from '../utils/api';
import '../styles/MapView.css';

// Fix for Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

function RecenterMap({ center }) {
    const map = useMap();

    useEffect(() => {
        if (center && center.length === 2) {
            map.setView(center);
        }
    }, [center, map]);

    return null;
}

function MapView() {
    const [bins, setBins] = useState([]);
    const [center, setCenter] = useState([12.9716, 77.5946]);

    useEffect(() => {
        fetchBins();
    }, []);

    const fetchBins = async () => {
        try {
            const response = await getBins();
            const parsedBins = response.data.map((bin) => ({
                ...bin,
                latitude: Number(bin.latitude),
                longitude: Number(bin.longitude),
            }));
            setBins(parsedBins);

            if (parsedBins.length > 0) {
                const firstBin = parsedBins[0];
                setCenter([firstBin.latitude, firstBin.longitude]);
            }
        } catch (error) {
            console.error('Error fetching bins:', error);
        }
    };

    return (
        <div className="map-view">
            <h2>📍 Bin Locations</h2>
            <MapContainer center={center} zoom={13} style={{ height: '600px', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />
                <RecenterMap center={center} />
                {bins.map((bin) => (
                    <Marker
                        key={bin._id}
                        position={[bin.latitude, bin.longitude]}
                    >
                        <Popup>
                            <div className="popup-content">
                                <h4>{bin.name}</h4>
                                <p>Type: {bin.wasteType}</p>
                                <p>Fill Level: {bin.fillLevel}%</p>
                                <p>Status: <span className={`status ${bin.status.toLowerCase()}`}>{bin.status}</span></p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}

export default MapView;
