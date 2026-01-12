import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const initialTasks = [];
const initialHistory = [];

export const useTaskStore = create(
    persist(
        (set, get) => ({

            tasks: initialTasks,
            history: initialHistory,
            historyFilterUserId: '', // State for Admin Filter on History Page
            activeSessions: {}, // { userId: timestamp }

            setHistoryFilterUserId: (id) => set({ historyFilterUserId: id }),

            addHistorySession: (session) => set((state) => ({
                history: [session, ...state.history]
            })),

            addTask: (task, userId) => set((state) => ({
                tasks: [{
                    ...task,
                    id: Date.now(),
                    userId: userId, // Associate task with specific user ID
                    role: 'user',
                    status: 'Pending',
                    priority: 'Medium',
                    dueDate: 'Today',
                    estHour: 0,
                    estMin: 0,
                    timeElapsed: 0,
                    isTimerRunning: false
                }, ...state.tasks]
            })),

            removeTask: (id) => set((state) => ({
                tasks: state.tasks.filter(t => t.id !== id)
            })),

            updateTask: (id, updates) => set((state) => ({
                tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
            })),

            updateTaskStatus: (id, status) => set((state) => ({
                tasks: state.tasks.map(t => t.id === id ? { ...t, status } : t)
            })),

            toggleTimer: (id) => set((state) => ({
                tasks: state.tasks.map(t => {
                    if (t.id === id) {
                        return { ...t, isTimerRunning: !t.isTimerRunning };
                    }
                    return t;
                })
            })),

            incrementTime: (id) => set((state) => ({
                tasks: state.tasks.map(t =>
                    t.id === id ? { ...t, timeElapsed: (t.timeElapsed || 0) + 1 } : t
                )
            })),

            startDay: (userId) => set((state) => ({
                activeSessions: { ...state.activeSessions, [userId]: Date.now() }
            })),

            endDay: (userId) => set((state) => {
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
                    tasks: [...otherTasks, ...ongoingTasks] // Keep other users' tasks and current user's ongoing tasks
                };
            }),

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
                let pending = countStatus(userTasks, 'Pending');
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
                let pending = countStatus(allTasks, 'Pending');
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
