const CATEGORIES = [
  { value: null, label: "Все" },
  { value: "white_bg", label: "Белый фон" },
  { value: "infographic", label: "Инфографика" },
  { value: "lifestyle", label: "Лайфстайл" },
  { value: "collage", label: "Коллаж" },
] as const;

interface CategoryTabsProps {
  activeCategory: string | null;
  onChange: (category: string | null) => void;
}

export default function CategoryTabs({
  activeCategory,
  onChange,
}: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.value;
        return (
          <button
            key={cat.label}
            onClick={() => onChange(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
