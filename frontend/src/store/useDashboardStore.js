import { create } from 'zustand';
import api from '../services/api';

export const useDashboardStore = create((set, get) => ({
    // Dashboard data from API
    totalTasks: 0,
    usersCount: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,

    // Loading and error states
    isLoading: false,
    error: null,

    // Fetch dashboard data from API
    fetchDashboard: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/users/getDashboard');
            if (response.data && response.data.data) {
                const data = response.data.data;
                set({
                    totalTasks: data.totalTasks || 0,
                    usersCount: data.users || 0,
                    completedTasks: data.completedTasks || 0,
                    pendingTasks: data.pendingTasks || 0,
                    inProgressTasks: data.inProgressTasks || 0,
                    isLoading: false
                });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            set({
                isLoading: false,
                error: error.message || 'Failed to fetch dashboard data'
            });
        }
    },

    // Reset dashboard data
    resetDashboard: () => set({
        totalTasks: 0,
        usersCount: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        isLoading: false,
        error: null
    })
}));
