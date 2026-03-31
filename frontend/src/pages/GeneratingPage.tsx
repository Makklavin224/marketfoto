/**
 * AI Photoshoot Generation Progress Page.
 *
 * Polls GET /api/ai-photoshoot/{renderId}/status every 2s.
 * Shows spinner while generating, redirects to result on complete,
 * shows error with retry option on failure.
 */

import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { usePhotoshootStatus } from "../api/aiPhotoshoot";

const TIPS = [
  "AI анализирует ваш товар и подбирает идеальное освещение...",
  "Gemini создаёт профессиональную сцену для вашего продукта...",
  "Финальная обработка: цвета, тени, композиция...",
];

export default function GeneratingPage() {
  const { renderId } = useParams<{ renderId: string }>();
  const navigate = useNavigate();

  const { data: status } = usePhotoshootStatus(renderId ?? null);

  // Navigate to result when complete
  useEffect(() => {
    if (status?.status === "complete") {
      navigate(`/result/${renderId}`, { replace: true });
    }
  }, [status?.status, renderId, navigate]);

  const isFailed = status?.status === "failed";
  const isGenerating = !isFailed && status?.status !== "complete";

  // Rotating tip based on time
  const tipIndex = Math.floor(Date.now() / 5000) % TIPS.length;

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="bg-mesh" />

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        {/* Generating state */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-in-up">
            {/* Animated glow ring */}
            <div className="relative mb-8">
              <div
                className="absolute inset-0 rounded-full animate-pulse-glow"
                style={{
                  width: "96px",
                  height: "96px",
                  top: "-8px",
                  left: "-8px",
                }}
              />
              <div
                className="relative flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background: "rgba(124, 58, 237, 0.12)",
                  border: "2px solid rgba(124, 58, 237, 0.25)",
                }}
              >
                <svg
                  className="animate-spin h-10 w-10"
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

            <p
              className="text-xl font-semibold font-display mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              AI генерирует карточку
            </p>
            <p
              className="text-sm mb-6 text-center max-w-md"
              style={{ color: "var(--text-tertiary)" }}
            >
              {TIPS[tipIndex]}
            </p>

            {/* Progress hint */}
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: "rgba(124, 58, 237, 0.08)",
                border: "1px solid rgba(124, 58, 237, 0.15)",
              }}
            >
              <div className="glow-dot" />
              <span
                className="text-xs font-medium"
                style={{ color: "var(--purple-400)" }}
              >
                Обычно занимает 10-30 секунд
              </span>
            </div>
          </div>
        )}

        {/* Failed state */}
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
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleGoBack}
                className="btn-secondary font-semibold py-2.5 px-6 cursor-pointer"
                style={{
                  borderColor: "rgba(124, 58, 237, 0.3)",
                  color: "var(--purple-400)",
                }}
              >
                Выбрать другой стиль
              </button>
              <button
                onClick={() => navigate("/upload")}
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
