import type { TemplateListItem } from "../../api/templates";

const CATEGORY_COLORS: Record<string, string> = {
  white_bg: "#FFFFFF",
  infographic: "#F8F9FA",
  lifestyle: "#F5F0EB",
  collage: "#E8E0F0",
};

interface TemplateCardProps {
  template: TemplateListItem;
  onClick: (template: TemplateListItem) => void;
}

export default function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <div
      onClick={() => onClick(template)}
      className="rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="aspect-[3/4] bg-gray-50 relative flex items-center justify-center">
        <img
          src={template.preview_url}
          alt={template.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent) {
              parent.style.backgroundColor =
                CATEGORY_COLORS[template.category] || "#F3F4F6";
            }
          }}
        />
        {template.is_premium && (
          <div className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        )}
      </div>
      <div className="px-3 py-2 text-sm font-medium text-gray-800 truncate">
        {template.name}
      </div>
    </div>
  );
}
