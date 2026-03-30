import type { TemplateListItem } from "../../api/templates";
import TemplateCard from "./TemplateCard";

interface TemplateGridProps {
  templates: TemplateListItem[];
  onSelect: (template: TemplateListItem) => void;
}

export default function TemplateGrid({
  templates,
  onSelect,
}: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-400 text-sm">Шаблоны не найдены</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onClick={onSelect}
        />
      ))}
    </div>
  );
}
