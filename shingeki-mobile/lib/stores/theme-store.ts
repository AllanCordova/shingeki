import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme } from "nativewind";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const THEME_STORAGE_KEY = "shingeki-theme";

function applyTheme(theme: Theme): void {
  colorScheme.set(theme);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next: Theme = get().theme === "dark" ? "light" : "dark";
        applyTheme(next);
        set({ theme: next });
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);
