import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:2025',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle common errors
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    // Unauthorized - clear token and redirect to login
                    localStorage.removeItem('authToken');
                    window.location.href = '/login';
                    break;
                case 403:
                    console.error('Access forbidden');
                    break;
                case 500:
                    console.error('Server error');
                    break;
                default:
                    break;
            }
        }
        return Promise.reject(error);
    }
);

export default api;
