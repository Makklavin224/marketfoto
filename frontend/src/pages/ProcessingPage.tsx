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
    navigate(`/styles?image=${imageId}`);
  }, [navigate, imageId]);

  const handleUploadAnother = useCallback(() => {
    navigate("/upload");
  }, [navigate]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="bg-mesh" />

      {/* Header */}
      <header
        className="relative z-10"
        style={{
          borderBottom: "var(--border-subtle)",
          background: "rgba(9, 9, 11, 0.8)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto max-w-4xl px-6 py-4">
          <h1 className="heading-card" style={{ color: "var(--text-primary)" }}>
            Удаление фона
          </h1>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        {/* State 1: Processing */}
        {isProcessing && !isFailed && (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-in-up">
            {/* Spinner with purple glow */}
            <div
              className="relative mb-8"
            >
              {/* Outer glow ring */}
              <div
                className="absolute inset-0 rounded-full animate-pulse-glow"
                style={{
                  width: "80px",
                  height: "80px",
                  top: "-4px",
                  left: "-4px",
                }}
              />
              <div
                className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full"
                style={{
                  background: "rgba(124, 58, 237, 0.12)",
                  border: "2px solid rgba(124, 58, 237, 0.25)",
                }}
              >
                <svg
                  className="animate-spin h-8 w-8"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  style={{ color: "var(--purple-400)" }}
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
              </div>
            </div>
            <p className="text-lg font-semibold font-display" style={{ color: "var(--text-primary)" }}>
              Убираем фон...
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--text-tertiary)" }}>
              Это занимает несколько секунд
            </p>
          </div>
        )}

        {/* State 2: Processed */}
        {isProcessed && !isFailed && (
          <div className="animate-fade-in-up">
            <BackgroundPreview
              originalUrl={image?.original_url ?? ""}
              processedUrl={statusData?.processed_url ?? image?.processed_url ?? ""}
              processingTimeMs={statusData?.processing_time_ms ?? image?.processing_time_ms ?? undefined}
              onNext={handleNext}
              onUploadAnother={handleUploadAnother}
            />
          </div>
        )}

        {/* State 3: Error / Timeout */}
        {isFailed && (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-in-up">
            {/* Error icon */}
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full mb-6"
              style={{ background: "rgba(239, 68, 68, 0.1)" }}
            >
              <svg
                className="h-8 w-8"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                style={{ color: "var(--red-400)" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="font-semibold text-lg mb-1" style={{ color: "var(--red-400)" }}>
              Не удалось обработать
            </p>
            {errorMessage && (
              <p className="text-sm mb-6 text-center max-w-md" style={{ color: "var(--text-tertiary)" }}>
                {errorMessage}
              </p>
            )}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleRetry}
                className="btn-secondary font-semibold py-2.5 px-6 cursor-pointer"
                style={{ borderColor: "rgba(239, 68, 68, 0.3)", color: "var(--red-400)" }}
              >
                Попробовать снова
              </button>
              <button
                onClick={handleUploadAnother}
                className="btn-ghost text-sm cursor-pointer"
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
