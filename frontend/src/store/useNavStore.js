import { create } from 'zustand';

export const useNavStore = create((set) => ({
    isTutorialOpen: false,
    openTutorial: () => set({ isTutorialOpen: true }),
    closeTutorial: () => set({ isTutorialOpen: false }),
}));
