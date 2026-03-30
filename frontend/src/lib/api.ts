import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// Request interceptor: attach JWT from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: redirect to /auth on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  plan: string;
  credits_remaining: number;
  subscription_expires_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Auth API functions
export const authApi = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    api.post<AuthResponse>("/auth/register", data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", data),

  me: () => api.get<{ user: User }>("/auth/me"),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/auth/forgot-password", { email }),
};
