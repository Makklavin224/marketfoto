import { EDITOR_FONTS } from '../../lib/fonts';
import { useEditorStore } from '../../stores/editor';

interface FontPickerProps {
  areaId: string;
}

export default function FontPicker({ areaId }: FontPickerProps) {
  const textOverrides = useEditorStore((s) => s.textOverrides);
  const updateTextOverride = useEditorStore((s) => s.updateTextOverride);

  const override = textOverrides[areaId];
  if (!override) return null;

  return (
    <select
      value={override.fontFamily}
      onChange={(e) => updateTextOverride(areaId, { fontFamily: e.target.value })}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      {EDITOR_FONTS.map((font) => (
        <option
          key={font.family}
          value={font.family}
          style={{ fontFamily: font.family }}
        >
          {font.label}
        </option>
      ))}
    </select>
  );
}
