import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AppState {
  isVaultUnlocked: boolean;
  unlockVault: () => void;
  lockVault: () => void;
  currentQuiz: any;
  setCurrentQuiz: (quiz: any) => void;
  isInteractionActive: boolean;
  setInteractionActive: (active: boolean) => void;
  backgroundPattern: string;
  setBackgroundPattern: (pattern: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isVaultUnlocked: false,
      unlockVault: () => set({ isVaultUnlocked: true }),
      lockVault: () => set({ isVaultUnlocked: false }),
      currentQuiz: null,
      setCurrentQuiz: (quiz) => set({ currentQuiz: quiz }),
      isInteractionActive: false,
      setInteractionActive: (active) => set({ isInteractionActive: active }),
      backgroundPattern: "none",
      setBackgroundPattern: (pattern) => set({ backgroundPattern: pattern }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ backgroundPattern: state.backgroundPattern }), // Only persist theme
    }
  )
);
