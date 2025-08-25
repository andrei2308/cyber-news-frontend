import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';

import './Register.css';

const Register = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
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
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setLoading(true);
        setError('');
        setFieldErrors({});

        try {
            await apiService.post('/user/register', formData);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message);
            console.error('Registration error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-header">
                    <h2>Create account</h2>
                    <p>Please fill in your details to register</p>
                </div>
                {/* General Error Message */}
                {error && (
                    <div className="error-banner">
                        <span className="error-icon">⚠</span>
                        <span className="error-text">{error}</span>
                    </div>
                )}

                {/* Username Field */}
                <div className="form-group">
                    <label htmlFor="username" className="form-label">
                        Username
                    </label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        className={`form-input ${fieldErrors.username ? 'error' : ''}`}
                        value={formData.username}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder="Enter your username"
                        required
                    />
                    {fieldErrors.username && (
                        <span className="field-error">{fieldErrors.username}</span>
                    )}
                </div>

                {/* Email Field */}
                <div className="form-group">
                    <label htmlFor="email" className="form-label">
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        className={`form-input ${fieldErrors.email ? 'error' : ''}`}
                        value={formData.email}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder="Enter your email"
                        required
                    />
                    {fieldErrors.email && (
                        <span className="field-error">{fieldErrors.email}</span>
                    )}
                </div>

                {/* Password Field */}
                <div className="form-group">
                    <label htmlFor="password" className="form-label">
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        className={`form-input ${fieldErrors.password ? 'error' : ''}`}
                        value={formData.password}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder="Create a password"
                        required
                    />
                    {fieldErrors.password && (
                        <span className="field-error">{fieldErrors.password}</span>
                    )}
                </div>

                {/* Submit Button */}
                <div className="form-actions">
                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Registering...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </div>

                <div className="auth-footer">
                    <p>
                        Already have an account?
                        <a href="/" className="auth-link"> Sign in</a>
                    </p>
                </div>
            </form>
        </div>
    );
}

export default Register;