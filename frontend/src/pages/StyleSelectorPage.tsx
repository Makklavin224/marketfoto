/**
 * AI Photoshoot Style Selector Page.
 *
 * Tab 1: "Серии" — 3 series preset cards (WB Full, Ozon Premium, Quick Start)
 * Tab 2: "Все стили" — Grid of 15 individual style cards
 *
 * Navigation: ProcessingPage → here → ProductInfoPage → GeneratingPage → ResultPage
 */

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAIStyles } from "../api/aiPhotoshoot";
import { useAuthStore } from "../stores/auth";

// Style card gradients for visual differentiation
const STYLE_GRADIENTS: Record<string, string> = {
  studio_clean: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  premium_hero: "linear-gradient(135deg, #2d1b0e 0%, #5c3a1e 50%, #8b6914 100%)",
  lifestyle_scene: "linear-gradient(135deg, #2d1b3d 0%, #44318d 50%, #3a1078 100%)",
  glass_surface: "linear-gradient(135deg, #0d2137 0%, #1a4a6b 50%, #2d7da8 100%)",
  ingredients: "linear-gradient(135deg, #2d1b1b 0%, #6b3a1d 50%, #c67b3a 100%)",
  with_model: "linear-gradient(135deg, #3d1b2d 0%, #6b1d5e 50%, #a83279 100%)",
  multi_angle: "linear-gradient(135deg, #1b2d3d 0%, #2a4a5e 50%, #3d6b7a 100%)",
  infographic: "linear-gradient(135deg, #1b2d3d 0%, #1d4e6b 50%, #23659b 100%)",
  nine_grid: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #404040 100%)",
  creative_art: "linear-gradient(135deg, #3d1b2d 0%, #6b1d5e 50%, #9b2335 100%)",
  storyboard: "linear-gradient(135deg, #1b3d2d 0%, #2a5e4a 50%, #3d7a6b 100%)",
  detail_texture: "linear-gradient(135deg, #2d2d1b 0%, #4e4a1d 50%, #6b6523 100%)",
  seasonal: "linear-gradient(135deg, #3d1b3d 0%, #7a3d6b 50%, #c76ba8 100%)",
  minimal_flat: "linear-gradient(135deg, #1a1a1a 0%, #333333 50%, #4a4a4a 100%)",
  unboxing: "linear-gradient(135deg, #1b1b3d 0%, #3a3a6b 50%, #5a5a9b 100%)",
};

// Series card accent colors
const SERIES_COLORS: Record<string, { gradient: string; accent: string }> = {
  wb_full: {
    gradient: "linear-gradient(135deg, #cb11ab 0%, #7b2dce 100%)",
    accent: "rgba(203, 17, 171, 0.3)",
  },
  ozon_premium: {
    gradient: "linear-gradient(135deg, #005bff 0%, #0041b3 100%)",
    accent: "rgba(0, 91, 255, 0.3)",
  },
  quick_start: {
    gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
    accent: "rgba(124, 58, 237, 0.3)",
  },
};

const MARKETPLACES = [
  { value: "wb", label: "Wildberries", size: "900x1200", badge: "badge-wb" },
  { value: "ozon", label: "Ozon", size: "1200x1200", badge: "badge-ozon" },
  { value: "ym", label: "Яндекс Маркет", size: "800x800", badge: "badge-ym" },
];

type Tab = "series" | "styles";

