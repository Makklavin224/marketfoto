import api from "../lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { OverlayData } from "../types/editor";

// --- Types matching backend schemas/render.py ---

export interface RenderResponse {
  id: string;
  image_id: string;
  template_id: string;
  marketplace: string;
  output_url: string | null;
  output_width: number;
  output_height: number;
  status: "pending" | "rendering" | "complete" | "failed";
  created_at: string;
}

export interface RenderStatusResponse {
  status: "pending" | "rendering" | "complete" | "failed";
  output_url: string | null;
  error_message: string | null;
}

export interface RenderListResponse {
  renders: RenderResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateRenderRequest {
  image_id: string;
  template_id: string;
  overlay_data: OverlayData;
  marketplace: string;
}

// --- API functions ---

export const rendersApi = {
  create: (data: CreateRenderRequest) =>
    api.post<RenderResponse>("/renders", data),

  getStatus: (renderId: string) =>
    api.get<RenderStatusResponse>(`/renders/${renderId}/status`),

  list: (params?: { limit?: number; offset?: number }) =>
    api.get<RenderListResponse>("/renders", { params }),

  delete: (renderId: string) => api.delete(`/renders/${renderId}`),
};

// --- React Query hooks ---

export function useCreateRender() {
  return useMutation({
    mutationFn: (data: CreateRenderRequest) =>
      rendersApi.create(data).then((res) => res.data),
  });
}

export function useRenderStatus(renderId: string | null) {
  return useQuery({
    queryKey: ["renders", "status", renderId],
    queryFn: async () => {
      const { data } = await rendersApi.getStatus(renderId!);
      return data;
    },
    enabled: !!renderId,
    refetchInterval: (query) => {
      // Poll every 2s while pending/rendering, stop when complete/failed
      const status = query.state.data?.status;
      if (status === "complete" || status === "failed") return false;
      return 2000;
    },
  });
}

export function useRenders(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["renders", "list", params],
    queryFn: async () => {
      const { data } = await rendersApi.list(params);
      return data;
    },
  });
}
