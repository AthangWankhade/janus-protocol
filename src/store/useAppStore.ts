import { create } from "zustand";

interface AppState {
  isVaultUnlocked: boolean;
  unlockVault: () => void;
  lockVault: () => void;
  currentQuiz: any;
  setCurrentQuiz: (quiz: any) => void;
  isInteractionActive: boolean; // <--- NEW: To prevent auto-lock during media picker
  setInteractionActive: (active: boolean) => void;
  backgroundPattern: string;
  setBackgroundPattern: (pattern: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isVaultUnlocked: false,
  unlockVault: () => set({ isVaultUnlocked: true }),
  lockVault: () => set({ isVaultUnlocked: false }),
  currentQuiz: null,
  setCurrentQuiz: (quiz) => set({ currentQuiz: quiz }),
  isInteractionActive: false,
  setInteractionActive: (active) => set({ isInteractionActive: active }),
  backgroundPattern: "none",
  setBackgroundPattern: (pattern) => set({ backgroundPattern: pattern }),
}));
