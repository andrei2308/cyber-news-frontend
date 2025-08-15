import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                if (authService.isAuthenticated()) {
                    const userData = authService.getUser();
                    setUser(userData);

                    const token = await authService.getValidToken();
                    if (!token) {
                        setUser(null);
                        authService.removeTokens();
                    }
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                setUser(null);
                authService.removeTokens();
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    useEffect(() => {
        if (!user) return;

        const checkTokenExpiry = async () => {
            try {
                const token = authService.getToken();
                if (token && authService.isTokenExpired(token)) {
                    await authService.refreshAccessToken();
                }
            } catch (error) {
                console.error('Token refresh failed:', error);
                logout();
            }
        };

        const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [user]);

    const login = async (credentials) => {
        try {
            setLoading(true);
            const response = await authService.login(credentials);

            const userData = {
                username: response.username,
                tokenType: response.tokenType
            };

            setUser(userData);
            return response;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            setLoading(true);
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            setLoading(false);
            window.location.href = '/';
        }
    };

    const refreshToken = async () => {
        try {
            const newToken = await authService.refreshAccessToken();
            return newToken;
        } catch (error) {
            console.error('Token refresh failed:', error);
            logout();
            throw error;
        }
    };

    const value = {
        user,
        login,
        logout,
        refreshToken,
        loading,
        isAuthenticated: !!user && authService.isAuthenticated(),
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};