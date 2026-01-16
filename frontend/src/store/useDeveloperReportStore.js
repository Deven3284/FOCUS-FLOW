import { create } from 'zustand';
import api from '../services/api';

export const useDeveloperReportStore = create((set, get) => ({
    // Developer report data from API
    developers: [],

    // Loading and error states
    isLoading: false,
    error: null,

    // Fetch developer report from API
    fetchDeveloperReport: async (workType = 'Onsite', reportDate = null) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/users/getDeveloperReport', {
                workType: workType === 'all' ? null : workType,
                reportDate: reportDate
            });

            if (response.data && response.data.data) {
                const developers = response.data.data.map(dev => ({
                    id: dev._id,
                    name: dev.name,
                    role: dev.jobTitle || 'Developer',
                    workType: dev.workType || 'Remote',
                    mobile: dev.mobile,
                    isActive: dev.isActive,
                    startTime: dev.startTime || '-',
                    endTime: dev.endTime || '-',
                    totalTime: dev.totalTime || '-',
                    taskCount: dev.tasks ? dev.tasks.length : 0,
                    tasks: dev.tasks || [],
                    dailyStatusId: dev.dailyStatusId
                }));

                set({
                    developers,
                    isLoading: false
                });
            } else {
                set({ developers: [], isLoading: false });
            }
        } catch (error) {
            console.error('Failed to fetch developer report:', error);
            set({
                isLoading: false,
                error: error.message || 'Failed to fetch developer report',
                developers: []
            });
        }
    },

    // Reset store
    resetDeveloperReport: () => set({
        developers: [],
        isLoading: false,
        error: null
    })
}));
