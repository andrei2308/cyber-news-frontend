import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';

export const useApi = (endpoint, options = {}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { isAuthenticated } = useAuth();

    const { dependencies = [], skip = false } = options;

    const fetchData = useCallback(async () => {
        if (skip || !endpoint) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const result = await apiService.get(endpoint);
            setData(result);
        } catch (err) {
            setError(err.message);
            console.error(`API call failed for ${endpoint}:`, err);
        } finally {
            setLoading(false);
        }
    }, [endpoint, skip, ...dependencies]);

    useEffect(() => {
        if (endpoint && (endpoint.includes('/user/') ? isAuthenticated : true)) {
            fetchData();
        }
    }, [fetchData, isAuthenticated]);

    const refetch = useCallback(() => {
        if (!skip && endpoint) {
            fetchData();
        }
    }, [fetchData, skip, endpoint]);

    return { data, loading, error, refetch };
};

export const useApiMutation = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const mutate = useCallback(async (method, endpoint, data = null) => {
        try {
            setLoading(true);
            setError(null);

            let result;
            switch (method.toLowerCase()) {
                case 'post':
                    result = await apiService.post(endpoint, data);
                    break;
                case 'put':
                    result = await apiService.put(endpoint, data);
                    break;
                case 'patch':
                    result = await apiService.patch(endpoint, data);
                    break;
                case 'delete':
                    result = await apiService.delete(endpoint);
                    break;
                default:
                    throw new Error(`Unsupported method: ${method}`);
            }

            return result;
        } catch (err) {
            setError(err.message);
            console.error(`API mutation failed for ${method} ${endpoint}:`, err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const post = useCallback((endpoint, data) => mutate('post', endpoint, data), [mutate]);
    const put = useCallback((endpoint, data) => mutate('put', endpoint, data), [mutate]);
    const patch = useCallback((endpoint, data) => mutate('patch', endpoint, data), [mutate]);
    const del = useCallback((endpoint) => mutate('delete', endpoint), [mutate]);

    return {
        mutate,
        post,
        put,
        patch,
        delete: del,
        loading,
        error,
        clearError: () => setError(null)
    };
};

export const useFileUpload = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);

    const upload = useCallback(async (endpoint, file, onProgress = null) => {
        try {
            setLoading(true);
            setError(null);
            setProgress(0);

            const formData = new FormData();
            formData.append('file', file);

            const result = await apiService.uploadFile(endpoint, formData);
            setProgress(100);

            return result;
        } catch (err) {
            setError(err.message);
            console.error(`File upload failed for ${endpoint}:`, err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        upload,
        loading,
        error,
        progress,
        clearError: () => setError(null)
    };
};