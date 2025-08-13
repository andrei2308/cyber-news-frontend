// src/services/apiService.js
import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

class ApiService {
    constructor() {
        this.isRefreshing = false;
        this.failedQueue = [];
    }

    processQueue(error, token = null) {
        this.failedQueue.forEach(({ resolve, reject }) => {
            if (error) {
                reject(error);
            } else {
                resolve(token);
            }
        });

        this.failedQueue = [];
    }

    async request(endpoint, options = {}) {
        try {
            const token = await authService.getValidToken();

            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                    ...options.headers,
                },
                ...options,
            };

            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

            if (response.status === 401) {
                if (!this.isRefreshing) {
                    this.isRefreshing = true;

                    try {
                        const newToken = await authService.refreshAccessToken();
                        this.processQueue(null, newToken);
                        this.isRefreshing = false;

                        const newConfig = {
                            ...config,
                            headers: {
                                ...config.headers,
                                Authorization: `Bearer ${newToken}`
                            }
                        };

                        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, newConfig);
                        return await this.handleResponse(retryResponse);

                    } catch (refreshError) {
                        this.processQueue(refreshError, null);
                        this.isRefreshing = false;

                        authService.removeTokens();
                        window.location.href = '/login';
                        throw new Error('Session expired. Please login again.');
                    }
                }

                return new Promise((resolve, reject) => {
                    this.failedQueue.push({ resolve, reject });
                }).then(token => {
                    const newConfig = {
                        ...config,
                        headers: {
                            ...config.headers,
                            Authorization: `Bearer ${token}`
                        }
                    };
                    return fetch(`${API_BASE_URL}${endpoint}`, newConfig).then(this.handleResponse);
                }).catch(error => {
                    throw error;
                });
            }

            return await this.handleResponse(response);

        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async handleResponse(response) {
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) {

            }
            throw new Error(errorMessage);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            const text = await response.text();
            return text || null;
        }
    }

    async login(credentials) {
        const config = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        };

        try {
            const response = await fetch(`${API_BASE_URL}/user/login`, config);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Login request failed:', error);
            throw error;
        }
    }

    get(endpoint) {
        return this.request(endpoint);
    }

    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE',
        });
    }

    async uploadFile(endpoint, formData) {
        try {
            const token = await authService.getValidToken();

            const config = {
                method: 'POST',
                headers: {
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: formData,
            };

            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

            if (response.status === 401) {
                const newToken = await authService.refreshAccessToken();
                const newConfig = {
                    ...config,
                    headers: {
                        ...config.headers,
                        Authorization: `Bearer ${newToken}`
                    }
                };

                const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, newConfig);
                return await this.handleResponse(retryResponse);
            }

            return await this.handleResponse(response);
        } catch (error) {
            console.error('File upload failed:', error);
            throw error;
        }
    }
}

export const apiService = new ApiService();