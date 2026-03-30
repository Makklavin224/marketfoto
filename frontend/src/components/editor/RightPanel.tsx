import { useEditorStore } from '../../stores/editor';
import MarketplaceSelector from './MarketplaceSelector';
import TextControls from './TextControls';
import StyleControls from './StyleControls';
import BadgeControls from './BadgeControls';

export default function RightPanel() {
  const selectedTextAreaId = useEditorStore((s) => s.selectedTextAreaId);
  const templateConfig = useEditorStore((s) => s.templateConfig);
  const getOverlayData = useEditorStore((s) => s.getOverlayData);

  const hasBadge = templateConfig?.decorations?.some((d) => d.type === 'badge');

  const handleCreateCard = () => {
    const overlayData = getOverlayData();
    if (overlayData) {
      console.log('overlay_data:', JSON.stringify(overlayData, null, 2));
      // TODO Phase 7: POST to /api/renders
      alert('overlay_data logged to console (Phase 7 will POST to /api/renders)');
    }
  };

  return (
    <div className="w-[360px] flex-shrink-0 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
      <div className="flex-1 p-4">
        {/* Marketplace section */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Маркетплейс
          </h3>
          <MarketplaceSelector />
        </div>

        <hr className="my-4 border-gray-200" />

        {/* Texts section */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Тексты
          </h3>
          <TextControls />
        </div>

        {/* Style section (only when text is selected) */}
        {selectedTextAreaId && (
          <>
            <hr className="my-4 border-gray-200" />
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Стиль текста
              </h3>
              <StyleControls />
            </div>
          </>
        )}

        {/* Badge section (only if template has badges) */}
        {hasBadge && (
          <>
            <hr className="my-4 border-gray-200" />
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Бейдж
              </h3>
              <BadgeControls />
            </div>
          </>
        )}
      </div>

      {/* Create card button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleCreateCard}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl transition-colors"
        >
          Создать карточку
        </button>
      </div>
    </div>
  );
}
