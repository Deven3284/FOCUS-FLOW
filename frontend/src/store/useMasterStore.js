import { create } from 'zustand';
import api from '../services/api';

export const useMasterStore = create((set, get) => ({
    users: [],
    isLoading: false,

    fetchUsers: async () => {
        set({ isLoading: true });
        try {
            const response = await api.post('/users/getAllUsers');
            if (response.data && response.data.data) {
                const mappedUsers = response.data.data.map(u => ({
                    id: u._id,
                    name: u.name,
                    role: u.role === 'admin' ? 'Admin' : 'Developer', // Normalize role
                    email: u.email,
                    mobile: u.mobile,
                    workType: u.workType,
                    status: u.isActive ? 'Active' : 'Inactive'
                }));
                set({ users: mappedUsers, isLoading: false });
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
            set({ isLoading: false });
        }
    },

    // Legacy actions (kept to avoid breaking other UI components that might call them, though they update local state only)
    addUser: (user) => set((state) => ({
        users: [...state.users, { ...user, id: Date.now() }]
    })),

    updateUser: (id, updatedUser) => set((state) => ({
        users: state.users.map(user => user.id === id ? { ...user, ...updatedUser } : user)
    })),

    deleteUser: (id) => set((state) => ({
        users: state.users.filter(user => user.id !== id)
    })),
}));
