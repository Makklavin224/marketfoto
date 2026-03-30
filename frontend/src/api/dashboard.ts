import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

// --- Types matching backend schemas ---

export interface DashboardStats {
  plan: string;
  credits_remaining: number;
  credits_total: number;
  renders_this_month: number;
  renders_total: number;
  subscription_expires_at: string | null;
}

export interface RenderItem {
  id: string;
  image_id: string;
  template_id: string;
  marketplace: string;
  output_url: string | null;
  output_width: number;
  output_height: number;
  created_at: string;
}

interface RenderListResponse {
  renders: RenderItem[];
  total: number;
  limit: number;
  offset: number;
}

// --- API functions ---

async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>("/dashboard/stats");
  return data;
}

async function fetchRenders(
  limit: number,
  offset: number
): Promise<RenderListResponse> {
  const { data } = await api.get<RenderListResponse>("/renders", {
    params: { limit, offset },
  });
  return data;
}

export async function deleteRender(renderId: string): Promise<void> {
  await api.delete(`/renders/${renderId}`);
}

export async function downloadRender(
  renderId: string
): Promise<{ download_url: string; filename: string }> {
  const { data } = await api.get<{ download_url: string; filename: string }>(
    `/renders/${renderId}/download`
  );
  return data;
}

// --- React Query hooks ---

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: fetchDashboardStats,
    staleTime: 30_000,
  });
}

export function useRenders(limit: number, offset: number) {
  return useQuery({
    queryKey: ["renders", limit, offset],
    queryFn: () => fetchRenders(limit, offset),
    placeholderData: (prev) => prev,
  });
}
