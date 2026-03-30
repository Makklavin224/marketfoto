const MARKETPLACES = [
  { value: "wb", label: "WB" },
  { value: "ozon", label: "Ozon" },
  { value: "ym", label: "Я.Маркет" },
] as const;

interface MarketplaceChipsProps {
  activeMarketplace: string | null;
  onChange: (marketplace: string | null) => void;
}

export default function MarketplaceChips({
  activeMarketplace,
  onChange,
}: MarketplaceChipsProps) {
  return (
    <div className="flex gap-2">
      {MARKETPLACES.map((mp) => {
        const isActive = activeMarketplace === mp.value;
        return (
          <button
            key={mp.value}
            onClick={() => onChange(isActive ? null : mp.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              isActive
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
            }`}
          >
            {mp.label}
          </button>
        );
      })}
    </div>
  );
}
