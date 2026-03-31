import api from "../lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";

// --- Types matching backend schemas/ai_photoshoot.py ---

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export interface SeriesPreset {
  id: string;
  name: string;
  description: string;
  card_count: number;
  styles: string[];
}

export interface StylesListResponse {
  styles: StylePreset[];
  series: SeriesPreset[];
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
  product_info: {
    title?: string;
    features?: string[];
    badge?: string;
  } | null;
  series_id: string | null;
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
  title?: string;
  features?: string[];
  badge?: string;
}

export interface CreateSeriesRequest {
  image_id: string;
  series: string;
  marketplace: string;
  title?: string;
  features?: string[];
  badge?: string;
}

export interface SeriesRenderItem {
  id: string;
  style: string;
  status: string;
}

export interface SeriesResponse {
  series_id: string;
  renders: SeriesRenderItem[];
}

export interface SeriesStatusRenderItem {
  id: string;
  style: string;
  status: "pending" | "generating" | "complete" | "failed";
  output_url: string | null;
  error_message: string | null;
  processing_time_ms: number | null;
}

export interface SeriesStatusResponse {
  series_id: string;
  total: number;
  completed: number;
  failed: number;
  renders: SeriesStatusRenderItem[];
}

export interface SuggestRequest {
  image_id: string;
}

export interface SuggestResponse {
  title: string;
  features: string[];
}

// --- API functions ---

export const aiPhotoshootApi = {
  getStyles: () =>
    api.get<StylesListResponse>("/ai-photoshoot/styles"),

  generate: (data: CreatePhotoshootRequest) =>
    api.post<PhotoshootResponse>("/ai-photoshoot/generate", data),

  generateSeries: (data: CreateSeriesRequest) =>
    api.post<SeriesResponse>("/ai-photoshoot/generate-series", data),

  suggest: (data: SuggestRequest) =>
    api.post<SuggestResponse>("/ai-photoshoot/suggest", data),

  getStatus: (renderId: string) =>
    api.get<PhotoshootStatusResponse>(`/ai-photoshoot/${renderId}/status`),

  getSeriesStatus: (seriesId: string) =>
    api.get<SeriesStatusResponse>(`/ai-photoshoot/series/${seriesId}/status`),

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
      return data;
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

export function useCreateSeries() {
  return useMutation({
    mutationFn: (data: CreateSeriesRequest) =>
      aiPhotoshootApi.generateSeries(data).then((res) => res.data),
  });
}

export function useSuggestProductInfo() {
  return useMutation({
    mutationFn: (data: SuggestRequest) =>
      aiPhotoshootApi.suggest(data).then((res) => res.data),
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

export function useSeriesStatus(seriesId: string | null) {
  return useQuery({
    queryKey: ["ai-photoshoot", "series-status", seriesId],
    queryFn: async () => {
      const { data } = await aiPhotoshootApi.getSeriesStatus(seriesId!);
      return data;
    },
    enabled: !!seriesId,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return 2000;
      // Stop polling when all are done (complete or failed)
      if (d.completed + d.failed >= d.total) return false;
      return 2000;
    },
  });
}
