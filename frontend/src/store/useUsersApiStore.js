import { create } from 'zustand';
import api from '../services/api';

export const useUsersApiStore = create((set, get) => ({
    // Users data from API
    users: [],
    totalPages: 1,
    totalDocs: 0,
    currentPage: 1,

    // Loading and error states
    isLoading: false,
    isSaving: false,
    error: null,
    successMessage: null,

    // Fetch users from API with pagination
    fetchUsers: async (page = 1, limit = 10, search = '', workType = '') => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/users/users', {
                page,
                limit,
                search,
                workType: workType === 'all' ? '' : workType
            });

            if (response.data && response.data.data) {
                const data = response.data.data;
                set({
                    users: data.docs || [],
                    totalPages: data.totalPages || 1,
                    totalDocs: data.totalDocs || 0,
                    currentPage: data.page || 1,
                    isLoading: false
                });
            } else {
                set({ users: [], isLoading: false });
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
            set({
                isLoading: false,
                error: error.message || 'Failed to fetch users'
            });
        }
    },

    // Fetch ALL users (for dropdowns/reports)
    fetchAllUsers: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/users/getAllUsers');

            if (response.data && response.data.data) {
                set({
                    users: response.data.data || [],
                    totalPages: 1, // Reset pagination info relevant to list view
                    totalDocs: response.data.data.length || 0,
                    currentPage: 1,
                    isLoading: false
                });
            } else {
                set({ users: [], isLoading: false });
            }
        } catch (error) {
            console.error('Failed to fetch all users:', error);
            set({
                isLoading: false,
                error: error.message || 'Failed to fetch all users'
            });
        }
    },

    // Save user (create or update)
    saveUser: async (userData) => {
        set({ isSaving: true, error: null, successMessage: null });
        try {
            const response = await api.post('/users/saveUser', userData);

            // Check if the API returned successfully with data
            if (response.data && response.data.data) {
                const isUpdate = userData._id && userData._id !== '';
                set({
                    isSaving: false,
                    successMessage: isUpdate
                        ? 'User account updated successfully'
                        : 'User account created successfully'
                });

                // Refresh users list after save (start from page 1 to see new user)
                await get().fetchUsers(1, 10, '', '');

                return { success: true, message: response.data.message };
            } else {
                // API returned error message
                set({
                    isSaving: false,
                    error: response.data?.message || 'Failed to save user'
                });
                return { success: false, message: response.data?.message || 'Failed to save user' };
            }
        } catch (error) {
            console.error('Failed to save user:', error);
            set({
                isSaving: false,
                error: error.response?.data?.message || error.message || 'Failed to save user'
            });
            return { success: false, message: error.message };
        }
    },

    // Delete user
    deleteUser: async (userId) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/users/deleteUserAccount', { id: userId });

            if (response.data && response.data.data) {
                set({
                    isLoading: false,
                    successMessage: 'User deleted successfully'
                });

                // Refresh users list after delete
                get().fetchUsers(get().currentPage);

                return { success: true, message: response.data.message };
            }
            return { success: false, message: response.data?.message || 'Failed to delete user' };
        } catch (error) {
            console.error('Failed to delete user:', error);
            set({
                isLoading: false,
                error: error.response?.data?.message || error.message || 'Failed to delete user'
            });
            return { success: false, message: error.message };
        }
    },

    // Toggle user account status
    toggleAccountStatus: async (userId, status) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/users/toggleAccountStatus', {
                id: userId,
                status
            });

            if (response.data && response.data.data) {
                set({
                    isLoading: false,
                    successMessage: 'Account status updated successfully'
                });

                // Refresh users list
                get().fetchUsers(get().currentPage);

                return { success: true };
            }
            return { success: false };
        } catch (error) {
            console.error('Failed to toggle account status:', error);
            set({
                isLoading: false,
                error: error.message || 'Failed to update account status'
            });
            return { success: false };
        }
    },

    // Clear messages
    clearMessages: () => set({ error: null, successMessage: null }),

    // Reset store
    resetStore: () => set({
        users: [],
        totalPages: 1,
        totalDocs: 0,
        currentPage: 1,
        isLoading: false,
        isSaving: false,
        error: null,
        successMessage: null
    })
}));
