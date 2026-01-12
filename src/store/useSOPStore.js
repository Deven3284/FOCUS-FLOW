import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSOPStore = create(
    persist(
        (set) => ({
            sopDocuments: [],

            addSOPDocument: (document) => set((state) => ({
                sopDocuments: [{
                    ...document,
                    id: Date.now(),
                    date: document.date || new Date().toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        timeZone: 'Asia/Kolkata'
                    }),
                    visibilityType: document.visibilityType || 'ALL',
                    allowedRoles: document.allowedRoles || [],
                    allowedUsers: document.allowedUsers || [],
                    createdAt: new Date().toISOString()
                }, ...(Array.isArray(state.sopDocuments) ? state.sopDocuments : [])]
            })),

            updateSOPDocument: (id, updates) => set((state) => ({
                sopDocuments: (Array.isArray(state.sopDocuments) ? state.sopDocuments : []).map(doc =>
                    doc.id === id ? {
                        ...doc,
                        ...updates,
                        updatedAt: new Date().toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'Asia/Kolkata'
                        })
                    } : doc
                )
            })),

            deleteSOPDocument: (id) => set((state) => ({
                sopDocuments: (Array.isArray(state.sopDocuments) ? state.sopDocuments : []).filter(doc => doc.id !== id)
            }))
        }),
        {
            name: 'focus-flow-sop-storage',
            getStorage: () => localStorage,
            version: 2,
            migrate: (persistedState, version) => {
                // If version is less than 2, or state relies on undefined sopDocuments, reset it.
                if (version < 2 || !persistedState || !Array.isArray(persistedState.sopDocuments)) {
                    console.log("Migrating SOP Store to version 2: Resetting documents due to corruption/upgrade.");
                    return { ...persistedState, sopDocuments: [] };
                }
                return persistedState;
            }
        }
    )
);
