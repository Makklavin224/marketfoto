import { useEditorStore } from '../../stores/editor';
import MarketplaceSelector from './MarketplaceSelector';
import TextControls from './TextControls';
import StyleControls from './StyleControls';
import BadgeControls from './BadgeControls';

interface RightPanelProps {
  onCreateCard: () => void;
  isCreating: boolean;
}

export default function RightPanel({ onCreateCard, isCreating }: RightPanelProps) {
  const selectedTextAreaId = useEditorStore((s) => s.selectedTextAreaId);
  const templateConfig = useEditorStore((s) => s.templateConfig);

  const hasBadge = templateConfig?.decorations?.some((d) => d.type === 'badge');

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
          onClick={onCreateCard}
          disabled={isCreating}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Создаём...
            </>
          ) : (
            'Создать карточку'
          )}
        </button>
      </div>
    </div>
  );
}
