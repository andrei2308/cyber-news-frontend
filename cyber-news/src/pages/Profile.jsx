import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, AlertTriangle, Clock, User, LogOut, XCircle, ExternalLink, Plus, X, FileStack, CheckCircle } from 'lucide-react';
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
        description: '',
        title: '',
        severity: 'LOW',
        affectedSystems: '',
        score: ''
    });
    const [cveVerificationStatus, setCveVerificationStatus] = useState('idle');
    const [cveVerifying, setCveVerifying] = useState(false);
    const [verificationTimeout, setVerificationTimeout] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // CVE ID validation regex
    const cvePattern = /^CVE-\d{4}-\d{4,}$/i;

    useEffect(() => {
        if (!authLoading) {
            fetchUserProfile();
            fetchUserNews();
        }
    }, [authLoading, userId]);

    useEffect(() => {
        return () => {
            if (verificationTimeout) {
                clearTimeout(verificationTimeout);
            }
        };
    }, [verificationTimeout]);

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

    const verifyCVE = async (cveId) => {
        if (!cveId.trim() || !cvePattern.test(cveId.trim())) {
            setCveVerificationStatus('idle');
            return;
        }

        setCveVerifying(true);
        setCveVerificationStatus('verifying');

        try {
            const response = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cveId.trim())}`);

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            if (data.resultsPerPage && data.resultsPerPage > 0) {
                setCveVerificationStatus('valid');
            } else {
                setCveVerificationStatus('invalid');
            }
        } catch (error) {
            console.error('Error verifying CVE:', error);
            setCveVerificationStatus('error');
        } finally {
            setCveVerifying(false);
        }
    };

    const debouncedVerifyCVE = (cveId) => {
        if (verificationTimeout) {
            clearTimeout(verificationTimeout);
        }

        const timeoutId = setTimeout(() => {
            verifyCVE(cveId);
        }, 500);

        setVerificationTimeout(timeoutId);
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setCreateForm({
            description: '',
            title: '',
            severity: 'LOW',
            affectedSystems: '',
            score: ''
        });
        setError('');
        setSubmitting(false);

        setCveVerificationStatus('idle');
        setCveVerifying(false);
        if (verificationTimeout) {
            clearTimeout(verificationTimeout);
            setVerificationTimeout(null);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setCreateForm(prev => ({
            ...prev,
            [name]: type === 'number' ? value : value
        }));

        if (error) {
            setError('');
        }

        if (name === 'title') {
            if (!value.trim()) {
                setCveVerificationStatus('idle');
                if (verificationTimeout) {
                    clearTimeout(verificationTimeout);
                }
            } else {
                if (!cvePattern.test(value.trim())) {
                    setCveVerificationStatus('idle');
                    if (verificationTimeout) {
                        clearTimeout(verificationTimeout);
                    }
                } else {
                    debouncedVerifyCVE(value);
                }
            }
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

        if (cveVerificationStatus === 'invalid') {
            setError('The entered CVE ID does not exist in the NIST database. Please verify the CVE ID is correct.');
            return;
        }

        if (cveVerificationStatus === 'error') {
            setError('Unable to verify CVE ID. Please check your internet connection and try again.');
            return;
        }

        if (cveVerificationStatus === 'verifying') {
            setError('Please wait while we verify the CVE ID.');
            return;
        }

        if (cveVerificationStatus !== 'valid') {
            setError('Please enter a valid CVE ID that exists in the NIST database.');
            return;
        }

        if (!createForm.description.trim()) {
            setError('Description is required.');
            return;
        }

        if (!createForm.affectedSystems.trim()) {
            setError('Affected systems field is required.');
            return;
        }

        if (!createForm.score || createForm.score === '') {
            setError('CVSS Score is required.');
            return;
        }

        if (createForm.score < 0 || createForm.score > 10) {
            setError('CVSS Score must be between 0 and 10.');
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            const postData = {
                ...createForm,
                score: Number(createForm.score)
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
            </header >

            {/* Create Post Modal */}
            {
                showCreateModal && (
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
                                {/* Title */}
                                <div className="form-group">
                                    <label htmlFor="title" className="form-label">
                                        CVE ID <span className="required">*</span>
                                    </label>
                                    <div className="input-with-verification">
                                        <input
                                            type="text"
                                            id="title"
                                            name="title"
                                            value={createForm.title}
                                            onChange={handleInputChange}
                                            className={`form-input ${cveVerificationStatus === 'invalid' ? 'input-error' : cveVerificationStatus === 'valid' ? 'input-success' : ''}`}
                                            placeholder="Enter CVE ID (e.g., CVE-2024-1234)"
                                            autoComplete="off"
                                            required
                                        />
                                        {cveVerifying && (
                                            <div className="verification-spinner">
                                                <div className="spinner"></div>
                                            </div>
                                        )}
                                        {cveVerificationStatus === 'valid' && (
                                            <div className="verification-success">
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                            </div>
                                        )}
                                        {cveVerificationStatus === 'invalid' && (
                                            <div className="verification-error">
                                                <XCircle className="w-5 h-5 text-red-600" />
                                            </div>
                                        )}
                                    </div>
                                    {cveVerificationStatus === 'invalid' && (
                                        <div className="field-error-message">
                                            CVE ID not found in NIST database. Please enter a valid CVE ID.
                                        </div>
                                    )}
                                    {cveVerificationStatus === 'error' && (
                                        <div className="field-error-message">
                                            Unable to verify CVE ID. Please check your connection and try again.
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="form-group">
                                    <label htmlFor="description" className="form-label">
                                        Description <span className="required">*</span>
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={createForm.description}
                                        onChange={handleInputChange}
                                        className="form-textarea"
                                        placeholder="Describe the vulnerability..."
                                        rows={4}
                                        required
                                    />
                                </div>

                                {/* Severity */}
                                <div className="form-group">
                                    <label htmlFor="severity" className="form-label">
                                        Severity Level <span className="required">*</span>
                                    </label>
                                    <select
                                        id="severity"
                                        name="severity"
                                        value={createForm.severity}
                                        onChange={handleInputChange}
                                        className="form-select"
                                        required
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                </div>

                                {/* Score */}
                                <div className="form-group">
                                    <label htmlFor="score" className="form-label">
                                        CVSS Score (0-10) <span className="required">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        id="score"
                                        name="score"
                                        value={createForm.score}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        placeholder="0.0"
                                        autoComplete="off"
                                        required
                                    />
                                </div>

                                {/* Affected Systems */}
                                <div className="form-group">
                                    <label htmlFor="affectedSystems" className="form-label">
                                        Affected Systems <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="affectedSystems"
                                        name="affectedSystems"
                                        value={createForm.affectedSystems}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="e.g., Windows 10, Apache 2.4, MySQL 8.0"
                                        autoComplete="off"
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
                                        disabled={submitting || cveVerificationStatus !== 'valid'}
                                    >
                                        {submitting ? 'Creating...' : 'Create Post'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

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
        </div >
    );
};

export default Profile;