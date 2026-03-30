/**
 * Processing page: orchestrates background removal states.
 *
 * States:
 * 1. Processing: spinner + "Убираем фон..." text
 * 2. Processed: BackgroundPreview with original (left) vs processed (right)
 * 3. Error/Timeout: red error text + retry button
 *
 * Auto-triggers POST /remove-background on mount if image is in "uploaded" state.
 * Polls GET /status every 2 seconds via useImageStatus hook.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { imagesApi } from "../lib/api";
import { useImageStatus } from "../hooks/useImageStatus";
import BackgroundPreview from "../components/BackgroundPreview";

export default function ProcessingPage() {
  const { imageId } = useParams<{ imageId: string }>();
  const navigate = useNavigate();
  const triggerSent = useRef(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  // Fetch the full image record once to get original_url
  const imageQuery = useQuery({
    queryKey: ["image", imageId],
    queryFn: async () => {
      const { data } = await imagesApi.get(imageId!);
      return data;
    },
    enabled: !!imageId,
    staleTime: Infinity,
  });

  const image = imageQuery.data;

  // Auto-trigger background removal on mount if status is "uploaded"
  useEffect(() => {
    if (!imageId || !image || triggerSent.current) return;
    if (image.status === "uploaded") {
      triggerSent.current = true;
      imagesApi.removeBackground(imageId).catch((err) => {
        const msg =
          err?.response?.data?.detail ||
          err?.message ||
          "Не удалось запустить обработку";
        setTriggerError(msg);
      });
    }
  }, [imageId, image]);

  // Poll status every 2 seconds
  const { data: statusData, timedOut } = useImageStatus(
    image && (image.status === "processing" || image.status === "uploaded")
      ? imageId ?? null
      : imageId ?? null
  );

  // Determine current display status
  const currentStatus = statusData?.status ?? image?.status ?? "processing";
  const isProcessing = currentStatus === "processing" || currentStatus === "uploaded";
  const isProcessed = currentStatus === "processed";
  const isFailed = currentStatus === "failed" || timedOut || !!triggerError;

  const errorMessage =
    triggerError ||
    (timedOut ? "Время обработки истекло. Попробуйте ещё раз." : null) ||
    statusData?.error_message ||
    image?.error_message;

  // Retry: reset trigger and re-enqueue
  const handleRetry = useCallback(async () => {
    if (!imageId) return;
    triggerSent.current = false;
    setTriggerError(null);
    try {
      await imagesApi.removeBackground(imageId);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      setTriggerError(
        error?.response?.data?.detail || error?.message || "Не удалось запустить обработку"
      );
    }
  }, [imageId]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    navigate("/templates");
  }, [navigate]);

  const handleUploadAnother = useCallback(() => {
    navigate("/upload");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-semibold text-gray-900">
            Удаление фона
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* State 1: Processing */}
        {isProcessing && !isFailed && (
          <div className="flex flex-col items-center justify-center py-24">
            {/* Spinner */}
            <svg
              className="animate-spin h-12 w-12 text-green-600 mb-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-900">
              Убираем фон...
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Это занимает несколько секунд
            </p>
          </div>
        )}

        {/* State 2: Processed */}
        {isProcessed && !isFailed && (
          <BackgroundPreview
            originalUrl={image?.original_url ?? ""}
            processedUrl={statusData?.processed_url ?? ""}
            processingTimeMs={statusData?.processing_time_ms ?? undefined}
            onNext={handleNext}
            onUploadAnother={handleUploadAnother}
          />
        )}

        {/* State 3: Error / Timeout */}
        {isFailed && (
          <div className="flex flex-col items-center justify-center py-24">
            {/* Error icon */}
            <svg
              className="h-12 w-12 text-red-500 mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-600 font-medium text-lg mb-1">
              Не удалось обработать
            </p>
            {errorMessage && (
              <p className="text-red-500 text-sm mb-6 text-center max-w-md">
                {errorMessage}
              </p>
            )}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleRetry}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors cursor-pointer"
              >
                Попробовать снова
              </button>
              <button
                onClick={handleUploadAnother}
                className="text-gray-500 hover:text-gray-700 text-sm cursor-pointer"
              >
                Загрузить другое фото
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
