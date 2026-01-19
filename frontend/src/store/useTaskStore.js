import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const initialTasks = [];
const initialHistory = [];

const mapToBackendTask = (task) => ({
    _id: (typeof task.id === 'string' && task.id.length === 24) ? task.id : null,
    task: task.title || '',
    priority: (task.priority || 'medium').toLowerCase(),
    status: task.status === 'Completed' ? 'completed' :
        task.status === 'In Progress' ? 'in-progress' :
            task.status === 'Pending' ? 'pending' : 'not-started',
    estHour: parseInt(task.estHour) || 0,
    estMin: parseInt(task.estMin) || 0,
    estimatedTime: {
        hour: String(task.estHour || 0),
        minutes: String(task.estMin || 0)
    },
    totalSeconds: task.timeElapsed || 0,
    isTrackerStarted: task.isTimerRunning || false
});

export const useTaskStore = create(
    persist(
        (set, get) => ({

            tasks: initialTasks,
            history: initialHistory,
            historyFilterUserId: '', // State for Admin Filter on History Page
            activeSessions: {}, // { userId: timestamp }
            dailyStatusId: null, // Backend DailyStatus ID for API sync
            isLoading: false,
            isSyncing: false,

            setHistoryFilterUserId: (id) => set({ historyFilterUserId: id }),

            addHistorySession: (session) => set((state) => ({
                history: [session, ...state.history]
            })),

            // Fetch today's data from backend API
            fetchTodaysData: async () => {
                set({ isLoading: true });
                try {
                    const response = await api.post('/users/getTodaysData');
                    console.log('getTodaysData response:', response.data);

                    // API returns data as an array - get the first element
                    if (response.data && response.data.data && response.data.data.length > 0) {
                        const data = response.data.data[0]; // Get first element from array

                        // Transform backend tasks to frontend format
                        const apiTasks = (data.tasks || []).map(task => ({
                            id: task._id || Date.now() + Math.random(),
                            title: task.task || '',
                            priority: task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium',
                            status: task.status === 'completed' ? 'Completed' :
                                task.status === 'in-progress' ? 'In Progress' :
                                    task.status === 'pending' ? 'Pending' : 'Not Started',
                            estHour: task.estimatedTime?.hour || task.estHour || 0,
                            estMin: task.estimatedTime?.minutes || task.estMin || 0,
                            timeElapsed: task.totalSeconds || 0,
                            isTimerRunning: task.isTrackerStarted || false,
                            dueDate: task.dueDate || 'Today', // Add dueDate field
                            userId: data.user
                        }));

                        // If the day has already ended (endTime exists), do NOT show any tasks
                        if (data.endTime) {
                            console.log('Day ended for today, not loading tasks.');
                            set({
                                tasks: [], // Clear tasks
                                dailyStatusId: null, // Reset ID so user can't update them
                                isLoading: false,
                                activeSessions: {}
                            });
                            return { success: true, data };
                        }

                        console.log('Transformed tasks:', apiTasks);

                        set({
                            tasks: apiTasks,
                            dailyStatusId: data._id,
                            isLoading: false,
                            activeSessions: (data.startTime && !data.endTime) ? { [data.user]: new Date(data.startTime).getTime() } : {}
                        });

                        return { success: true, data };
                    } else {
                        console.log('No today data found');
                        set({
                            isLoading: false,
                            tasks: [],
                            dailyStatusId: null,
                            activeSessions: {}
                        });
                        return { success: true, data: null };
                    }
                } catch (error) {
                    console.error('Failed to fetch today\'s data:', error);
                    set({ isLoading: false });
                    return { success: false, message: error.message };
                }
            },

            addTask: (task, userId) => set((state) => ({
                tasks: [{
                    ...task,
                    id: Date.now(),
                    userId: userId, // Associate task with specific user ID
                    role: 'user',
                    status: task.status || 'Not Started',
                    priority: task.priority || 'Medium',
                    dueDate: 'Today',
                    estHour: task.estHour || 0,
                    estMin: task.estMin || 0,
                    timeElapsed: 0,
                    isTimerRunning: false
                }, ...state.tasks]
            })),

            removeTask: async (id) => {
                const state = get();
                const task = state.tasks.find(t => t.id === id);

                // Optimistic Update
                set((state) => ({
                    tasks: state.tasks.filter(t => t.id !== id)
                }));

                // API Call
                if (state.dailyStatusId && typeof id === 'string') {
                    try {
                        await api.post('/users/deleteTask', {
                            id: state.dailyStatusId,
                            taskId: id
                        });
                    } catch (error) {
                        console.error('Failed to delete task from backend:', error);
                    }
                }
            },

            updateTask: (id, updates) => set((state) => ({
                tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
            })),

            updateAndSyncTask: async (id, updates) => {
                // 1. Local Update
                set((state) => ({
                    tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
                }));

                // 2. API Sync
                const state = get();
                if (state.dailyStatusId) {
                    const task = state.tasks.find(t => t.id === id);
                    if (task) {
                        const backendTask = mapToBackendTask(task);
                        try {
                            await api.post('/users/updateTaskTimer', {
                                id: state.dailyStatusId,
                                task: backendTask
                            });
                        } catch (error) {
                            console.error("Failed to sync task update:", error);
                        }
                    }
                }
            },

            updateTaskStatus: (id, status) => set((state) => ({
                tasks: state.tasks.map(t => t.id === id ? { ...t, status } : t)
            })),

            toggleTimer: async (id) => {
                const state = get();
                const task = state.tasks.find(t => t.id === id);
                if (!task) return;

                const newIsRunning = !task.isTimerRunning;

                // 1. Optimistic Local Update (Visual feedback only)
                set((state) => ({
                    tasks: state.tasks.map(t => {
                        if (t.id === id) {
                            return { ...t, isTimerRunning: newIsRunning };
                        }
                        return t;
                    })
                }));

                // 2. Call API to sync single task
                const updatedState = get();
                const dailyStatusId = updatedState.dailyStatusId;

                if (dailyStatusId) {
                    try {
                        // Use the updated task data
                        const localUpdatedTask = updatedState.tasks.find(t => t.id === id);
                        const backendTask = mapToBackendTask(localUpdatedTask);

                        const response = await api.post('/users/updateTaskTimer', {
                            id: dailyStatusId,
                            task: backendTask
                        });

                        if (response.data && response.data.success && response.data.data) {
                            const serverTask = response.data.data;

                            // Merge server response back to local state
                            set((state) => ({
                                tasks: state.tasks.map(t => {
                                    if (t.id === id) {
                                        return {
                                            ...t,
                                            isTimerRunning: serverTask.isTrackerStarted,
                                            timeElapsed: serverTask.totalSeconds || 0,
                                            // Make sure we update other fields if backend cleaned them up
                                            status: serverTask.status === 'completed' ? 'Completed' :
                                                serverTask.status === 'in-progress' ? 'In Progress' :
                                                    serverTask.status === 'pending' ? 'Pending' : 'Not Started'
                                        };
                                    }
                                    return t;
                                })
                            }));
                        }

                    } catch (error) {
                        console.error("Failed to sync timer toggle:", error);
                        // Revert on failure? For now just log.
                        // Ideally we should revert the optimistic update here.
                        set((state) => ({
                            tasks: state.tasks.map(t => {
                                if (t.id === id) {
                                    return { ...t, isTimerRunning: !newIsRunning };
                                }
                                return t;
                            })
                        }));
                    }
                }
            },

            incrementTime: (id) => set((state) => ({
                tasks: state.tasks.map(t =>
                    t.id === id ? { ...t, timeElapsed: (t.timeElapsed || 0) + 1 } : t
                )
            })),

            // Start day - also calls backend API
            startDay: async (userId) => {
                // Set local state first
                set((state) => ({
                    activeSessions: { ...state.activeSessions, [userId]: Date.now() }
                }));

                // Call backend API
                try {
                    const response = await api.post('/users/startTimer', {
                        user: userId,
                        tasks: []
                    });
                    if (response.data && response.data.data) {
                        set({ dailyStatusId: response.data.data._id });
                    }
                } catch (error) {
                    console.error('Failed to start day on backend:', error);
                }
            },

            // Save tasks to backend
            syncTasksToBackend: async () => {
                const state = get();
                if (!state.dailyStatusId) {
                    console.log('No dailyStatusId, cannot sync');
                    return { success: false, message: 'Day not started' };
                }

                set({ isSyncing: true });
                try {
                    // Transform tasks to backend format
                    const backendTasks = state.tasks.map(mapToBackendTask);

                    const response = await api.post('/users/updateTasks', {
                        id: state.dailyStatusId,
                        tasks: backendTasks
                    });

                    set({ isSyncing: false });
                    return { success: true, data: response.data };
                } catch (error) {
                    console.error('Failed to sync tasks:', error);
                    set({ isSyncing: false });
                    return { success: false, message: error.message };
                }
            },

            endDay: async (userId) => {
                const state = get();

                // 1. Call backend to stop timer FIRST
                if (state.dailyStatusId) {
                    try {
                        await api.post('/users/stopTimer', { id: state.dailyStatusId });
                    } catch (err) {
                        console.error('Failed to stop timer on backend:', err);
                        throw err; // Propagate error so UI can show it
                    }
                }

                // 2. Only if backend success, update local state
                set((state) => {
                    const now = new Date();
                    const sessionStart = state.activeSessions[userId] ? new Date(state.activeSessions[userId]) : null;

                    // Filter tasks by userId
                    const userTasks = state.tasks.filter(t => t.userId === userId);
                    const otherTasks = state.tasks.filter(t => t.userId !== userId);

                    const completedTasks = userTasks.filter(t => t.status === 'Completed');
                    const ongoingTasks = userTasks.filter(t => t.status !== 'Completed');

                    // Create a history entry ONLY if there are completed tasks
                    let newHistory = state.history;
                    if (completedTasks.length > 0) {
                        const historyEntry = {
                            id: Date.now(),
                            userId: userId, // Tag history with userId
                            date: now.toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                timeZone: 'Asia/Kolkata'
                            }), // e.g., "07 Jan 2026"
                            startTime: sessionStart ? sessionStart.toLocaleTimeString('en-IN', {
                                hour: '2-digit', minute: '2-digit', hour12: true,
                                timeZone: 'Asia/Kolkata'
                            }) : '-',
                            endTime: now.toLocaleTimeString('en-IN', {
                                hour: '2-digit', minute: '2-digit', hour12: true,
                                timeZone: 'Asia/Kolkata'
                            }),
                            tasks: [...completedTasks],
                            taskCount: completedTasks.length
                        };
                        newHistory = [historyEntry, ...state.history];
                    }

                    // Clear active session
                    const newActiveSessions = { ...state.activeSessions };
                    delete newActiveSessions[userId];

                    return {
                        history: newHistory,
                        activeSessions: newActiveSessions,
                        dailyStatusId: null,
                        tasks: [...otherTasks] // Remove ALL tasks for this user (completed or not) from the view efficiently
                    };
                });

                return { success: true };
            },

            cleanupEmptyTasks: () => set((state) => ({
                tasks: state.tasks.filter(t => t.title && t.title.trim() !== "")
            })),

            getStats: (userId) => {
                const state = get();

                const userTasks = (state.tasks || []).filter(
                    (t) => userId === 'dev-default' ? true : (t.userId === userId)
                );
                const history = state.history || [];

                const countStatus = (list, status) =>
                    list.filter((t) => t.status === status).length;

                let total = userTasks.length;
                let completed = countStatus(userTasks, 'Completed');
                let pending = countStatus(userTasks, 'Pending') + countStatus(userTasks, 'Not Started');
                let inProgress = countStatus(userTasks, 'In Progress');

                history.forEach((session) => {
                    const sessionUserId = session.userId || 'dev-default'; // Handle legacy history
                    // If userId is dev-default, we simulate match to include everything
                    if ((userId === 'dev-default' || sessionUserId === userId) && session.tasks) {
                        total += session.tasks.length;
                        completed += countStatus(session.tasks, 'Completed');
                        pending += countStatus(session.tasks, 'Pending');
                        inProgress += countStatus(session.tasks, 'In Progress');
                    }
                });

                return { total, completed, pending, inProgress };
            },

            getGlobalStats: () => {
                const state = get();
                const allTasks = state.tasks || [];
                const history = state.history || [];

                const countStatus = (list, status) =>
                    list.filter((t) => t.status === status).length;

                let total = allTasks.length;
                let completed = countStatus(allTasks, 'Completed');
                let pending = countStatus(allTasks, 'Pending') + countStatus(allTasks, 'Not Started');
                let inProgress = countStatus(allTasks, 'In Progress');

                history.forEach((session) => {
                    if (session.tasks) {
                        total += session.tasks.length;
                        completed += countStatus(session.tasks, 'Completed');
                        pending += countStatus(session.tasks, 'Pending');
                        inProgress += countStatus(session.tasks, 'In Progress');
                    }
                });

                return { total, completed, pending, inProgress };
            }
        }),
        {
            name: 'focus-flow-task-storage-v4',
            getStorage: () => localStorage,
        }
    )
);
