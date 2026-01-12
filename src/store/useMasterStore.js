import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useMasterStore = create(
    persist(
        (set, get) => ({
            users: [
                { id: 1, name: "Jagannath", jobTitle: "Angular Developer", role: "Admin", email: "jagannath@itfuturz.com", mobile: "", password: "itf#123", workType: "Onsite", status: "Active" },
                { id: 2, name: "dashan", jobTitle: "Node JS Developer", role: "Developer", email: "darshan@itfuturz.com", mobile: "", password: "darshan#12", workType: "Onsite", status: "Active" },
                { id: 3, name: "Deven", jobTitle: "Intern Mern Stack", role: "Developer", email: "deven@itfuturz.com", mobile: "", password: "Deven#12", workType: "Onsite", status: "Active" },
                { id: 4, name: "Nishit", jobTitle: ".Net Developer", role: "Developer", email: "nishit@itfuturz.com", mobile: "", password: "nishit#12", workType: "Remote", status: "Active" },
                { id: 5, name: "Nikhil", jobTitle: "Ios Developer", role: "Developer", email: "nikhil@itfuturz.com", mobile: "", password: "nikhil#12", workType: "Remote", status: "Active" },
                { id: 6, name: "Madhav", jobTitle: "Human Resource Specilist", role: "HR", email: "madhav@itfuturz.com", mobile: "", password: "madhav#12", workType: "Onsite", status: "Active" }
                // { id:7,  name: "Arpit'", jobTitle: "Senior Developer" ,role: "CEO Founder", email: "arpit@itfuturz.com", mobile: "", password: "arpit#12", workType: "Onsite", status: "Active"}
            ],

            addUser: (user) => set((state) => ({
                users: [...state.users, { ...user, id: Date.now() }]
            })),

            updateUser: (id, updatedUser) => set((state) => ({
                users: state.users.map(user => user.id === id ? { ...user, ...updatedUser } : user)
            })),

            deleteUser: (id) => set((state) => ({
                users: state.users.filter(user => user.id !== id)
            })),
        }),
        {
            name: 'focus-flow-master-storage',
            getStorage: () => localStorage,
            version: 2, // Increment version to force reload
            migrate: (persistedState, version) => {
                if (version < 2) {
                    // Force state reset to new defaults if version is old
                    return undefined;
                }
                return persistedState;
            }
        }
    )
);
