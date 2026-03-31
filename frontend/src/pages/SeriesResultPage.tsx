/**
 * Series Result Page.
 *
 * Shows all generated cards in a grid with individual download buttons,
 * "Download All" option, and per-card regeneration.
 */

import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import { useSeriesStatus, aiPhotoshootApi } from "../api/aiPhotoshoot";
import { useAuthStore } from "../stores/auth";

const STYLE_NAMES: Record<string, string> = {
  studio_clean: "Студийный чистый",
  premium_hero: "Премиальное фото",
  lifestyle_scene: "Лайфстайл сцена",
  glass_surface: "На стеклянной поверхности",
  ingredients: "Ингредиенты",
  with_model: "С моделью",
  multi_angle: "Мульти-ракурс",
  infographic: "Инфографика",
  nine_grid: "9-сетка детали",
  creative_art: "Креативный арт",
  storyboard: "Раскадровка",
  detail_texture: "Деталь и текстура",
  seasonal: "Сезонная тема",
  minimal_flat: "Минимал flat-lay",
  unboxing: "Распаковка",
};

const STYLE_EMOJIS: Record<string, string> = {
  studio_clean: "📸",
  premium_hero: "👑",
  lifestyle_scene: "✨",
  glass_surface: "💧",
  ingredients: "🍑",
  with_model: "🧑",
  multi_angle: "🔄",
  infographic: "📊",
  nine_grid: "🔍",
  creative_art: "🎨",
  storyboard: "🎬",
  detail_texture: "🔬",
  seasonal: "🌸",
  minimal_flat: "⬜",
  unboxing: "📦",
};

export default function SeriesResultPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const initialize = useAuthStore((s) => s.initialize);

  const { data: seriesStatus } = useSeriesStatus(seriesId ?? null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadSingle = useCallback(async (renderId: string) => {
    setDownloadingId(renderId);
    try {
      const { data } = await aiPhotoshootApi.download(renderId);
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
      setDownloadingId(null);
    }
  }, []);

  const handleDownloadAll = useCallback(async () => {
    if (!seriesStatus) return;
    setDownloadingAll(true);

    const completeRenders = seriesStatus.renders.filter(
      (r) => r.status === "complete"
    );

    try {
      // Download each file sequentially with a small delay
      for (let i = 0; i < completeRenders.length; i++) {
        const render = completeRenders[i];
        const { data } = await aiPhotoshootApi.download(render.id);
        const link = document.createElement("a");
        link.href = data.download_url;
        link.download = data.filename;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Small delay between downloads to avoid browser blocking
        if (i < completeRenders.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      toast.success(`Скачано ${completeRenders.length} карточек`);
    } catch {
      toast.error("Не удалось скачать все файлы");
    } finally {
      setDownloadingAll(false);
    }
  }, [seriesStatus]);

  const handleNewPhoto = useCallback(() => {
    navigate("/upload");
  }, [navigate]);

  const handleDashboard = useCallback(() => {
    initialize();
    navigate("/dashboard");
  }, [navigate, initialize]);

  const completedRenders = seriesStatus?.renders.filter(
    (r) => r.status === "complete"
  ) ?? [];
  const failedRenders = seriesStatus?.renders.filter(
    (r) => r.status === "failed"
  ) ?? [];

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
              Серия <span className="text-gradient">готова</span>
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {completedRenders.length} из {seriesStatus?.total ?? 0} карточек
              {failedRenders.length > 0 && ` (${failedRenders.length} не удалось)`}
            </p>
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
        {/* Download all button */}
        {completedRenders.length > 0 && (
          <div className="mb-6 animate-fade-in-up">
            <button
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              className="btn-primary w-full md:w-auto text-base py-3 px-6 cursor-pointer disabled:opacity-50"
            >
              {downloadingAll ? (
                <span className="flex items-center justify-center gap-2">
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
                  Скачать все ({completedRenders.length})
                </span>
              )}
            </button>
          </div>
        )}

        {/* Cards grid */}
        {seriesStatus && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {seriesStatus.renders.map((render, i) => {
              const styleName = STYLE_NAMES[render.style] || render.style;
              const emoji = STYLE_EMOJIS[render.style] || "🖼️";
              const isComplete = render.status === "complete";
              const isFailed = render.status === "failed";
              const isDownloading = downloadingId === render.id;

              return (
                <div
                  key={render.id}
                  className="glass-card-static overflow-hidden animate-fade-in-up"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    border: isFailed
                      ? "1px solid rgba(239, 68, 68, 0.2)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Image preview */}
                  {isComplete && render.output_url ? (
                    <div
                      style={{
                        position: "relative",
                        paddingBottom: "100%",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={render.output_url}
                        alt={styleName}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                  ) : isFailed ? (
                    <div
                      className="flex flex-col items-center justify-center"
                      style={{
                        paddingBottom: "0",
                        height: "200px",
                        background: "rgba(239, 68, 68, 0.04)",
                      }}
                    >
                      <svg
                        className="h-8 w-8 mb-2"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        style={{ color: "var(--red-400)" }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {render.error_message || "Генерация не удалась"}
                      </p>
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-center"
                      style={{
                        height: "200px",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div
                        className="animate-spin h-6 w-6 border-3 rounded-full"
                        style={{
                          borderColor: "rgba(124, 58, 237, 0.2)",
                          borderTopColor: "var(--purple-500)",
                        }}
                      />
                    </div>
                  )}

                  {/* Card footer */}
                  <div
                    className="flex items-center justify-between px-3 py-2.5"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{emoji}</span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {styleName}
                      </span>
                    </div>

                    {isComplete && (
                      <button
                        onClick={() => handleDownloadSingle(render.id)}
                        disabled={isDownloading}
                        className="cursor-pointer transition-all disabled:opacity-50"
                        style={{
                          padding: "0.375rem 0.75rem",
                          borderRadius: "var(--radius-md)",
                          background: "rgba(124, 58, 237, 0.1)",
                          border: "1px solid rgba(124, 58, 237, 0.2)",
                          color: "var(--purple-400)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                        title="Скачать"
                      >
                        {isDownloading ? (
                          <svg
                            className="animate-spin h-3.5 w-3.5"
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
                        ) : (
                          <svg
                            width="14"
                            height="14"
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
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Secondary actions */}
        <div className="flex flex-col items-center gap-3 animate-fade-in-up delay-400">
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={handleNewPhoto}
              className="btn-secondary text-sm py-2.5 px-5 cursor-pointer"
            >
              Новое фото
            </button>
            <button
              onClick={() => navigate(-3)}
              className="btn-secondary text-sm py-2.5 px-5 cursor-pointer"
            >
              Другой стиль
            </button>
          </div>
          <button
            onClick={handleDashboard}
            className="btn-ghost text-sm cursor-pointer mt-1"
          >
            Мои карточки
          </button>
        </div>
      </main>
    </div>
  );
}
