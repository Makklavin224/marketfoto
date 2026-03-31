/**
 * AI Photoshoot Style Selector Page.
 *
 * User picks a marketplace (WB/Ozon/YM), an AI style preset,
 * and hits "Generate" to create a professional product photo with Gemini.
 *
 * Navigation: ProcessingPage (BackgroundPreview "Далее") → here → GeneratingPage → ResultPage
 */

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import toast from "react-hot-toast";
import { useAIStyles, useCreatePhotoshoot } from "../api/aiPhotoshoot";
import { useAuthStore } from "../stores/auth";

// Style card gradients and icons for visual differentiation
const STYLE_VISUALS: Record<string, { gradient: string; icon: string }> = {
  studio: {
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    icon: "📸",
  },
  lifestyle: {
    gradient: "linear-gradient(135deg, #2d1b3d 0%, #44318d 50%, #3a1078 100%)",
    icon: "✨",
  },
  minimal: {
    gradient: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #404040 100%)",
    icon: "⬜",
  },
  creative: {
    gradient: "linear-gradient(135deg, #3d1b2d 0%, #6b1d5e 50%, #9b2335 100%)",
    icon: "🎨",
  },
  infographic: {
    gradient: "linear-gradient(135deg, #1b2d3d 0%, #1d4e6b 50%, #23659b 100%)",
    icon: "📊",
  },
};

const MARKETPLACES = [
  { value: "wb", label: "Wildberries", size: "900x1200", badge: "badge-wb" },
  { value: "ozon", label: "Ozon", size: "1200x1200", badge: "badge-ozon" },
  { value: "ym", label: "Яндекс Маркет", size: "800x800", badge: "badge-ym" },
];

export default function StyleSelectorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const imageId = searchParams.get("image");
  const user = useAuthStore((s) => s.user);

  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedMarketplace, setSelectedMarketplace] = useState("wb");

  const { data: styles, isLoading: stylesLoading } = useAIStyles();
  const createMutation = useCreatePhotoshoot();

  const handleGenerate = async () => {
    if (!imageId || !selectedStyle) return;

    try {
      const result = await createMutation.mutateAsync({
        image_id: imageId,
        style: selectedStyle,
        marketplace: selectedMarketplace,
      });
      navigate(`/generating/${result.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      toast.error(
        error?.response?.data?.detail || "Не удалось запустить генерацию"
      );
    }
  };

  if (!imageId) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
        <div className="bg-mesh" />
        <div className="relative z-10 flex flex-col items-center justify-center py-24">
          <p style={{ color: "var(--text-tertiary)" }}>
            Изображение не выбрано
          </p>
          <button
            onClick={() => navigate("/upload")}
            className="btn-primary mt-4 cursor-pointer"
          >
            Загрузить фото
          </button>
        </div>
      </div>
    );
  }

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
              AI <span className="text-gradient">Фотосессия</span>
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Выберите стиль съёмки для вашего товара
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
        {/* Marketplace selector */}
        <div className="mb-8 animate-fade-in-up">
          <p
            className="text-xs uppercase tracking-wide mb-3 font-semibold"
            style={{ color: "var(--text-tertiary)" }}
          >
            Маркетплейс
          </p>
          <div className="flex gap-3 flex-wrap">
            {MARKETPLACES.map((mp) => (
              <button
                key={mp.value}
                onClick={() => setSelectedMarketplace(mp.value)}
                className="cursor-pointer transition-all"
                style={{
                  padding: "0.625rem 1.25rem",
                  borderRadius: "var(--radius-lg)",
                  background:
                    selectedMarketplace === mp.value
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(255,255,255,0.02)",
                  border:
                    selectedMarketplace === mp.value
                      ? "1px solid rgba(255,255,255,0.2)"
                      : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{
                    color:
                      selectedMarketplace === mp.value
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                  }}
                >
                  {mp.label}
                </span>
                <span
                  className="text-xs ml-2"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {mp.size}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Style cards */}
        <div className="mb-8">
          <p
            className="text-xs uppercase tracking-wide mb-3 font-semibold animate-fade-in-up delay-100"
            style={{ color: "var(--text-tertiary)" }}
          >
            Стиль съёмки
          </p>

          {stylesLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="glass-card-static overflow-hidden"
                  style={{ height: "180px" }}
                >
                  <div
                    className="w-full h-full animate-shimmer"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  />
                </div>
              ))}
            </div>
          )}

          {styles && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {styles.map((style, i) => {
                const visuals = STYLE_VISUALS[style.id] || {
                  gradient: "var(--gradient-surface)",
                  icon: "🖼️",
                };
                const isSelected = selectedStyle === style.id;

                return (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`relative overflow-hidden text-left transition-all cursor-pointer animate-fade-in-up group`}
                    style={{
                      animationDelay: `${(i + 1) * 100}ms`,
                      borderRadius: "var(--radius-lg)",
                      border: isSelected
                        ? "2px solid var(--purple-500)"
                        : "1px solid rgba(255,255,255,0.06)",
                      boxShadow: isSelected
                        ? "0 0 30px rgba(124, 58, 237, 0.25), 0 0 60px rgba(124, 58, 237, 0.1)"
                        : "none",
                      padding: 0,
                      background: "none",
                    }}
                  >
                    {/* Preview area with gradient */}
                    <div
                      className="relative flex items-center justify-center overflow-hidden"
                      style={{
                        background: visuals.gradient,
                        height: "120px",
                      }}
                    >
                      <span
                        className="text-4xl group-hover:scale-110 transition-transform"
                        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}
                      >
                        {visuals.icon}
                      </span>

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div
                          className="absolute top-3 right-3 flex items-center justify-center"
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: "var(--gradient-primary)",
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div
                      style={{
                        padding: "0.75rem 1rem",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {style.name}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {style.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Generate button + secondary actions */}
        <div className="flex flex-col items-center gap-3 animate-fade-in-up delay-600">
          <button
            onClick={handleGenerate}
            disabled={!selectedStyle || createMutation.isPending}
            className="btn-primary w-full md:w-auto text-lg py-3 px-8 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? (
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
                Запускаем...
              </span>
            ) : (
              "Создать карточку"
            )}
          </button>

          <button
            onClick={() => navigate(`/templates?image=${imageId}`)}
            className="btn-ghost text-sm cursor-pointer"
          >
            Шаблоны с текстом (ручной редактор)
          </button>
        </div>
      </main>
    </div>
  );
}
