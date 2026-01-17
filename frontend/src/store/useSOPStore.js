import { create } from 'zustand';
import api from '../services/api';

export const useSOPStore = create((set, get) => ({
    sopDocuments: [],
    isLoading: false,
    unreadCount: 0,
    selectedSOP: null,

    // Fetch all SOPs from backend (filtered by role on backend)
    fetchSOPs: async (filters = {}) => {
        set({ isLoading: true });
        try {
            const response = await api.post('/users/getSOPs', filters);
            if (response.data && response.data.data) {
                set({ sopDocuments: response.data.data.docs || [], isLoading: false });
            } else {
                set({ sopDocuments: [], isLoading: false });
            }
        } catch (error) {
            console.error("Failed to fetch SOPs:", error);
            set({ isLoading: false, sopDocuments: [] });
        }
    },

    // Create new SOP (Admin/HR only)
    addSOPDocument: async (document) => {
        try {
            // Pass the full document payload to the backend
            const response = await api.post('/users/createSOP', document);
            if (response.data && response.data.data) {
                set(state => ({
                    sopDocuments: [response.data.data, ...state.sopDocuments]
                }));
                return { success: true, data: response.data.data };
            }
            return { success: false, message: response.data?.message || 'Failed to create SOP' };
        } catch (error) {
            console.error("Failed to create SOP:", error);
            return { success: false, message: error.message };
        }
    },

    // Get SOP by ID
    getSOPById: async (id) => {
        try {
            const response = await api.post('/users/getSOPById', { id });
            if (response.data && response.data.data) {
                set({ selectedSOP: response.data.data });
                return response.data.data;
            }
            return null;
        } catch (error) {
            console.error("Failed to get SOP:", error);
            return null;
        }
    },

    // Update SOP (Admin/HR only)
    updateSOPDocument: async (id, updates) => {
        try {
            const response = await api.post('/users/updateSOP', { id, ...updates });
            if (response.data && response.data.data) {
                set(state => ({
                    sopDocuments: state.sopDocuments.map(sop =>
                        sop._id === id ? response.data.data : sop
                    )
                }));
                return { success: true, data: response.data.data };
            }
            return { success: false, message: response.data?.message };
        } catch (error) {
            console.error("Failed to update SOP:", error);
            return { success: false, message: error.message };
        }
    },

    // Delete SOP (Admin/HR only)
    deleteSOPDocument: async (id) => {
        try {
            const response = await api.post('/users/deleteSOP', { id });
            if (response.data && response.data.data) {
                set(state => ({
                    sopDocuments: state.sopDocuments.filter(sop => sop._id !== id)
                }));
                return { success: true };
            }
            return { success: false, message: response.data?.message };
        } catch (error) {
            console.error("Failed to delete SOP:", error);
            return { success: false, message: error.message };
        }
    },

    // Acknowledge SOP (user marks as seen)
    acknowledgeSOP: async (id) => {
        try {
            const response = await api.post('/users/acknowledgeSOP', { id });
            if (response.data && response.data.data) {
                set(state => ({
                    sopDocuments: state.sopDocuments.map(sop =>
                        sop._id === id ? { ...sop, status: 'acknowledged', acknowledgedAt: new Date() } : sop
                    ),
                    unreadCount: Math.max(0, state.unreadCount - 1)
                }));
                return { success: true };
            }
            return { success: false, message: response.data?.message };
        } catch (error) {
            console.error("Failed to acknowledge SOP:", error);
            return { success: false, message: error.message };
        }
    },

    // Get unread count for notifications
    fetchUnreadCount: async () => {
        try {
            const response = await api.post('/users/getUnreadSOPCount');
            if (response.data && response.data.data) {
                set({ unreadCount: response.data.data.count || 0 });
            }
        } catch (error) {
            console.error("Failed to fetch unread count:", error);
        }
    },

    // Upload SOP PDF file (returns pdfUrl and pdfName)
    uploadSOPPDF: async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await api.post('/users/uploadSOPPDF', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data && response.data.data) {
                return { success: true, data: response.data.data };
            }
            return { success: false, message: response.data?.message || 'Failed to upload PDF' };
        } catch (error) {
            console.error("Failed to upload PDF:", error);
            return { success: false, message: error.message };
        }
    },

    // Clear selected SOP
    clearSelectedSOP: () => set({ selectedSOP: null }),
}));
