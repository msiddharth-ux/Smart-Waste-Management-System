import { useState, useEffect } from 'react';
import { getBins, getBinHistory, getForecast } from '../utils/api';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import '../styles/Analytics.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

function Analytics() {
    const [bins, setBins] = useState([]);
    const [selectedBin, setSelectedBin] = useState(null);
    const [history, setHistory] = useState([]);
    const [forecast, setForecast] = useState(null);

    useEffect(() => {
        fetchBins();
    }, []);

    useEffect(() => {
        if (selectedBin) {
            fetchBinData();
        }
    }, [selectedBin]);

    const fetchBins = async () => {
        try {
            const response = await getBins();
            setBins(response.data);
            if (response.data.length > 0) {
                setSelectedBin(response.data[0]);
            }
        } catch (error) {
            console.error('Error fetching bins:', error);
        }
    };

    const fetchBinData = async () => {
        try {
            const [historyResponse, forecastResponse] = await Promise.all([
                getBinHistory(selectedBin._id),
                getForecast(selectedBin._id)
            ]);
            setHistory(historyResponse.data);
            setForecast(forecastResponse.data);
        } catch (error) {
            console.error('Error fetching bin data:', error);
        }
    };

    const getHistoryChartData = () => {
        const labels = history.slice(-20).map((h, i) => `T-${20 - i}`);
        const data = history.slice(-20).map(h => h.fillLevel);

        return {
            labels,
            datasets: [
                {
                    label: 'Fill Level (%)',
                    data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                },
            ],
        };
    };

    const getWasteTypeChart = () => {
        const wasteTypes = {};
        bins.forEach(bin => {
            wasteTypes[bin.wasteType] = (wasteTypes[bin.wasteType] || 0) + 1;
        });

        return {
            labels: Object.keys(wasteTypes),
            datasets: [
                {
                    label: 'Bins per Waste Type',
                    data: Object.values(wasteTypes),
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
                },
            ],
        };
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: true,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
            },
        },
    };

    return (
        <div className="analytics">
            <h2>📊 Analytics & Forecasting</h2>

            {selectedBin && (
                <div className="analytics-container">
                    <div className="bin-selector">
                        <label>Select Bin:</label>
                        <select value={selectedBin._id} onChange={(e) => setSelectedBin(bins.find(b => b._id === e.target.value))}>
                            {bins.map(bin => (
                                <option key={bin._id} value={bin._id}>{bin.name}</option>
                            ))}
                        </select>
                    </div>

                    {forecast && (
                        <div className="forecast-card">
                            <h3>Fill trend estimate for {selectedBin.name}</h3>
                            <div className="forecast-info">
                                <p><strong>Current Fill Level:</strong> {forecast.currentFillLevel}%</p>
                                <p><strong>Capacity:</strong> {forecast.capacity}%</p>
                                <p><strong>Model:</strong> Linear regression ({forecast.samples || 0} history points)</p>
                                <p><strong>Trend fit:</strong> {forecast.fit === undefined ? 'Not available' : `${Math.round(forecast.fit * 100)}%`}</p>
                                <p><strong>Time to Full:</strong> {forecast.timeToFullHours ? `${forecast.timeToFullHours} hours` : 'No rising trend yet'}</p>
                                {forecast.estimatedFullTime && <p><strong>Estimated full time:</strong> {new Date(forecast.estimatedFullTime).toLocaleString()}</p>}
                            </div>
                            <p className="forecast-caveat">Estimate based on simulated history; not validated sensor data.</p>
                        </div>
                    )}

                    <div className="charts-container">
                        {history.length > 0 && (
                            <div className="chart">
                                <h3>Fill Level History</h3>
                                <Line data={getHistoryChartData()} options={chartOptions} />
                            </div>
                        )}

                        <div className="chart">
                            <h3>Waste Type Distribution</h3>
                            <Bar data={getWasteTypeChart()} options={chartOptions} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Analytics;
