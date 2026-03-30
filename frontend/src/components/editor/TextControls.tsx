import { useEditorStore } from '../../stores/editor';

export default function TextControls() {
  const templateConfig = useEditorStore((s) => s.templateConfig);
  const textOverrides = useEditorStore((s) => s.textOverrides);
  const updateTextOverride = useEditorStore((s) => s.updateTextOverride);
  const setSelectedObject = useEditorStore((s) => s.setSelectedObject);

  if (!templateConfig) return null;

  return (
    <div className="flex flex-col gap-3">
      {templateConfig.text_areas.map((ta) => {
        const override = textOverrides[ta.id];
        if (!override) return null;

        return (
          <div key={ta.id}>
            <label className="block text-xs text-gray-500 mb-1">{ta.label}</label>
            <input
              type="text"
              value={override.content}
              onChange={(e) =>
                updateTextOverride(ta.id, { content: e.target.value })
              }
              onFocus={() => setSelectedObject('text', ta.id)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={ta.label}
            />
          </div>
        );
      })}
    </div>
  );
}
