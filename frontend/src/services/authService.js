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
        throw error.response?.data || { message: 'Network error. Please try again.' };
    }
};

export default {
    signIn
};
