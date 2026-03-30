import { useEditorStore } from '../../stores/editor';
import FontPicker from './FontPicker';

export default function StyleControls() {
  const selectedTextAreaId = useEditorStore((s) => s.selectedTextAreaId);
  const textOverrides = useEditorStore((s) => s.textOverrides);
  const updateTextOverride = useEditorStore((s) => s.updateTextOverride);

  if (!selectedTextAreaId) return null;

  const override = textOverrides[selectedTextAreaId];
  if (!override) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Font family */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Шрифт</label>
        <FontPicker areaId={selectedTextAreaId} />
      </div>

      {/* Font size */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Размер: {override.fontSize}px
        </label>
        <input
          type="range"
          min={10}
          max={72}
          step={1}
          value={override.fontSize}
          onChange={(e) =>
            updateTextOverride(selectedTextAreaId, {
              fontSize: Number(e.target.value),
            })
          }
          className="w-full accent-blue-600"
        />
      </div>

      {/* Color and Bold */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Цвет</label>
          <input
            type="color"
            value={override.color}
            onChange={(e) =>
              updateTextOverride(selectedTextAreaId, { color: e.target.value })
            }
            className="w-full h-9 rounded-lg border border-gray-300 cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Жирный</label>
          <button
            onClick={() =>
              updateTextOverride(selectedTextAreaId, {
                fontWeight: override.fontWeight === 'bold' ? 'normal' : 'bold',
              })
            }
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              override.fontWeight === 'bold'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            B
          </button>
        </div>
      </div>
    </div>
  );
}
