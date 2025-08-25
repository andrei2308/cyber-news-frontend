import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const [fieldErrors, setFieldErrors] = useState({});
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (error) setError('');
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = {};
        if (!formData.username.trim()) {
            errors.username = 'Username is required';
        }
        if (!formData.password) {
            errors.password = 'Password is required';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setLoading(true);
        setError('');
        setFieldErrors({});

        try {
            await login(formData);

            navigate('/feed', { replace: true });

        } catch (err) {
            setError(err.message);
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="auth-header">
                    <h2>Welcome back</h2>
                    <p>Please sign in to your account</p>
                </div>

                {error && (
                    <div className="error-banner">
                        <span className="error-icon">⚠</span>
                        <span className="error-text">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className={`form-group ${fieldErrors.username ? 'error' : ''}`}>
                        <label htmlFor="username" className="form-label">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            className="form-input"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            disabled={loading}
                            placeholder="Enter your username"
                            autoComplete="username"
                        />
                        {fieldErrors.username && (
                            <span className="field-error">{fieldErrors.username}</span>
                        )}
                    </div>

                    <div className={`form-group ${fieldErrors.password ? 'error' : ''}`}>
                        <label htmlFor="password" className="form-label">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            className="form-input"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            disabled={loading}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                        />
                        {fieldErrors.password && (
                            <span className="field-error">{fieldErrors.password}</span>
                        )}
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            disabled={loading || !formData.username || !formData.password}
                            className="login-button primary"
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </div>
                </form>

                <div className="auth-divider">
                    <span>or</span>
                </div>

                <div className="auth-footer">
                    <p>Don't have an account?</p>
                    <a href="/register" className="register-button">
                        Create account
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Login;