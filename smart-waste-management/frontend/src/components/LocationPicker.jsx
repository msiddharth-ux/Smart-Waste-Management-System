import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const defaultCenter = [12.9716, 77.5946];

function MapViewUpdater({ center, zoom }) {
    const map = useMap();

    useEffect(() => {
        map.setView(center, zoom);
    }, [center, map, zoom]);

    return null;
}

MapViewUpdater.propTypes = {
    center: PropTypes.arrayOf(PropTypes.number).isRequired,
    zoom: PropTypes.number.isRequired
};

function MapClickHandler({ onPick }) {
    useMapEvents({
        click(event) {
            onPick(event.latlng.lat, event.latlng.lng);
        }
    });

    return null;
}

MapClickHandler.propTypes = {
    onPick: PropTypes.func.isRequired
};

function LocationPicker({ latitude, longitude, onLocationSelect }) {
    const hasCoordinates = latitude !== '' && latitude !== null && latitude !== undefined
        && longitude !== '' && longitude !== null && longitude !== undefined
        && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
    const center = hasCoordinates ? [Number(latitude), Number(longitude)] : defaultCenter;
    const [searchText, setSearchText] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [message, setMessage] = useState('Click the map to place the bin marker.');

    const selectPoint = (lat, lon, locationName) => {
        const nextCenter = [Number(lat), Number(lon)];
        onLocationSelect({
            latitude: nextCenter[0],
            longitude: nextCenter[1],
            ...(locationName ? { locationName } : {})
        });
        setMessage('Location selected. You can click again to adjust the pin.');
    };

    const searchLocation = async () => {
        const query = searchText.trim();
        if (!query) return;

        setIsSearching(true);
        setMessage('Searching for that place...');
        try {
            const params = new URLSearchParams({ format: 'jsonv2', limit: '1', q: query });
            const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
            if (!response.ok) throw new Error('Location search is unavailable.');

            const [result] = await response.json();
            if (!result) {
                setMessage('No matching place found. Try a nearby address or landmark.');
                return;
            }

            const locationName = result.display_name.split(',').slice(0, 3).join(',').trim();
            selectPoint(result.lat, result.lon, locationName);
            setMessage(`Selected: ${locationName}`);
        } catch (error) {
            setMessage(error.message || 'Could not search for that place.');
        } finally {
            setIsSearching(false);
        }
    };

    const googleMapsUrl = hasCoordinates
        ? `https://www.google.com/maps/search/?api=1&query=${Number(latitude)},${Number(longitude)}`
        : null;

    return (
        <section className="location-picker" aria-label="Choose bin location">
            <div className="location-picker-heading">
                <div>
                    <h3>Choose on map</h3>
                    <p>Search for a landmark or click to place the bin.</p>
                </div>
                {googleMapsUrl && (
                    <a href={googleMapsUrl} target="_blank" rel="noreferrer">
                        Open in Google Maps
                    </a>
                )}
            </div>
            <div className="location-search" role="search">
                <input
                    type="search"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            searchLocation();
                        }
                    }}
                    placeholder="Search an address or landmark"
                    aria-label="Search an address or landmark"
                />
                <button type="button" onClick={searchLocation} disabled={isSearching || !searchText.trim()}>
                    {isSearching ? 'Searching...' : 'Search'}
                </button>
            </div>
            <MapContainer
                center={center}
                zoom={hasCoordinates ? 16 : 12}
                scrollWheelZoom
                className="location-picker-map"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapViewUpdater center={center} zoom={hasCoordinates ? 16 : 12} />
                <MapClickHandler onPick={(lat, lon) => selectPoint(lat, lon)} />
                {hasCoordinates && (
                    <CircleMarker
                        center={[Number(latitude), Number(longitude)]}
                        radius={9}
                        pathOptions={{ color: '#fff', weight: 3, fillColor: '#176b52', fillOpacity: 1 }}
                    />
                )}
            </MapContainer>
            <div className="location-picker-footer">
                <p role="status">{message}</p>
                {hasCoordinates && (
                    <span>{Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}</span>
                )}
            </div>
        </section>
    );
}

LocationPicker.propTypes = {
    latitude: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    longitude: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    onLocationSelect: PropTypes.func.isRequired
};

export default LocationPicker;
