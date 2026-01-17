import api from './api';

/**
 * Sign in user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} - API response with user data and token
 */
export const signIn = async (email, password) => {
    try {
        const response = await api.post('/users/signIn', { email, password });
        return response.data;
    } catch (error) {
        // Handle different error scenarios
        if (error.code === 'ECONNABORTED') {
            throw { message: 'Request timeout. Please check your connection and try again.' };
        }
        if (error.code === 'ERR_NETWORK' || !error.response) {
            throw { message: 'Network error. Please check if the server is running.' };
        }
        throw error.response?.data || { message: 'An error occurred. Please try again.' };
    }
};

export default {
    signIn
};