export default function StyleSelectorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const imageId = searchParams.get("image");
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<Tab>("series");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedMarketplace, setSelectedMarketplace] = useState("wb");

  const { data: stylesData, isLoading: stylesLoading } = useAIStyles();
  const styles = stylesData?.styles ?? [];
  const series = stylesData?.series ?? [];

  // Build a quick lookup: style_id -> style for resolving series style names
  const styleMap = new Map(styles.map((s) => [s.id, s]));

  const handleNextSingle = () => {
    if (!imageId || !selectedStyle) return;
    navigate(
      `/product-info?image=${imageId}&style=${selectedStyle}&marketplace=${selectedMarketplace}`
    );
  };

  const handleNextSeries = () => {
    if (!imageId || !selectedSeries) return;
    navigate(
      `/product-info?image=${imageId}&series=${selectedSeries}&marketplace=${selectedMarketplace}`
    );
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
        <div className="mb-6 animate-fade-in-up">
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

        {/* Tabs */}
        <div className="mb-6 animate-fade-in-up delay-100">
          <div
            className="flex gap-1 p-1 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              width: "fit-content",
            }}
          >
            <button
              onClick={() => {
                setActiveTab("series");
                setSelectedStyle(null);
              }}
              className="cursor-pointer transition-all text-sm font-semibold px-5 py-2 rounded-lg"
              style={{
                background:
                  activeTab === "series"
                    ? "rgba(124, 58, 237, 0.15)"
                    : "transparent",
                color:
                  activeTab === "series"
                    ? "var(--purple-400)"
                    : "var(--text-tertiary)",
                border:
                  activeTab === "series"
                    ? "1px solid rgba(124, 58, 237, 0.3)"
                    : "1px solid transparent",
              }}
            >
              Серии карточек
            </button>
            <button
              onClick={() => {
                setActiveTab("styles");
                setSelectedSeries(null);
              }}
              className="cursor-pointer transition-all text-sm font-semibold px-5 py-2 rounded-lg"
              style={{
                background:
                  activeTab === "styles"
                    ? "rgba(124, 58, 237, 0.15)"
                    : "transparent",
                color:
                  activeTab === "styles"
                    ? "var(--purple-400)"
                    : "var(--text-tertiary)",
                border:
                  activeTab === "styles"
                    ? "1px solid rgba(124, 58, 237, 0.3)"
                    : "1px solid transparent",
              }}
            >
              Все стили ({styles.length})
            </button>
          </div>
        </div>

        {/* Tab: Series */}
        {activeTab === "series" && (
          <div className="mb-8">
            {stylesLoading && (
              <div className="grid grid-cols-1 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="glass-card-static overflow-hidden"
                    style={{ height: "160px" }}
                  >
                    <div
                      className="w-full h-full animate-shimmer"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    />
                  </div>
                ))}
              </div>
            )}

            {!stylesLoading && (
              <div className="flex flex-col gap-4">
                {series.map((s, i) => {
                  const isSelected = selectedSeries === s.id;
                  const colors = SERIES_COLORS[s.id] || {
                    gradient: "var(--gradient-primary)",
                    accent: "rgba(124, 58, 237, 0.3)",
                  };

                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSeries(isSelected ? null : s.id)}
                      className="relative overflow-hidden text-left transition-all cursor-pointer animate-fade-in-up group"
                      style={{
                        animationDelay: `${i * 100}ms`,
                        borderRadius: "var(--radius-lg)",
                        border: isSelected
                          ? `2px solid ${colors.accent.replace("0.3", "0.6")}`
                          : "1px solid rgba(255,255,255,0.06)",
                        boxShadow: isSelected
                          ? `0 0 30px ${colors.accent}, 0 0 60px ${colors.accent.replace("0.3", "0.1")}`
                          : "none",
                        padding: 0,
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      {/* Top accent bar */}
                      <div
                        style={{
                          height: "4px",
                          background: colors.gradient,
                        }}
                      />

                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p
                              className="text-base font-semibold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {s.name}
                            </p>
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              {s.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-4">
                            <span
                              className="text-xs font-bold px-2.5 py-1 rounded-full"
                              style={{
                                background: colors.accent,
                                color: "var(--text-primary)",
                              }}
                            >
                              {s.card_count} карт.
                            </span>
                            <span
                              className="text-xs px-2.5 py-1 rounded-full"
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {s.card_count} кредитов
                            </span>
                          </div>
                        </div>

                        {/* Style chips */}
                        <div className="flex gap-2 flex-wrap">
                          {s.styles.map((styleId) => {
                            const styleInfo = styleMap.get(styleId);
                            return (
                              <span
                                key={styleId}
                                className="text-xs px-2.5 py-1 rounded-md"
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  color: "var(--text-secondary)",
                                  border: "1px solid rgba(255,255,255,0.06)",
                                }}
                              >
                                {styleInfo
                                  ? `${styleInfo.emoji} ${styleInfo.name}`
                                  : styleId}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div
                          className="absolute top-4 right-4 flex items-center justify-center"
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: colors.gradient,
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
                    </button>
                  );
                })}
              </div>
            )}

            {/* Series CTA */}
            <div className="flex flex-col items-center gap-3 mt-8 animate-fade-in-up delay-400">
              <button
                onClick={handleNextSeries}
                disabled={!selectedSeries}
                className="btn-primary w-full md:w-auto text-lg py-3 px-8 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Далее: информация о товаре
              </button>
              <button
                onClick={() => navigate(`/templates?image=${imageId}`)}
                className="btn-ghost text-sm cursor-pointer"
              >
                Шаблоны с текстом (ручной редактор)
              </button>
            </div>
          </div>
        )}

        {/* Tab: All Styles */}
        {activeTab === "styles" && (
          <div className="mb-8">
            {stylesLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div
                    key={i}
                    className="glass-card-static overflow-hidden"
                    style={{ height: "150px" }}
                  >
                    <div
                      className="w-full h-full animate-shimmer"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    />
                  </div>
                ))}
              </div>
            )}

            {!stylesLoading && styles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {styles.map((style, i) => {
                  const gradient =
                    STYLE_GRADIENTS[style.id] || "var(--gradient-surface)";
                  const isSelected = selectedStyle === style.id;

                  return (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className="relative overflow-hidden text-left transition-all cursor-pointer animate-fade-in-up group"
                      style={{
                        animationDelay: `${(i % 6) * 60}ms`,
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
                          background: gradient,
                          height: "80px",
                        }}
                      >
                        <span
                          className="text-3xl group-hover:scale-110 transition-transform"
                          style={{
                            filter:
                              "drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
                          }}
                        >
                          {style.emoji}
                        </span>

                        {/* Selected checkmark */}
                        {isSelected && (
                          <div
                            className="absolute top-2 right-2 flex items-center justify-center"
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              background: "var(--gradient-primary)",
                            }}
                          >
                            <svg
                              width="12"
                              height="12"
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
                          padding: "0.5rem 0.75rem",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <p
                          className="text-xs font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {style.name}
                        </p>
                        <p
                          className="text-[10px] mt-0.5 leading-tight"
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

            {/* Single style CTA */}
            <div className="flex flex-col items-center gap-3 mt-8 animate-fade-in-up delay-600">
              <button
                onClick={handleNextSingle}
                disabled={!selectedStyle}
                className="btn-primary w-full md:w-auto text-lg py-3 px-8 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Далее: информация о товаре
              </button>
              <button
                onClick={() => navigate(`/templates?image=${imageId}`)}
                className="btn-ghost text-sm cursor-pointer"
              >
                Шаблоны с текстом (ручной редактор)
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
