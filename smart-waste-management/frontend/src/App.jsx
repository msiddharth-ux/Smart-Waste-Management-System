import { useEffect, useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MapView from './components/MapView';
import Analytics from './components/Analytics';
import AdminPanel from './components/AdminPanel';
import Alerts from './components/Alerts';
import RouteOptimizer from './components/RouteOptimizer';
import WasteClassifier from './components/WasteClassifier';
import ComplaintPortal from './components/ComplaintPortal';
import HeatmapView from './components/HeatmapView';
import CollectionReports from './components/CollectionReports';
import AIAssistant from './components/AIAssistant';
import { verifyToken } from './utils/api';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showPublicComplaints, setShowPublicComplaints] = useState(false);
  const [isFloatingAIOpen, setIsFloatingAIOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        await verifyToken();
        setUser(JSON.parse(userStr));
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      }
    }
    setLoading(false);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    if (showPublicComplaints) {
      return <ComplaintPortal onClose={() => setShowPublicComplaints(false)} />;
    }
    return <Login onLoginSuccess={handleLoginSuccess} onOpenComplaints={() => setShowPublicComplaints(true)} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <a className="brand" href="#dashboard" onClick={() => setActiveTab('dashboard')}>
            <span className="brand-mark" aria-hidden="true">IGM</span>
            <span className="brand-copy">
              <strong> Intelligent Garbage Management</strong>
              <small>Operations dashboard</small>
            </span>
          </a>
          <div className="header-info">
            <span className="system-status"><span className="status-dot" /> System online</span>
            <span className="user-info"><span className="user-avatar">{user?.username?.slice(0, 1).toUpperCase()}</span><span className="user-meta">{user?.username}<small>{user?.role}</small></span></span>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      <nav className="app-nav" aria-label="Main navigation">
        <button
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Overview
        </button>
        <button
          className={`nav-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          Collection map
        </button>
        <button
          className={`nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
        <button
          className={`nav-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          Alerts
        </button>
        <button
          className={`nav-btn ${activeTab === 'route' ? 'active' : ''}`}
          onClick={() => setActiveTab('route')}
        >
          Routes
        </button>
        <button
          className={`nav-btn ${activeTab === 'classify' ? 'active' : ''}`}
          onClick={() => setActiveTab('classify')}
        >
          Waste sorting
        </button>
        <button
          className={`nav-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('heatmap')}
        >
          Heatmap
        </button>
        <button
          className={`nav-btn ${activeTab === 'complaints' ? 'active' : ''}`}
          onClick={() => setActiveTab('complaints')}
        >
          Complaints
        </button>
        {['admin', 'operator'].includes(user?.role) && (
          <button
            className={`nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </button>
        )}
        {user?.role === 'admin' && (
          <button
            className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            Bin management
          </button>
        )}
        <button
          className={`nav-btn ${activeTab === 'ai' ? 'active' : ''}`}
          style={{ color: activeTab === 'ai' ? 'var(--primary)' : '#10513e', fontWeight: '800' }}
          onClick={() => setActiveTab('ai')}
        >
          ✨ EcoAI Assistant
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'map' && <MapView />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'alerts' && <Alerts />}
        {activeTab === 'route' && <RouteOptimizer />}
        {activeTab === 'classify' && <WasteClassifier />}
        {activeTab === 'heatmap' && <HeatmapView />}
        {activeTab === 'complaints' && <ComplaintPortal isStaff={['admin', 'operator'].includes(user?.role)} />}
        {activeTab === 'reports' && ['admin', 'operator'].includes(user?.role) && <CollectionReports />}
        {activeTab === 'admin' && <AdminPanel userRole={user?.role} />}
        {activeTab === 'ai' && <AIAssistant onNavigate={(tab) => setActiveTab(tab)} />}
      </main>

      {/* Omnipresent Floating AI Assistant Widget for quick access across all tabs */}
      {activeTab !== 'ai' && (
        <>
          <button
            className="ai-floating-trigger"
            onClick={() => setIsFloatingAIOpen(!isFloatingAIOpen)}
            title="Open EcoAI Operations Assistant"
            aria-label="Open EcoAI Operations Assistant"
          >
            <span className="ai-trigger-sparkle">✨</span>
            <span>Ask EcoAI</span>
          </button>

          {isFloatingAIOpen && (
            <AIAssistant
              isFloating={true}
              onClose={() => setIsFloatingAIOpen(false)}
              onNavigate={(tab) => {
                setActiveTab(tab);
                setIsFloatingAIOpen(false);
              }}
            />
          )}
        </>
      )}

      <footer className="app-footer">
        <p> Intelligent Garbage Management <span>·</span> Operations dashboard <span>·</span> 2026</p>
      </footer>
    </div>
  );
}

export default App;