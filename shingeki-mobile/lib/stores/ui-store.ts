import { create } from "zustand";

interface UiState {
  openModals: Record<string, boolean>;
  mobileMenuOpen: boolean;
  openModal: (key: string) => void;
  closeModal: (key: string) => void;
  toggleModal: (key: string) => void;
  isModalOpen: (key: string) => boolean;
  setMobileMenu: (open: boolean) => void;
}

export const useUiStore = create<UiState>()((set, get) => ({
  openModals: {},
  mobileMenuOpen: false,
  openModal: (key) =>
    set((state) => ({ openModals: { ...state.openModals, [key]: true } })),
  closeModal: (key) =>
    set((state) => ({ openModals: { ...state.openModals, [key]: false } })),
  toggleModal: (key) =>
    set((state) => ({
      openModals: { ...state.openModals, [key]: !state.openModals[key] },
    })),
  isModalOpen: (key) => Boolean(get().openModals[key]),
  setMobileMenu: (open) => set({ mobileMenuOpen: open }),
}));
