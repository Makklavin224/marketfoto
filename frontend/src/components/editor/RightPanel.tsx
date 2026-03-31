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
    <div
      className="w-[360px] flex-shrink-0 overflow-y-auto flex flex-col"
      style={{
        background: 'var(--bg-secondary)',
        borderLeft: 'var(--border-subtle)',
      }}
    >
      <div className="flex-1 p-4">
        {/* Marketplace section */}
        <div className="mb-4">
          <h3
            className="text-sm font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            Маркетплейс
          </h3>
          <MarketplaceSelector />
        </div>

        <div className="glow-line my-4" />

        {/* Texts section */}
        <div className="mb-4">
          <h3
            className="text-sm font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            Тексты
          </h3>
          <TextControls />
        </div>

        {/* Style section (only when text is selected) */}
        {selectedTextAreaId && (
          <>
            <div className="glow-line my-4" />
            <div className="mb-4">
              <h3
                className="text-sm font-semibold uppercase tracking-wide mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Стиль текста
              </h3>
              <StyleControls />
            </div>
          </>
        )}

        {/* Badge section (only if template has badges) */}
        {hasBadge && (
          <>
            <div className="glow-line my-4" />
            <div className="mb-4">
              <h3
                className="text-sm font-semibold uppercase tracking-wide mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Бейдж
              </h3>
              <BadgeControls />
            </div>
          </>
        )}
      </div>

      {/* Create card button */}
      <div className="p-4" style={{ borderTop: 'var(--border-subtle)' }}>
        <button
          onClick={onCreateCard}
          disabled={isCreating}
          className="btn-primary w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
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
