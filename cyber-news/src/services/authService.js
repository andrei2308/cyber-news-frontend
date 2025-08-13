const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

export const authService = {
    setToken: (token) => {
        localStorage.setItem(TOKEN_KEY, token);
    },

    getToken: () => {
        return localStorage.getItem(TOKEN_KEY);
    },

    setRefreshToken: (refreshToken) => {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    },

    getRefreshToken: () => {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    },

    removeTokens: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },

    setUser: (user) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    getUser: () => {
        const user = localStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null;
    },

    isTokenExpired: (token) => {
        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;

            return payload.exp && (payload.exp - 60) < currentTime;
        } catch (error) {
            console.error('Invalid token format:', error);
            return true;
        }
    },

    refreshAccessToken: async () => {
        const refreshToken = authService.getRefreshToken();

        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        if (authService.isTokenExpired(refreshToken)) {
            authService.removeTokens();
            throw new Error('Refresh token expired');
        }

        try {
            const response = await fetch('http://localhost:8080/api/user/refresh-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshToken}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    authService.removeTokens();
                    throw new Error('Refresh token invalid');
                }
                throw new Error('Failed to refresh token');
            }

            const data = await response.json();

            if (data.token) {
                authService.setToken(data.token);

                if (data.refreshToken) {
                    authService.setRefreshToken(data.refreshToken);
                }

                if (data.username) {
                    const userData = { username: data.username };
                    authService.setUser(userData);
                }

                return data.token;
            } else {
                throw new Error('No token received from refresh');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            authService.removeTokens();
            throw error;
        }
    },

    getValidToken: async () => {
        const token = authService.getToken();

        if (!token) {
            return null;
        }

        if (authService.isTokenExpired(token)) {
            try {
                return await authService.refreshAccessToken();
            } catch (error) {
                console.error('Failed to refresh token:', error);
                return null;
            }
        }

        return token;
    },

    isAuthenticated: () => {
        const token = authService.getToken();
        const refreshToken = authService.getRefreshToken();

        if (!token || !refreshToken) return false;

        if (authService.isTokenExpired(token) && authService.isTokenExpired(refreshToken)) {
            authService.removeTokens();
            return false;
        }

        return true;
    },

    login: async (credentials) => {
        try {
            const response = await fetch('http://localhost:8080/api/user/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Invalid credentials');
                } else if (response.status === 500) {
                    throw new Error('Server error. Please try again later.');
                } else {
                    throw new Error('Login failed. Please try again.');
                }
            }

            const data = await response.json();

            if (data.token && data.refreshToken) {
                authService.setToken(data.token);
                authService.setRefreshToken(data.refreshToken);

                const userData = {
                    username: data.username,
                    tokenType: data.tokenType
                };
                authService.setUser(userData);

                return data;
            } else {
                throw new Error('Invalid response format from server');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    logout: async () => {
        const token = authService.getToken();

        if (token) {
            try {
                await fetch('http://localhost:8080/api/user/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Logout API call failed:', error);
            }
        }

        authService.removeTokens();
    }
};