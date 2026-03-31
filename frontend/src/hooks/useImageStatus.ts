/**
 * Polling hook for background removal status.
 *
 * Uses @tanstack/react-query's refetchInterval to poll
 * GET /api/images/{id}/status every 2 seconds while processing.
 * Stops after 150 attempts (300 seconds) with a client-side timeout.
 */

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { imagesApi, type ImageStatusResponse } from "../lib/api";

const MAX_POLL_ATTEMPTS = 150;
const POLL_INTERVAL_MS = 2000;

export interface UseImageStatusResult {
  data: ImageStatusResponse | undefined;
  isLoading: boolean;
  timedOut: boolean;
  error: Error | null;
}

export function useImageStatus(
  imageId: string | null
): UseImageStatusResult {
  const pollCount = useRef(0);
  const [timedOut, setTimedOut] = useState(false);

  // Reset state when imageId changes
  useEffect(() => {
    pollCount.current = 0;
    setTimedOut(false);
  }, [imageId]);

  const query = useQuery({
    queryKey: ["image-status", imageId],
    queryFn: async () => {
      const { data } = await imagesApi.getStatus(imageId!);
      pollCount.current += 1;

      // Check if we exceeded max polling attempts while still processing
      if (
        pollCount.current >= MAX_POLL_ATTEMPTS &&
        (data.status === "processing" || data.status === "uploaded")
      ) {
        setTimedOut(true);
      }

      return data;
    },
    enabled: !!imageId && !timedOut,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll every 2 seconds while still processing or uploaded (waiting for worker)
      if (
        (status === "processing" || status === "uploaded") &&
        pollCount.current < MAX_POLL_ATTEMPTS
      ) {
        return POLL_INTERVAL_MS;
      }
      // Stop polling when processed, failed, or max attempts reached
      return false;
    },
    retry: false,
    staleTime: 0,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    timedOut,
    error: query.error as Error | null,
  };
}
