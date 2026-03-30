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

// --- Image types ---
export interface ImageRecord {
  id: string;
  original_url: string;
  processed_url: string | null;
  status: "uploaded" | "processing" | "processed" | "failed";
  original_width: number;
  original_height: number;
  original_filename: string;
  original_size: number;
  processing_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface ImageStatusResponse {
  status: "uploaded" | "processing" | "processed" | "failed";
  processed_url: string | null;
  error_message: string | null;
}

// --- Images API ---
export const imagesApi = {
  upload: (file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<ImageRecord>("/images/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
  },

  get: (imageId: string) => api.get<ImageRecord>(`/images/${imageId}`),

  getStatus: (imageId: string) =>
    api.get<ImageStatusResponse>(`/images/${imageId}/status`),

  delete: (imageId: string) => api.delete(`/images/${imageId}`),
};
