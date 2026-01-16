import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMasterStore } from './useMasterStore';
import api from '../services/api';

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

            updateUserInfo: async (newInfo) => {
                const state = get();
                const { currentUser } = state;

                // 1. Handle Admin or non-DB users (Local only)
                if (!currentUser || currentUser.id === 'admin' || currentUser.id === 'dev-default') {
                    set((state) => ({
                        userInfo: { ...state.userInfo, ...newInfo },
                        currentUser: { ...state.currentUser, ...newInfo }
                    }));
                    return true;
                }

                // 2. Call API for DB users
                try {
                    const response = await api.post('/users/updateProfile', newInfo);
                    if (response.data && response.data.data) {
                        const updatedUser = response.data.data;
                        set((state) => ({
                            userInfo: {
                                ...state.userInfo,
                                name: updatedUser.name,
                                email: updatedUser.email,
                                position: updatedUser.jobTitle || updatedUser.position,
                                mobile: updatedUser.mobile,
                                profileImage: updatedUser.profileImage
                            },
                            currentUser: {
                                ...state.currentUser,
                                name: updatedUser.name,
                                email: updatedUser.email,
                                jobTitle: updatedUser.jobTitle,
                                profileImage: updatedUser.profileImage
                            }
                        }));
                        return { success: true };
                    }
                    return { success: false, message: response.data?.message || 'Update failed' };
                } catch (error) {
                    console.error("Failed to update profile:", error);
                    if (error.response?.status === 404) {
                        return { success: false, message: "Server API missing. Please RESTART the Backend Terminal." };
                    }
                    return { success: false, message: error.response?.data?.message || error.message };
                }
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

            // Login with API data - stores user data from API response
            loginWithApiData: (userData) => {
                set({
                    isAuthenticated: true,
                    role: userData.role?.toLowerCase() || 'user',
                    currentUser: {
                        id: userData.id,
                        name: userData.name,
                        email: userData.email,
                        role: userData.role,
                        jobTitle: userData.jobTitle,
                        profileImage: userData.profileImage,
                        workType: userData.workType,
                        token: userData.token
                    },
                    userInfo: {
                        name: userData.name,
                        email: userData.email,
                        position: userData.jobTitle,
                        mobile: '',
                        profileImage: userData.profileImage || ''
                    }
                });
            },

            changePassword: async (oldPassword, newPassword) => {
                const state = get();
                const { currentUser } = state;

                // 1. Handle Admin (Local)
                if (currentUser?.role === 'admin') {
                    if (state.adminCredentials.password === oldPassword) {
                        set((prev) => ({
                            adminCredentials: { ...prev.adminCredentials, password: newPassword }
                        }));
                        return true;
                    }
                    return false;
                }

                // 2. Call API for DB users
                if (currentUser && currentUser.id !== 'dev-default') {
                    try {
                        const response = await api.post('/users/changePassword', { oldPassword, newPassword });
                        return response.data && response.data.data === true;
                    } catch (error) {
                        console.error("Failed to change password:", error);
                        return false;
                    }
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
