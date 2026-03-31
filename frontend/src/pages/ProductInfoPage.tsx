/**
 * Product Info Page — between style selection and AI generation.
 *
 * User fills in product name, features, optional badge text.
 * "AI подсказка" button calls Gemini to auto-suggest from the product image.
 * Submits to /generating with product info included in the request.
 *
 * Navigation: StyleSelectorPage → here → GeneratingPage → ResultPage
 */

import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  useCreatePhotoshoot,
  useSuggestProductInfo,
} from "../api/aiPhotoshoot";
import { imagesApi } from "../lib/api";
import { useAuthStore } from "../stores/auth";

export default function ProductInfoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const imageId = searchParams.get("image");
  const style = searchParams.get("style") || "";
  const marketplace = searchParams.get("marketplace") || "wb";
  const user = useAuthStore((s) => s.user);

  const [title, setTitle] = useState("");
  const [features, setFeatures] = useState<string[]>(["", "", ""]);
  const [badge, setBadge] = useState("");

  const createMutation = useCreatePhotoshoot();
  const suggestMutation = useSuggestProductInfo();

  // Fetch image record to get presigned processed URL for thumbnail
  const imageQuery = useQuery({
    queryKey: ["image", imageId],
    queryFn: async () => {
      const { data } = await imagesApi.get(imageId!);
      return data;
    },
    enabled: !!imageId,
    staleTime: Infinity,
  });
  const processedUrl = imageQuery.data?.processed_url;

  const handleAddFeature = useCallback(() => {
    if (features.length < 5) {
      setFeatures((prev) => [...prev, ""]);
    }
  }, [features.length]);

  const handleRemoveFeature = useCallback((index: number) => {
    setFeatures((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFeatureChange = useCallback(
    (index: number, value: string) => {
      setFeatures((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
    },
    []
  );

  const handleSuggest = useCallback(async () => {
    if (!imageId) return;
    try {
      const result = await suggestMutation.mutateAsync({
        image_id: imageId,
      });
      if (result.title) setTitle(result.title);
      if (result.features && result.features.length > 0) {
        setFeatures(result.features.slice(0, 5));
      }
      toast.success("AI заполнил данные о товаре");
    } catch {
      toast.error("Не удалось получить подсказку от AI");
    }
  }, [imageId, suggestMutation]);

  const handleGenerate = useCallback(async () => {
    if (!imageId || !style) return;
    if (!title.trim()) {
      toast.error("Укажите название товара");
      return;
    }

    const nonEmptyFeatures = features.filter((f) => f.trim());

    try {
      const result = await createMutation.mutateAsync({
        image_id: imageId,
        style,
        marketplace,
        title: title.trim(),
        features: nonEmptyFeatures.length > 0 ? nonEmptyFeatures : undefined,
        badge: badge.trim() || undefined,
      });
      navigate(`/generating/${result.id}`);
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      toast.error(
        error?.response?.data?.detail || "Не удалось запустить генерацию"
      );
    }
  }, [imageId, style, marketplace, title, features, badge, createMutation, navigate]);

  if (!imageId || !style) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
        <div className="bg-mesh" />
        <div className="relative z-10 flex flex-col items-center justify-center py-24">
          <p style={{ color: "var(--text-tertiary)" }}>
            Параметры не указаны
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
              Информация о <span className="text-gradient">товаре</span>
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Добавьте описание для карточки маркетплейса
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in-up">
          {/* Left: Product thumbnail */}
          <div className="md:col-span-1">
            <p
              className="text-xs uppercase tracking-wide mb-3 font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              Ваш товар
            </p>
            <div
              className="glass-card-static overflow-hidden"
              style={{
                backgroundImage:
                  "repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, rgba(255,255,255,0.01) 0% 50%)",
                backgroundSize: "16px 16px",
              }}
            >
              {processedUrl ? (
                <img
                  src={processedUrl}
                  alt="Товар"
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: "280px" }}
                />
              ) : (
                <div
                  className="flex items-center justify-center h-48"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <p className="text-sm">Загрузка...</p>
                </div>
              )}
            </div>

            {/* AI Suggest button */}
            <button
              onClick={handleSuggest}
              disabled={suggestMutation.isPending}
              className="btn-secondary w-full mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              {suggestMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
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
                  AI анализирует...
                </span>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
                  </svg>
                  AI подсказка
                </>
              )}
            </button>
          </div>

          {/* Right: Form */}
          <div className="md:col-span-2">
            {/* Title */}
            <div className="mb-5 animate-fade-in-up delay-100">
              <label
                className="text-xs uppercase tracking-wide mb-2 font-semibold block"
                style={{ color: "var(--text-tertiary)" }}
              >
                Название товара *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Беспроводные наушники Pro Max"
                className="input-dark w-full"
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-lg)",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--text-primary)",
                  fontSize: "0.9375rem",
                  outline: "none",
                  width: "100%",
                }}
              />
            </div>

            {/* Features */}
            <div className="mb-5 animate-fade-in-up delay-200">
              <label
                className="text-xs uppercase tracking-wide mb-2 font-semibold block"
                style={{ color: "var(--text-tertiary)" }}
              >
                Характеристики
              </label>
              <div className="flex flex-col gap-2">
                {features.map((feat, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={feat}
                      onChange={(e) => handleFeatureChange(i, e.target.value)}
                      placeholder={`Характеристика ${i + 1}`}
                      style={{
                        flex: 1,
                        padding: "0.625rem 0.875rem",
                        borderRadius: "var(--radius-lg)",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "var(--text-primary)",
                        fontSize: "0.875rem",
                        outline: "none",
                      }}
                    />
                    {features.length > 1 && (
                      <button
                        onClick={() => handleRemoveFeature(i)}
                        className="cursor-pointer transition-colors"
                        style={{
                          padding: "0.5rem",
                          borderRadius: "var(--radius-md)",
                          background: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          color: "var(--red-400)",
                          lineHeight: 0,
                        }}
                        title="Удалить"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {features.length < 5 && (
                <button
                  onClick={handleAddFeature}
                  className="mt-2 cursor-pointer text-sm flex items-center gap-1 transition-colors"
                  style={{
                    color: "var(--purple-400)",
                    background: "none",
                    border: "none",
                    padding: "0.25rem 0",
                  }}
                >
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
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Добавить характеристику
                </button>
              )}
            </div>

            {/* Badge */}
            <div className="mb-8 animate-fade-in-up delay-300">
              <label
                className="text-xs uppercase tracking-wide mb-2 font-semibold block"
                style={{ color: "var(--text-tertiary)" }}
              >
                Бейдж (необязательно)
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder='Например: ХИТ ПРОДАЖ, -30%, НОВИНКА'
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-lg)",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--text-primary)",
                  fontSize: "0.9375rem",
                  outline: "none",
                  width: "100%",
                }}
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                {["ХИТ ПРОДАЖ", "-30%", "НОВИНКА", "БЕСТСЕЛЛЕР", "ТОП"].map(
                  (preset) => (
                    <button
                      key={preset}
                      onClick={() => setBadge(preset)}
                      className="cursor-pointer text-xs transition-all"
                      style={{
                        padding: "0.25rem 0.625rem",
                        borderRadius: "var(--radius-md)",
                        background:
                          badge === preset
                            ? "rgba(124, 58, 237, 0.15)"
                            : "rgba(255,255,255,0.04)",
                        border:
                          badge === preset
                            ? "1px solid rgba(124, 58, 237, 0.3)"
                            : "1px solid rgba(255,255,255,0.06)",
                        color:
                          badge === preset
                            ? "var(--purple-400)"
                            : "var(--text-secondary)",
                      }}
                    >
                      {preset}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Generate CTA */}
            <div className="flex flex-col items-center gap-3 animate-fade-in-up delay-400">
              <button
                onClick={handleGenerate}
                disabled={!title.trim() || createMutation.isPending}
                className="btn-primary w-full text-lg py-3 px-8 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? (
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
                    Запускаем генерацию...
                  </span>
                ) : (
                  "Создать карточку"
                )}
              </button>

              <button
                onClick={() => navigate(-1)}
                className="btn-ghost text-sm cursor-pointer"
              >
                Назад к выбору стиля
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
