import { create } from "zustand";

interface UiState {
  openModals: Record<string, boolean>;
  openModal: (key: string) => void;
  closeModal: (key: string) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  openModals: {},
  openModal: (key) =>
    set((state) => ({ openModals: { ...state.openModals, [key]: true } })),
  closeModal: (key) =>
    set((state) => ({ openModals: { ...state.openModals, [key]: false } })),
}));
