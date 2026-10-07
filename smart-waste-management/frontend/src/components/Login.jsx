import { useState } from 'react';
import PropTypes from 'prop-types';
import { login } from '../utils/api';
import '../styles/Login.css';

function Login({ onLoginSuccess, onOpenComplaints }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await login(username, password);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data));
            onLoginSuccess(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-bg-glow glow-1" />
            <div className="login-bg-glow glow-2" />

            <div className="login-card">
                <div className="login-header">
                    <div className="login-icon-badge">🌱</div>
                    <h1>Intelligent Waste Platform</h1>
                    <p className="subtitle"> Operations & Smart Telemetry</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            autoComplete="username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="login-submit-btn" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Sign In to Operations Console →'}
                    </button>
                </form>

                <div className="login-divider">
                    <span>or</span>
                </div>

                <button className="citizen-report-link" type="button" onClick={onOpenComplaints}>
                    <span>📢 Citizen Grievance Portal</span>
                    <small>Report overflowing bins or dumping without an account</small>
                </button>
            </div>
        </div>
    );
}

Login.propTypes = {
    onLoginSuccess: PropTypes.func.isRequired,
    onOpenComplaints: PropTypes.func
};

export default Login;
