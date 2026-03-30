export default function BeforeAfterSection() {
  const examples = [
    {
      category: "Одежда",
      emoji: "👕",
      gradient: "from-purple-500 to-purple-700",
      badge: "WB",
    },
    {
      category: "Электроника",
      emoji: "🎧",
      gradient: "from-blue-500 to-blue-700",
      badge: "Ozon",
    },
    {
      category: "Косметика",
      emoji: "💄",
      gradient: "from-pink-500 to-rose-600",
      badge: "WB",
    },
    {
      category: "Еда",
      emoji: "🍯",
      gradient: "from-yellow-400 to-orange-500",
      badge: "ЯМ",
    },
  ];

  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
          До и После
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {examples.map((example) => (
            <div
              key={example.category}
              className="overflow-hidden rounded-xl bg-white shadow-md"
            >
              {/* "Before" placeholder */}
              <div className="flex aspect-square items-center justify-center bg-gray-200">
                <div className="text-center">
                  <span className="text-4xl">{example.emoji}</span>
                  <p className="mt-2 text-sm text-gray-500">
                    Фото с телефона
                  </p>
                </div>
              </div>

              {/* "After" placeholder */}
              <div
                className={`flex aspect-square items-center justify-center bg-gradient-to-br ${example.gradient}`}
              >
                <div className="text-center">
                  <span className="text-4xl">✨</span>
                  <p className="mt-2 text-sm font-medium text-white">
                    Готовая карточка
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
                    {example.badge}
                  </span>
                </div>
              </div>

              {/* Category label */}
              <p className="py-3 text-center text-sm font-medium text-gray-700">
                {example.category}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
