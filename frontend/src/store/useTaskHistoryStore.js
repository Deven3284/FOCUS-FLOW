import { create } from 'zustand';
import api from '../services/api';

export const useTaskHistoryStore = create((set, get) => ({
    // History data from API
    history: [],
    isLoading: false,
    isSaving: false,
    error: null,
    successMessage: null,

    // Fetch task history from API
    fetchHistory: async (selectedMonth, selectedUserId = null) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/users/taskHistory', {
                selectedMonth,
                selectedUserId
            });

            if (response.data && response.data.data) {
                // Transform backend data to frontend format
                const transformedHistory = response.data.data.map(session => ({
                    id: session._id,
                    userId: session.user,
                    date: session.date,
                    rawDate: session.rawDate,
                    startTime: session.startTime,
                    endTime: session.endTime,
                    startTimeValue: session.startTimeValue,
                    endTimeValue: session.endTimeValue,
                    tasks: (session.tasks || []).map(task => ({
                        id: task._id,
                        title: task.task,
                        priority: task.priority || 'medium',
                        status: task.status || 'not-started',
                        timeElapsed: task.totalSeconds || 0,
                        isTimerRunning: task.isTrackerStarted || false
                    })),
                    taskCount: session.tasks?.length || 0
                }));

                set({
                    history: transformedHistory,
                    isLoading: false
                });
            } else {
                set({ history: [], isLoading: false });
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
            set({
                isLoading: false,
                error: error.message || 'Failed to fetch history'
            });
        }
    },

    // Add backdated task via API
    addBackdatedTask: async (taskData) => {
        set({ isSaving: true, error: null, successMessage: null });
        try {
            const response = await api.post('/users/addBackdatedTask', taskData);

            if (response.data && response.data.data) {
                set({
                    isSaving: false,
                    successMessage: 'Backdated task added successfully'
                });

                return { success: true, data: response.data.data };
            } else {
                set({
                    isSaving: false,
                    error: response.data?.message || 'Failed to add backdated task'
                });
                return { success: false, message: response.data?.message };
            }
        } catch (error) {
            console.error('Failed to add backdated task:', error);
            set({
                isSaving: false,
                error: error.response?.data?.message || error.message || 'Failed to add backdated task'
            });
            return { success: false, message: error.message };
        }
    },

    // Generate report via API (downloads Excel file)
    generateReport: async (selectedMonth, selectedYear, workType) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/users/generateReport', {
                selectedMonth: selectedMonth + 1, // Convert 0-11 to 1-12 for backend
                selectedYear,
                workType: workType === 'All' ? '' : workType?.toLowerCase()
            }, {
                responseType: 'blob' // Important for file download
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `itf_work_status_${selectedMonth}_${selectedYear}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            set({
                isLoading: false,
                successMessage: 'Report downloaded successfully'
            });

            return { success: true };
        } catch (error) {
            console.error('Failed to generate report:', error);
            set({
                isLoading: false,
                error: error.message || 'Failed to generate report'
            });
            return { success: false, message: error.message };
        }
    },

    // Clear messages
    clearMessages: () => set({ error: null, successMessage: null }),

    // Reset store
    resetStore: () => set({
        history: [],
        isLoading: false,
        isSaving: false,
        error: null,
        successMessage: null
    })
}));
