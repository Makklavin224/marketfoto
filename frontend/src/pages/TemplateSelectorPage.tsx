import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTemplates } from "../api/templates";
import type { TemplateListItem } from "../api/templates";
import PremiumModal from "../components/templates/PremiumModal";

const CATEGORIES = [
  { value: null, label: "Все" },
  { value: "white_bg", label: "Белый фон" },
  { value: "infographic", label: "Инфографика" },
  { value: "lifestyle", label: "Лайфстайл" },
  { value: "collage", label: "Коллаж" },
];

const MARKETPLACES = [
  { value: null, label: "Все" },
  { value: "wb", label: "WB", className: "badge-wb" },
  { value: "ozon", label: "Ozon", className: "badge-ozon" },
  { value: "ym", label: "Я.Маркет", className: "badge-ym" },
];

const CATEGORY_GRADIENTS: Record<string, string> = {
  white_bg: "from-gray-100 to-white",
  infographic: "from-violet-200/80 to-blue-100/80",
  lifestyle: "from-amber-100/80 to-orange-50/80",
  collage: "from-purple-200/80 to-pink-100/80",
};

export default function TemplateSelectorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const imageId = searchParams.get("image");
  const [category, setCategory] = useState<string | null>(null);
  const [marketplace, setMarketplace] = useState<string | null>(null);
  const [premiumModal, setPremiumModal] = useState<{ open: boolean; name: string }>({ open: false, name: "" });

  const { data: templates, isLoading, isError, refetch } = useTemplates({ category, marketplace });

  function handleSelect(template: TemplateListItem) {
    if (template.is_premium) {
      setPremiumModal({ open: true, name: template.name });
    } else {
      const params = new URLSearchParams({ template: template.id });
      if (imageId) params.set("image", imageId);
      navigate(`/editor?${params.toString()}`);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="heading-section" style={{ color: "var(--text-primary)" }}>
          Выберите <span className="text-gradient">шаблон</span>
        </h1>
        <p className="mt-2 mb-8" style={{ color: "var(--text-secondary)" }}>
          Выберите стиль карточки для вашего товара
        </p>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value ?? "all"}
              onClick={() => setCategory(cat.value)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: category === cat.value
                  ? "var(--gradient-primary)" : "rgba(255,255,255,0.04)",
                color: category === cat.value ? "#fff" : "var(--text-secondary)",
                border: category === cat.value ? "none" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Marketplace chips */}
        <div className="flex gap-2 flex-wrap mb-8">
          {MARKETPLACES.map((mp) => (
            <button
              key={mp.value ?? "all"}
              onClick={() => setMarketplace(mp.value)}
              className={`badge text-xs transition-all ${marketplace === mp.value ? (mp.className || "badge-purple") : ""}`}
              style={marketplace !== mp.value ? {
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-tertiary)",
                border: "1px solid rgba(255,255,255,0.08)",
              } : {}}
            >
              {mp.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card-static overflow-hidden">
                <div className="aspect-[3/4] animate-shimmer" style={{ background: "rgba(255,255,255,0.03)" }} />
                <div className="p-3">
                  <div className="h-4 rounded animate-shimmer w-3/4" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="mb-4" style={{ color: "var(--text-tertiary)" }}>Ошибка загрузки шаблонов</p>
            <button onClick={() => refetch()} className="btn-secondary text-sm">
              Попробовать снова
            </button>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !isError && templates && templates.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <p style={{ color: "var(--text-tertiary)" }}>Шаблоны не найдены</p>
          </div>
        )}

        {!isLoading && !isError && templates && templates.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((template, i) => (
              <div
                key={template.id}
                onClick={() => handleSelect(template)}
                className="glass-card overflow-hidden cursor-pointer group animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {/* Preview */}
                <div className={`aspect-[3/4] relative bg-gradient-to-br ${CATEGORY_GRADIENTS[template.category] || "from-gray-200 to-gray-100"} flex items-center justify-center overflow-hidden`}>
                  {/* Category icon/label */}
                  <div className="text-center p-6">
                    <div className="text-5xl mb-3 opacity-60 group-hover:scale-110 transition-transform">
                      {template.category === "white_bg" && "⬜"}
                      {template.category === "infographic" && "📊"}
                      {template.category === "lifestyle" && "✨"}
                      {template.category === "collage" && "🖼️"}
                    </div>
                    <p className="text-sm font-medium text-gray-600">{template.name}</p>
                  </div>

                  {/* Premium lock */}
                  {template.is_premium && (
                    <div className="absolute top-3 right-3 rounded-full p-2" style={{ background: "rgba(124,58,237,0.8)", backdropFilter: "blur(8px)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                  )}

                  {/* Marketplace badges */}
                  <div className="absolute bottom-3 left-3 flex gap-1.5">
                    {template.marketplace.map((mp: string) => (
                      <span key={mp} className={`badge text-[10px] py-0.5 px-2 badge-${mp}`}>
                        {mp === "wb" ? "WB" : mp === "ozon" ? "Ozon" : "ЯМ"}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div className="p-3 flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{template.name}</span>
                  {template.is_premium ? (
                    <span className="badge badge-purple text-[10px] py-0.5">PRO</span>
                  ) : (
                    <span className="text-[10px] font-medium" style={{ color: "var(--green-400)" }}>Бесплатно</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <PremiumModal
          isOpen={premiumModal.open}
          onClose={() => setPremiumModal({ open: false, name: "" })}
          templateName={premiumModal.name}
        />
      </div>
    </div>
  );
}
