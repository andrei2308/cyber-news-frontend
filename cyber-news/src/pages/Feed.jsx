import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import './Feed.css';

const Feed = () => {
    const [cveData, setCveData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [error, setError] = useState('');
    const { user, logout, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading) {
            fetchCVEData();
        }
    }, [authLoading]);

    const fetchCVEData = async () => {
        try {
            setDataLoading(true);
            setError('');
            const data = await apiService.get('/news');
            setCveData(data);
        } catch (err) {
            setError('Failed to load CVE data. Please try again.');
            console.error('Failed to fetch CVE data:', err);
        } finally {
            setDataLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No date available';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid date';
        }
    };

    const getSeverityColor = (severity) => {
        const sev = severity?.toLowerCase() || '';
        if (sev.includes('critical')) return 'critical';
        if (sev.includes('high')) return 'high';
        if (sev.includes('medium')) return 'medium';
        return 'low';
    };

    const handleProfileClick = () => {
        navigate(`/profile/${user.id}`);
    };

    const handleUserClick = (userId) => {
        navigate(`/profile/${userId}`);
    };

    if (authLoading) {
        return (
            <div className="feed-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }
    if (dataLoading) {
        return (
            <div className="feed-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading CVE data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="feed-container">
            <header className="feed-header">
                <div className="header-content">
                    <h1>CVE security feed</h1>
                    <div className="header-actions">
                        <span className="welcome-text">Welcome, {user?.username}</span>
                        <button onClick={handleProfileClick} className="profile-btn">
                            My Profile
                        </button>
                        <button onClick={logout} className="logout-btn">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="feed-content">
                {error && (
                    <div className="error-banner">
                        <p>{error}</p>
                        <button onClick={fetchCVEData} className="retry-btn">
                            Retry
                        </button>
                    </div>
                )}

                {cveData.length === 0 && !error ? (
                    <div className="empty-state">
                        <h2>No CVE data available</h2>
                        <p>There are currently no CVE reports to display.</p>
                    </div>
                ) : (
                    <div className="cve-grid">
                        {cveData.map((cve, index) => (
                            <div key={index} className="cve-card">
                                <div className="post-header">
                                    <div className="author-info">
                                        <div
                                            className="author-avatar clickable"
                                            onClick={() => handleUserClick(cve.userId)}
                                        >
                                            {cve.authorUsername?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div className="author-details">
                                            <div
                                                className="author-name clickable"
                                                onClick={() => handleUserClick(cve.userId)}
                                            >
                                                {cve.authorUsername}
                                            </div>
                                            <div className="post-time">{formatDate(cve.createdDate)}</div>
                                        </div>
                                    </div>
                                    <div className="post-options">
                                        <span className={`severity-badge ${getSeverityColor(cve.severity)}`}>
                                            {getSeverityColor(cve.severity)}
                                        </span>
                                    </div>
                                </div>

                                <div className="post-content">
                                    {cve.title && (
                                        <h3 className="post-title">{cve.title}</h3>
                                    )}
                                    <p className="post-text">
                                        {cve.description || 'No description available'}
                                    </p>
                                </div>

                                <div className="post-footer">
                                    <div className="post-stats">
                                        <span className="stat-item">🔍 Security alert</span>
                                        <span className="stat-item">CVE report</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Feed;