import axios from "axios";
import { useQuery } from "@tanstack/react-query";

export interface TemplateListItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  preview_url: string;
  is_premium: boolean;
  marketplace: string[];
}

interface TemplateListResponse {
  templates: TemplateListItem[];
}

interface FetchTemplatesParams {
  category?: string | null;
  marketplace?: string | null;
}

async function fetchTemplates(
  params: FetchTemplatesParams
): Promise<TemplateListItem[]> {
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set("category", params.category);
  if (params.marketplace) searchParams.set("marketplace", params.marketplace);
  const query = searchParams.toString();
  const url = `/api/templates${query ? `?${query}` : ""}`;
  const { data } = await axios.get<TemplateListResponse>(url);
  return data.templates;
}

export function useTemplates(params: FetchTemplatesParams) {
  return useQuery({
    queryKey: ["templates", params.category, params.marketplace],
    queryFn: () => fetchTemplates(params),
  });
}
