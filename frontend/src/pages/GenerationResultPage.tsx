/**
 * AI Photoshoot Result Page.
 *
 * Shows the generated product photo with download, regenerate,
 * and style change options. Credits remaining indicator.
 */

import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import { usePhotoshootStatus, aiPhotoshootApi } from "../api/aiPhotoshoot";
import { useAuthStore } from "../stores/auth";

export default function GenerationResultPage() {
  const { renderId } = useParams<{ renderId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const initialize = useAuthStore((s) => s.initialize);

  const { data: status } = usePhotoshootStatus(renderId ?? null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPNG = useCallback(async () => {
    if (!renderId) return;
    setDownloading(true);
    try {
      const { data } = await aiPhotoshootApi.download(renderId);
      // Open download URL in new tab
      const link = document.createElement("a");
      link.href = data.download_url;
      link.download = data.filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("Не удалось скачать файл");
    } finally {
      setDownloading(false);
    }
  }, [renderId]);

  const handleEditText = useCallback(() => {
    // Open fabric.js editor with the AI-generated image as background
    if (renderId) {
      navigate(`/editor?ai_image=${renderId}`);
    }
  }, [renderId, navigate]);

  const handleNewStyle = useCallback(() => {
    // Go back to style selector with the same image
    // We need image_id from the photoshoot — it's not in status response,
    // so we use history or extract from URL search params
    navigate(-2); // back past generating page to style selector
  }, [navigate]);

  const handleNewPhoto = useCallback(() => {
    navigate("/upload");
  }, [navigate]);

  const handleDashboard = useCallback(() => {
    // Refresh user data (credits may have changed)
    initialize();
    navigate("/dashboard");
  }, [navigate, initialize]);

  const isComplete = status?.status === "complete";
  const isFailed = status?.status === "failed";

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
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1
              className="heading-card"
              style={{ color: "var(--text-primary)" }}
            >
              Результат
            </h1>
          </div>
          {user && (
            <div
              className="badge badge-green text-xs"
              title="Оставшиеся карточки"
            >
              {user.credits_remaining} карт.
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-8">
        {/* Generated image preview */}
        {isComplete && status?.output_url && (
          <div className="animate-fade-in-up">
            {/* Image container */}
            <div
              className="glass-card-static overflow-hidden mb-6"
              style={{
                maxWidth: "600px",
                margin: "0 auto 1.5rem",
              }}
            >
              <img
                src={status.output_url}
                alt="AI-карточка товара"
                className="w-full h-auto object-contain"
                style={{ maxHeight: "70vh" }}
              />
            </div>

            {/* Processing time */}
            {status.processing_time_ms != null && (
              <p
                className="text-xs text-center mb-6"
                style={{ color: "var(--text-tertiary)" }}
              >
                Сгенерировано за{" "}
                {(status.processing_time_ms / 1000).toFixed(1)}с
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-col items-center gap-3 animate-fade-in-up delay-200">
              {/* Download */}
              <button
                onClick={handleDownloadPNG}
                disabled={downloading}
                className="btn-primary w-full md:w-auto text-lg py-3 px-8 cursor-pointer disabled:opacity-50"
              >
                {downloading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Скачиваем...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Скачать PNG
                  </span>
                )}
              </button>

              {/* Edit text overlay */}
              <button
                onClick={handleEditText}
                className="btn-secondary w-full md:w-auto text-base py-2.5 px-6 cursor-pointer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
                Редактировать текст
              </button>

              {/* Secondary actions row */}
              <div className="flex gap-3 flex-wrap justify-center">
                <button
                  onClick={handleNewStyle}
                  className="btn-secondary text-sm py-2.5 px-5 cursor-pointer"
                >
                  Другой стиль
                </button>
                <button
                  onClick={handleNewPhoto}
                  className="btn-secondary text-sm py-2.5 px-5 cursor-pointer"
                >
                  Новое фото
                </button>
              </div>

              <button
                onClick={handleDashboard}
                className="btn-ghost text-sm cursor-pointer mt-1"
              >
                Мои карточки
              </button>
            </div>
          </div>
        )}

        {/* Failed state (shouldn't normally reach here — GeneratingPage handles it,
            but in case user navigates directly) */}
        {isFailed && (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-in-up">
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
            <p
              className="font-semibold text-lg mb-1"
              style={{ color: "var(--red-400)" }}
            >
              Генерация не удалась
            </p>
            {status?.error_message && (
              <p
                className="text-sm mb-6 text-center max-w-md"
                style={{ color: "var(--text-tertiary)" }}
              >
                {status.error_message}
              </p>
            )}
            <button
              onClick={handleNewStyle}
              className="btn-secondary font-semibold py-2.5 px-6 cursor-pointer"
            >
              Попробовать снова
            </button>
          </div>
        )}

        {/* Loading / not yet complete */}
        {!isComplete && !isFailed && (
          <div className="flex flex-col items-center justify-center py-24">
            <div
              className="animate-spin h-8 w-8 border-4 rounded-full"
              style={{
                borderColor: "rgba(124, 58, 237, 0.2)",
                borderTopColor: "var(--purple-500)",
              }}
            />
            <p
              className="text-sm mt-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Загрузка результата...
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
