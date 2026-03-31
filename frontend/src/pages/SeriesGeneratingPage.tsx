/**
 * Series Generation Progress Page.
 *
 * Polls GET /api/ai-photoshoot/series/{seriesId}/status every 2s.
 * Shows progress for all cards in the series.
 * When all done -> navigate to series result page.
 */

import { useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useSeriesStatus } from "../api/aiPhotoshoot";

// Style name lookup for display
const STYLE_NAMES: Record<string, string> = {
  hero: "Главное фото",
  lifestyle: "Лайфстайл сцена",
  creative: "Креативная съёмка",
  closeup: "Макро-детали",
  ingredients: "С ингредиентами",
  white_clean: "Белый фон",
};

const STYLE_EMOJIS: Record<string, string> = {
  hero: "📸",
  lifestyle: "🏡",
  creative: "🎨",
  closeup: "🔍",
  ingredients: "🌿",
  white_clean: "⬜",
};

export default function SeriesGeneratingPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();

  const { data: seriesStatus } = useSeriesStatus(seriesId ?? null);

  // Navigate to result when all complete
  useEffect(() => {
    if (!seriesStatus) return;
    if (seriesStatus.completed + seriesStatus.failed >= seriesStatus.total) {
      navigate(`/series-result/${seriesId}`, { replace: true });
    }
  }, [seriesStatus, seriesId, navigate]);

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const total = seriesStatus?.total ?? 0;
  const completed = seriesStatus?.completed ?? 0;
  const failed = seriesStatus?.failed ?? 0;
  const progressPercent = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="bg-mesh" />

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-col items-center justify-center py-12 animate-fade-in-up">
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
              <span className="text-3xl">{completed}/{total}</span>
            </div>
          </div>

          <p
            className="text-xl font-semibold font-display mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Генерируем серию карточек
          </p>
          <p
            className="text-sm mb-6 text-center max-w-md"
            style={{ color: "var(--text-tertiary)" }}
          >
            AI создаёт {total} карточек для вашего товара...
          </p>

          {/* Progress bar */}
          <div
            className="w-full max-w-md mb-8 rounded-full overflow-hidden"
            style={{
              height: "8px",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background: "var(--gradient-primary)",
              }}
            />
          </div>

          {/* Card status list */}
          <div className="w-full max-w-md flex flex-col gap-2">
            {seriesStatus?.renders.map((render) => {
              const styleName = STYLE_NAMES[render.style] || render.style;
              const emoji = STYLE_EMOJIS[render.style] || "🖼️";
              const isComplete = render.status === "complete";
              const isFailed = render.status === "failed";
              const isGenerating = render.status === "generating";
              const isPending = render.status === "pending";

              return (
                <div
                  key={render.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                  style={{
                    background: isComplete
                      ? "rgba(34, 197, 94, 0.06)"
                      : isFailed
                      ? "rgba(239, 68, 68, 0.06)"
                      : "rgba(255,255,255,0.03)",
                    border: isComplete
                      ? "1px solid rgba(34, 197, 94, 0.15)"
                      : isFailed
                      ? "1px solid rgba(239, 68, 68, 0.15)"
                      : isGenerating
                      ? "1px solid rgba(124, 58, 237, 0.2)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span className="text-lg">{emoji}</span>
                  <span
                    className="text-sm font-medium flex-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {styleName}
                  </span>

                  {/* Status indicator */}
                  {isPending && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      В очереди
                    </span>
                  )}
                  {isGenerating && (
                    <span className="flex items-center gap-1.5">
                      <svg
                        className="animate-spin h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
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
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      <span
                        className="text-xs"
                        style={{ color: "var(--purple-400)" }}
                      >
                        Генерация...
                      </span>
                    </span>
                  )}
                  {isComplete && (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: "rgb(34, 197, 94)" }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {isFailed && (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: "rgb(239, 68, 68)" }}
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time hint */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full mt-6"
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
              Обычно {total * 15}-{total * 30} секунд на серию
            </span>
          </div>

          {/* Cancel */}
          <button
            onClick={handleGoBack}
            className="btn-ghost text-sm cursor-pointer mt-6"
          >
            Назад
          </button>
        </div>
      </main>
    </div>
  );
}
