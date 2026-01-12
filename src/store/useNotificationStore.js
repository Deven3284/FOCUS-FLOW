import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useNotificationStore = create(
    persist(
        (set, get) => ({
            notifications: [],

            addNotification: (notification) => set((state) => ({
                notifications: [{
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    readBy: [], // Array of user IDs who have read this
                    ...notification
                }, ...state.notifications]
            })),

            markAsRead: (notificationId, userId) => set((state) => ({
                notifications: state.notifications.map(n =>
                    n.id === notificationId
                        ? { ...n, readBy: [...(n.readBy || []), userId] }
                        : n
                )
            })),

            markAllAsRead: (userId) => set((state) => ({
                notifications: state.notifications.map(n => ({
                    ...n,
                    readBy: [...(new Set([...(n.readBy || []), userId]))]
                }))
            })),

            removeNotification: (id) => set((state) => ({
                notifications: state.notifications.filter(n => n.id !== id)
            })),

            clearNotifications: () => set({ notifications: [] })
        }),
        {
            name: 'focus-flow-notification-storage',
            getStorage: () => localStorage,
        }
    )
);
