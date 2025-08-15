import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Clock, User, LogOut, RefreshCw, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import './Profile.css';

const Profile = () => {
    const { user, logout, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userNews, setUserNews] = useState([]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchUserNews();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [authLoading, user]);

    const fetchUserNews = async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError('');
            console.log(user);
            const data = await apiService.get(`/news/${user.id}`);
            setUserNews(data);
        } catch (err) {
            setError('Failed to load user news. Please try again.');
            console.error('Failed to fetch user news:', err);
        } finally {
            setLoading(false);
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

    if (loading) {
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
        <div className="profile-container">
            {/* Header */}
            <header className="profile-header">
                <div className="header-content">
                    <div className="header-brand">
                        <div className="brand-icon">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div className="brand-text">
                            <h1>Security Dashboard</h1>
                            <p>CVE Monitoring & Analysis</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        <button
                            onClick={logout}
                            className="logout-button"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="profile-content">
                {/* User Profile Section */}
                {user && (
                    <div className="user-profile-card">
                        <div className="user-profile-content">
                            <div className="user-avatar">
                                <User className="w-8 h-8" />
                            </div>
                            <div className="user-info">
                                <h2>{user.name}</h2>
                                <p className="user-email">{user.username}</p>
                                <p className="user-role">{user.role}</p>
                            </div>
                            <div className="user-stats">
                                <div className="stats-number">{userNews.length}</div>
                                <div className="stats-label">Active CVEs</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="stats-grid">
                    {['Critical', 'High', 'Medium', 'Low'].map(severity => {
                        const count = userNews.filter(item => item.severity.toLowerCase() === severity.toLowerCase()).length;

                        return (
                            <div key={severity} className={`stats-card ${severity.toLowerCase()}`}>
                                <div className="stats-card-content">
                                    <div className="stats-card-info">
                                        <div className="stats-count">{count}</div>
                                        <div className="stats-severity">{severity} Risk</div>
                                    </div>
                                    <AlertTriangle className="w-6 h-6 stats-card-icon" />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="error-message">
                        <div className="error-content">
                            <AlertTriangle className="w-5 h-5" />
                            <p>{error}</p>
                        </div>
                    </div>
                )}

                {/* CVE List */}
                <div className="cve-list-container">
                    <div className="cve-list-header">
                        <h3>Recent CVE Updates</h3>
                        <p>Latest vulnerabilities affecting your systems</p>
                    </div>

                    <div className="cve-list">
                        {userNews.length === 0 ? (
                            <div className="empty-state">
                                <Shield className="empty-state-icon" />
                                <p>No CVE data available</p>
                            </div>
                        ) : (
                            userNews.map((cve) => (
                                <div key={cve.id} className="cve-item">
                                    <div className="cve-content">
                                        <div className="cve-main">
                                            <div className="cve-badges">
                                                <span className="cve-id">
                                                    {cve.cveId}
                                                </span>
                                                <span className={`severity-badge ${getSeverityColor(cve.severity)}`}>
                                                    {cve.severity}
                                                </span>
                                                {cve.score && (
                                                    <span className={`cvss-score ${getSeverityColor(cve.severity)}`}>
                                                        {cve.score}/10
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="cve-title">{cve.title}</h4>
                                            <p className="cve-description">{cve.description}</p>

                                            <div className="cve-meta">
                                                <div className="cve-meta-item">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{formatDate(cve.createdAt)}</span>
                                                </div>
                                                {cve.affectedSystems && (
                                                    <div className="cve-meta-item">
                                                        <span>Affected:</span>
                                                        <span className="affected-systems">{Array.isArray(cve.affectedSystems) ? cve.affectedSystems.join(', ') : cve.affectedSystems}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button className="view-details-button">
                                            <span>View Details</span>
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;