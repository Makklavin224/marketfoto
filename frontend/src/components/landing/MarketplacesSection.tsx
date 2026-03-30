export default function MarketplacesSection() {
  const marketplaces = [
    {
      name: "Wildberries",
      size: "900 x 1200",
      gradient: "from-purple-500 to-purple-700",
      textColor: "text-white",
    },
    {
      name: "Ozon",
      size: "1200 x 1200",
      gradient: "from-blue-500 to-blue-700",
      textColor: "text-white",
    },
    {
      name: "Яндекс.Маркет",
      size: "800 x 800",
      gradient: "from-yellow-400 to-yellow-600",
      textColor: "text-gray-900",
    },
  ];

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-4 text-center text-3xl font-bold text-gray-900">
          Для какого маркетплейса
        </h2>
        <p className="mb-12 text-center text-lg text-gray-500">
          Правильные размеры автоматически
        </p>

        <div className="flex flex-col items-center justify-center gap-8 md:flex-row">
          {marketplaces.map((mp) => (
            <div
              key={mp.name}
              className={`min-w-[200px] rounded-xl bg-gradient-to-br ${mp.gradient} p-8 shadow-lg`}
            >
              <h3 className={`text-center text-xl font-bold ${mp.textColor}`}>
                {mp.name}
              </h3>
              <p
                className={`mt-2 text-center text-sm font-medium ${mp.textColor} opacity-80`}
              >
                {mp.size}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
