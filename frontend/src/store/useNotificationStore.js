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
                    dismissedBy: [], // Array of user IDs who have dismissed this
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

            // Dismiss notification for a specific user (doesn't remove it globally)
            dismissNotification: (notificationId, userId) => set((state) => ({
                notifications: state.notifications.map(n =>
                    n.id === notificationId
                        ? { ...n, dismissedBy: [...(new Set([...(n.dismissedBy || []), userId]))] }
                        : n
                )
            })),

            // Only for complete removal (admin only, if needed)
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
