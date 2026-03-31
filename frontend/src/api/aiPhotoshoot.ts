import api from "../lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";

// --- Types matching backend schemas/ai_photoshoot.py ---

export interface StylePreset {
  id: string;
  name: string;
  description: string;
}

export interface StylesListResponse {
  styles: StylePreset[];
}

export interface PhotoshootResponse {
  id: string;
  image_id: string;
  style: string;
  marketplace: string;
  output_url: string | null;
  output_width: number;
  output_height: number;
  status: "pending" | "generating" | "complete" | "failed";
  processing_time_ms: number | null;
  created_at: string;
}

export interface PhotoshootStatusResponse {
  status: "pending" | "generating" | "complete" | "failed";
  output_url: string | null;
  error_message: string | null;
  processing_time_ms: number | null;
}

export interface CreatePhotoshootRequest {
  image_id: string;
  style: string;
  marketplace: string;
}

// --- API functions ---

export const aiPhotoshootApi = {
  getStyles: () =>
    api.get<StylesListResponse>("/ai-photoshoot/styles"),

  generate: (data: CreatePhotoshootRequest) =>
    api.post<PhotoshootResponse>("/ai-photoshoot/generate", data),

  getStatus: (renderId: string) =>
    api.get<PhotoshootStatusResponse>(`/ai-photoshoot/${renderId}/status`),

  download: (renderId: string) =>
    api.get<{ download_url: string; filename: string }>(
      `/ai-photoshoot/${renderId}/download`
    ),
};

// --- React Query hooks ---

export function useAIStyles() {
  return useQuery({
    queryKey: ["ai-photoshoot", "styles"],
    queryFn: async () => {
      const { data } = await aiPhotoshootApi.getStyles();
      return data.styles;
    },
    staleTime: Infinity, // Styles don't change
  });
}

export function useCreatePhotoshoot() {
  return useMutation({
    mutationFn: (data: CreatePhotoshootRequest) =>
      aiPhotoshootApi.generate(data).then((res) => res.data),
  });
}

export function usePhotoshootStatus(renderId: string | null) {
  return useQuery({
    queryKey: ["ai-photoshoot", "status", renderId],
    queryFn: async () => {
      const { data } = await aiPhotoshootApi.getStatus(renderId!);
      return data;
    },
    enabled: !!renderId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "complete" || status === "failed") return false;
      return 2000; // Poll every 2s while pending/generating
    },
  });
}
