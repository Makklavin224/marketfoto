import { useEditorStore } from '../../stores/editor';

export default function BadgeControls() {
  const templateConfig = useEditorStore((s) => s.templateConfig);
  const badgeEnabled = useEditorStore((s) => s.badgeEnabled);
  const badgeText = useEditorStore((s) => s.badgeText);
  const setBadgeEnabled = useEditorStore((s) => s.setBadgeEnabled);
  const setBadgeText = useEditorStore((s) => s.setBadgeText);

  // Only render if template has badge decorations
  const hasBadge = templateConfig?.decorations?.some((d) => d.type === 'badge');
  if (!hasBadge) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Показать бейдж</span>
        <button
          type="button"
          onClick={() => setBadgeEnabled(!badgeEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            badgeEnabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              badgeEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Badge text input */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Текст бейджа</label>
        <input
          type="text"
          value={badgeText}
          onChange={(e) => setBadgeText(e.target.value)}
          disabled={!badgeEnabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="ХИТ"
        />
      </div>
    </div>
  );
}
