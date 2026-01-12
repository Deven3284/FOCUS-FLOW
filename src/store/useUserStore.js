import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMasterStore } from './useMasterStore';

export const useUserStore = create(
    persist(
        (set, get) => ({
            isAuthenticated: false,
            hasHydrated: false,
            currentUser: null, // Store logged in user details
            role: 'user', // 'user' | 'admin'
            adminCredentials: {
                email: 'admin@focusflow.com',
                password: 'admin'
            },
            password: "deven", // Default user password
            userInfo: {
                name: "Deven",
                email: "deven@itfuturz.com",
                position: "Full Stack Developer",
                mobile: " 7990851740",
                joinDate: new Date().toISOString()
            },

            updateUserInfo: (newInfo) => {
                const state = get();
                const { currentUser } = state;

                // 1. Sync to Master Store (Global DB) if it's a real user
                if (currentUser && currentUser.id && currentUser.id !== 'admin' && currentUser.id !== 'dev-default') {
                    useMasterStore.getState().updateUser(currentUser.id, newInfo);
                }

                // 2. Update Local State (Session)
                set((state) => ({
                    userInfo: { ...state.userInfo, ...newInfo },
                    currentUser: { ...state.currentUser, ...newInfo }
                }));
            },

            login: (email, password) => {
                const state = get();

                // Check Admin
                if (email === state.adminCredentials.email && password === state.adminCredentials.password) {
                    set({
                        isAuthenticated: true,
                        role: 'admin',
                        currentUser: { id: 'admin', name: 'Admin', role: 'admin' },
                        userInfo: {
                            ...state.userInfo,
                            name: 'Admin',
                            email: 'admin@focusflow.com',
                            position: 'Administrator',
                            mobile: '',
                            profileImage: '' // Reset or set specific admin image
                        }
                    });
                    return true;
                }

                // Check Master Users
                const masterUsers = useMasterStore.getState().users;
                const foundUser = masterUsers.find(u => u.email === email && u.password === password);

                if (foundUser) {
                    set({
                        isAuthenticated: true,
                        role: foundUser.role.toLowerCase(), // Normalize role
                        currentUser: foundUser,
                        userInfo: {
                            ...state.userInfo,
                            name: foundUser.name,
                            email: foundUser.email,
                            position: foundUser.jobTitle, // Map jobTitle to position
                            mobile: foundUser.mobile,
                            profileImage: foundUser.profileImage || '' // Sync profile image from Master Store
                        }
                    });
                    return true;
                }

                // Check Default Dev User (Legacy support if needed, or remove)
                if (email === state.userInfo.email && password === state.password) {
                    set({ isAuthenticated: true, role: 'user', currentUser: { id: 'dev-default', ...state.userInfo } });
                    return true;
                }

                return false;
            },

            checkCredentials: (email, password) => {
                const state = get();
                // Check Admin
                if (email === state.adminCredentials.email && password === state.adminCredentials.password) {
                    return true; // Admin valid
                }

                // Check Master Users
                const masterUsers = useMasterStore.getState().users;
                const foundUser = masterUsers.find(u => u.email === email && u.password === password);
                if (foundUser) return true;

                // Check Default Dev User
                return email === state.userInfo.email && password === state.password;
            },

            logout: () => set({ isAuthenticated: false }),

            changePassword: (oldPassword, newPassword) => {
                const state = get();
                const { currentUser } = state;

                // 1. Handle Admin
                if (currentUser?.role === 'admin') {
                    if (state.adminCredentials.password === oldPassword) {
                        set((prev) => ({
                            adminCredentials: { ...prev.adminCredentials, password: newPassword }
                        }));
                        return true;
                    }
                    return false;
                }

                // 2. Handle Master Users & Sync
                // Check if the current user has this password
                if (currentUser && currentUser.password === oldPassword) {
                    // Update Global Master Store
                    if (currentUser.id && currentUser.id !== 'dev-default') {
                        useMasterStore.getState().updateUser(currentUser.id, { password: newPassword });
                    }

                    // Update Local State
                    set((prev) => ({
                        currentUser: { ...prev.currentUser, password: newPassword },
                        // Update legacy field if it matches
                        password: (prev.password === oldPassword) ? newPassword : prev.password
                    }));
                    return true;
                }

                // 3. Fallback for legacy default user
                if (state.password === oldPassword) {
                    set({ password: newPassword });
                    return true;
                }

                return false;
            }
        }),
        {
            name: 'focus-flow-user-storage',
            getStorage: () => localStorage,
            version: 1, // Bump version to force migration
            migrate: (persistedState, version) => {
                if (version === 0) {
                    // Start fresh if version is old
                    return {
                        isAuthenticated: false,
                        password: "admin",
                        userInfo: {
                            name: "Deven",
                            email: "deven@itfuturz.com",
                            position: "Full Stack Developer",
                            mobile: ""
                        }
                    };
                }
                return persistedState;
            },

        }
    )
);
