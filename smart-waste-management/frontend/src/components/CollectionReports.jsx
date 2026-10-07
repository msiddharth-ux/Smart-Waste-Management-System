import { useEffect, useState } from 'react';
import { getCollectionPerformance } from '../utils/api';
import '../styles/CollectionReports.css';

function CollectionReports() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const refreshReport = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await getCollectionPerformance();
            setReport(response.data);
        } catch (reportError) {
            setError(reportError.response?.data?.error || 'Could not load collection performance.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        getCollectionPerformance().then((response) => {
            if (active) setReport(response.data);
        }).catch((reportError) => {
            if (active) setError(reportError.response?.data?.error || 'Could not load collection performance.');
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => {
            active = false;
        };
    }, []);

    const updatedAt = report?.generatedAt
        ? new Date(report.generatedAt).toLocaleString()
        : '';
    const routeEfficiency = report?.routeEfficiency;

    return (
        <section className="collection-reports">
            <header className="report-header">
                <div>
                    <p className="eyebrow">OPERATIONS REPORT</p>
                    <h1>Collection performance</h1>
                    <p>Daily collections and current service indicators.</p>
                </div>
                <button type="button" className="report-refresh" onClick={refreshReport} disabled={loading}>
                    {loading ? 'Updating...' : 'Refresh report'}
                </button>
            </header>

            {error && <p className="report-error" role="alert">{error}</p>}

            <div className="report-metrics" aria-live="polite">
                <article className="report-metric report-collected">
                    <span className="report-label">Bins collected today</span>
                    <strong>{report ? report.totalBinsCollectedToday : '—'}</strong>
                    <span className="report-note">UTC calendar day</span>
                </article>
                <article className="report-metric report-fill">
                    <span className="report-label">Average fill level</span>
                    <strong>{report ? <>{report.averageFillLevel}<small>%</small></> : '—'}</strong>
                    <span className="report-note">Across all monitored bins</span>
                </article>
                <article className="report-metric report-complaints">
                    <span className="report-label">Pending complaints</span>
                    <strong>{report ? report.pendingComplaints : '—'}</strong>
                    <span className="report-note">New or in review</span>
                </article>
                <article className="report-metric report-route">
                    <span className="report-label">Route efficiency</span>
                    <strong>{routeEfficiency ? <>{routeEfficiency.routeEfficiencyPct}<small>%</small></> : '—'}</strong>
                    <span className="report-note">
                        {routeEfficiency
                            ? `${routeEfficiency.optimizedDistanceKm} km vs ${routeEfficiency.baselineDistanceKm} km baseline`
                            : 'No full-bin route to compare'}
                    </span>
                </article>
            </div>

            <footer className="report-footnote">
                <p>Route efficiency is distance saved against the current full-bin order using straight-line distances. It is not road-route or fuel efficiency.</p>
                {updatedAt && <time dateTime={report.generatedAt}>Updated {updatedAt}</time>}
            </footer>
        </section>
    );
}

export default CollectionReports;