import { useState } from "react";
import { useNavigate } from "react-router";
import { useTemplates } from "../api/templates";
import type { TemplateListItem } from "../api/templates";
import CategoryTabs from "../components/templates/CategoryTabs";
import MarketplaceChips from "../components/templates/MarketplaceChips";
import TemplateGrid from "../components/templates/TemplateGrid";
import PremiumModal from "../components/templates/PremiumModal";

export default function TemplateSelectorPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<string | null>(null);
  const [marketplace, setMarketplace] = useState<string | null>(null);
  const [premiumModal, setPremiumModal] = useState<{
    open: boolean;
    name: string;
  }>({ open: false, name: "" });

  const { data: templates, isLoading, isError, refetch } = useTemplates({
    category,
    marketplace,
  });

  function handleSelect(template: TemplateListItem) {
    if (template.is_premium) {
      setPremiumModal({ open: true, name: template.name });
    } else {
      navigate(`/editor?template=${template.id}`);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Выберите шаблон
      </h1>

      <CategoryTabs activeCategory={category} onChange={setCategory} />

      <div className="mt-3 mb-6">
        <MarketplaceChips
          activeMarketplace={marketplace}
          onChange={setMarketplace}
        />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="aspect-[3/4] bg-gray-100 animate-pulse" />
              <div className="px-3 py-2">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-gray-500 text-sm mb-4">
            Ошибка загрузки шаблонов
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <TemplateGrid templates={templates ?? []} onSelect={handleSelect} />
      )}

      <PremiumModal
        isOpen={premiumModal.open}
        onClose={() => setPremiumModal({ open: false, name: "" })}
        templateName={premiumModal.name}
      />
    </div>
  );
}
