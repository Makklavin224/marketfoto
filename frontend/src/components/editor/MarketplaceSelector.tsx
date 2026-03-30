import { useEditorStore } from '../../stores/editor';
import { MARKETPLACE_SIZES } from '../../types/editor';
import type { MarketplaceId } from '../../types/editor';

const MARKETPLACE_OPTIONS: { id: MarketplaceId; label: string }[] = [
  { id: 'wb', label: 'Wildberries' },
  { id: 'ozon', label: 'Ozon' },
  { id: 'ym', label: 'Яндекс Маркет' },
];

export default function MarketplaceSelector() {
  const marketplace = useEditorStore((s) => s.marketplace);
  const setMarketplace = useEditorStore((s) => s.setMarketplace);

  return (
    <div className="flex flex-col gap-2">
      {MARKETPLACE_OPTIONS.map((opt) => {
        const dims = MARKETPLACE_SIZES[opt.id];
        const isActive = marketplace === opt.id;
        return (
          <label
            key={opt.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
              isActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="marketplace"
              value={opt.id}
              checked={isActive}
              onChange={() => setMarketplace(opt.id)}
              className="w-4 h-4 text-blue-600"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-800">{opt.label}</span>
              <span className="block text-xs text-gray-400">
                {dims.width} x {dims.height} px
              </span>
            </div>
          </label>
        );
      })}
    </div>
  );
}
