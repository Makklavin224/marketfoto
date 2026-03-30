import { create } from "zustand";
import { authApi, type User } from "../lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name?: string) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("token"),
  isLoading: false,
  isInitialized: false,

  login: async (email, password) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem("token", data.token);
    set({ user: data.user, token: data.token });
  },

  register: async (email, password, full_name) => {
    const { data } = await authApi.register({ email, password, full_name });
    localStorage.setItem("token", data.token);
    set({ user: data.user, token: data.token });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
    window.location.href = "/auth";
  },

  initialize: async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    try {
      const { data } = await authApi.me();
      set({ user: data.user, token, isInitialized: true });
    } catch {
      localStorage.removeItem("token");
      set({ user: null, token: null, isInitialized: true });
    }
  },
}));
