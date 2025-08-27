import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, AlertTriangle, Clock, User, LogOut, XCircle, ExternalLink, Plus, X, FileStack, CheckCircle, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import './Profile.css';

const Profile = () => {
    const { userId } = useParams();
    const { logout, loading: authLoading, user: currentUser } = useAuth();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userNews, setUserNews] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        title: '',
        description: '',
        severity: '',
        affectedSystems: '',
        score: ''
    });
    const [cveData, setCveData] = useState(null);
    const [fetchingCveDetails, setFetchingCveDetails] = useState(false);
    const [cveDetailsFetched, setCveDetailsFetched] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // CVE ID validation regex
    const cvePattern = /^CVE-\d{4}-\d{4,}$/i;

    useEffect(() => {
        if (!authLoading) {
            fetchUserProfile();
            fetchUserNews();
        }
    }, [authLoading, userId]);

    const isOwnProfile = currentUser && user && (currentUser.id === user.id || currentUser.id === userId);

    const fetchUserProfile = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await apiService.get(`/user/${userId}`);
            setUser(data);
        } catch (err) {
            setError('Failed to load user profile. Please try again.');
            console.error('Failed to fetch user profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserNews = async () => {
        if (!userId) return;
        try {
            setLoading(true);
            setError('');
            const data = await apiService.get(`/news/${userId}`);
            setUserNews(data);
        } catch (err) {
            setError('Failed to load user news. Please try again.');
            console.error('Failed to fetch user news:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = () => {
        setShowCreateModal(true);
    };

    const handleGoToFeed = () => {
        window.location.href = '/feed';
    };

    const handleFetchCveDetails = async () => {
        if (!createForm.title.trim()) {
            setError('Please enter a CVE ID first.');
            return;
        }

        if (!cvePattern.test(createForm.title.trim())) {
            setError('Please enter a valid CVE ID format (e.g., CVE-2024-1234).');
            return;
        }

        setFetchingCveDetails(true);
        setError('');
        setCveDetailsFetched(false);

        try {
            const response = await apiService.get(`/news/details/${encodeURIComponent(createForm.title.trim())}`);

            if (response.exists && response.data) {
                setCveData(response.data);
                setCveDetailsFetched(true);

                console.log('Fetched CVE details:', response.data);

                setCreateForm(prev => ({
                    ...prev,
                    severity: response.data.severity || 'Not specified',
                    affectedSystems: response.data.affectedSystems || 'Not specified',
                    score: response.data.score ? String(response.data.score) : 'Not available'
                }));

            } else if (response.exists === false) {
                setError('CVE ID not found in NIST database. Please verify the CVE ID is correct.');
                setCveData(null);
                setCveDetailsFetched(false);

                setCreateForm(prev => ({
                    ...prev,
                    severity: '',
                    affectedSystems: '',
                    score: ''
                }));

            } else {
                setError('Received unexpected response format. Please try again.');
                console.warn('Unexpected response structure:', response);
                setCveData(null);
                setCveDetailsFetched(false);
            }

        } catch (err) {
            console.error('Error fetching CVE details:', err);

            if (err.message && err.message.includes('404')) {
                setError('CVE ID not found. Please verify the CVE ID is correct.');
            } else if (err.message && err.message.includes('500')) {
                setError('Server error occurred. Please try again later.');
            } else if (err.message && err.message.includes('Network')) {
                setError('Network error. Please check your connection and try again.');
            } else {
                setError('Failed to fetch CVE details. Please try again.');
            }

            setCveData(null);
            setCveDetailsFetched(false);

            setCreateForm(prev => ({
                ...prev,
                severity: '',
                affectedSystems: '',
                score: ''
            }));

        } finally {
            setFetchingCveDetails(false);
        }
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setCreateForm({
            title: '',
            description: '',
            severity: '',
            affectedSystems: '',
            score: ''
        });
        setError('');
        setSubmitting(false);
        setCveData(null);
        setCveDetailsFetched(false);
        setFetchingCveDetails(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name !== 'title' && name !== 'description') {
            return;
        }

        setCreateForm(prev => ({
            ...prev,
            [name]: value
        }));

        if (error) {
            setError('');
        }

        if (name === 'title' && cveDetailsFetched) {
            setCveDetailsFetched(false);
            setCveData(null);
            setCreateForm(prev => ({
                ...prev,
                severity: '',
                affectedSystems: '',
                score: ''
            }));
        }
    };

    const handleSubmitPost = async (e) => {
        e.preventDefault();

        if (!createForm.title.trim()) {
            setError('CVE ID is required.');
            return;
        }

        if (!cvePattern.test(createForm.title.trim())) {
            setError('Please enter a valid CVE ID format (e.g., CVE-2024-1234).');
            return;
        }

        if (!cveDetailsFetched) {
            setError('Please fetch CVE details before submitting.');
            return;
        }

        if (!createForm.description.trim()) {
            setError('Please add your analysis or opinion about this CVE.');
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            const postData = {
                title: createForm.title,
                description: createForm.description,
                severity: createForm.severity,
                affectedSystems: createForm.affectedSystems,
                score: Number(createForm.score) || 0
            };

            await apiService.post(`/user/${currentUser.id}/create-news`, postData);

            await fetchUserNews();

            handleCloseModal();

        } catch (err) {
            setError('Failed to create post. Please try again.');
            console.error('Failed to create post:', err);
        } finally {
            setSubmitting(false);
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
                            <h1>Security dashboard profile</h1>
                        </div>
                    </div>
                    <div className="header-actions">
                        {/* Create Post Button - Only show if viewing own profile */}
                        {isOwnProfile && (
                            <button
                                onClick={handleCreatePost}
                                className="create-post-button centered"
                                title="Create new post"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Create post</span>
                            </button>
                        )}
                        <button
                            onClick={handleGoToFeed}
                            className="feed-button"
                        >
                            <FileStack className="w-4 h-4" />
                            <span>Go to feed</span>
                        </button>

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

            {/* Create Post Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create new CVE post</h3>
                            <button
                                onClick={handleCloseModal}
                                className="modal-close-button"
                                type="button"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitPost} className="create-post-form">
                            {/* CVE ID Input */}
                            <div className="form-group">
                                <label htmlFor="title" className="form-label">
                                    CVE ID <span className="required">*</span>
                                </label>
                                <div className="input-with-button">
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={createForm.title}
                                        onChange={handleInputChange}
                                        className={`form-input ${cveDetailsFetched ? 'input-success' : ''
                                            }`}
                                        placeholder="Enter CVE ID (e.g., CVE-2024-1234)"
                                        autoComplete="off"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={handleFetchCveDetails}
                                        className="fetch-button"
                                        disabled={fetchingCveDetails || !createForm.title.trim()}
                                    >
                                        {fetchingCveDetails ? (
                                            <div className="spinner-small"></div>
                                        ) : (
                                            <Download className="w-4 h-4" />
                                        )}
                                        <span>
                                            {fetchingCveDetails ? 'Fetching...' : 'Fetch Details'}
                                        </span>
                                    </button>
                                </div>
                                {cveDetailsFetched && (
                                    <div className="field-success-message">
                                        <CheckCircle className="w-4 h-4" />
                                        <span>CVE details fetched successfully</span>
                                    </div>
                                )}
                            </div>

                            {/* Auto-populated CVE Details (Read-only) */}
                            {cveData && cveDetailsFetched && (
                                <div className="cve-details-section">
                                    <h4 className="section-title">CVE Details (Auto-populated)</h4>

                                    {/* CVE Details Grid */}
                                    <div className="cve-details-grid">
                                        <div className="detail-item">
                                            <label className="detail-label">Severity</label>
                                            <div className={`severity-badge ${getSeverityColor(createForm.severity)}`}>
                                                {createForm.severity || 'Not specified'}
                                            </div>
                                        </div>

                                        <div className="detail-item">
                                            <label className="detail-label">CVSS Score</label>
                                            <div className="detail-value">
                                                {createForm.score || 'Not available'}
                                            </div>
                                        </div>

                                        <div className="detail-item">
                                            <label className="detail-label">Affected Systems</label>
                                            <div className="detail-value">
                                                {createForm.affectedSystems || 'Not specified'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* User Opinion/Analysis */}
                            <div className="form-group">
                                <label htmlFor="description" className="form-label">
                                    Your Analysis/Opinion <span className="required">*</span>
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={createForm.description}
                                    onChange={handleInputChange}
                                    className="form-textarea"
                                    placeholder="Share your thoughts, analysis, or recommendations about this CVE..."
                                    rows={4}
                                    required
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="modal-error-message">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Form Actions */}
                            <div className="form-actions">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="cancel-button"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="submit-button"
                                    disabled={submitting || !cveDetailsFetched}
                                >
                                    {submitting ? 'Creating...' : 'Create Post'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                        const count = userNews.filter(item => item.severity.toLowerCase() === severity?.toLowerCase()).length;

                        return (
                            <div key={severity} className={`stats-card ${severity?.toLowerCase()}`}>
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
                                                    {cve.id}
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
                                                    <span>{formatDate(cve.createdDate)}</span>
                                                </div>
                                                {cve.affectedSystems && (
                                                    <div className="cve-meta-item">
                                                        <span>Affected:</span>
                                                        <span className="affected-systems">{Array.isArray(cve.affectedSystems) ? cve.affectedSystems.join(', ') : cve.affectedSystems}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button className="view-details-button"
                                            onClick={() => window.open(`https://www.cve.org/CVERecord?id=${cve.title}`, '_blank')}
                                        >
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