import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

const examples = [
  {
    category: "Одежда",
    emoji: "👕",
    marketplace: "Wildberries",
    badgeClass: "badge-wb",
    size: "900x1200",
    beforeText: "Фото на вешалке",
    afterText: "Профессиональная карточка",
  },
  {
    category: "Электроника",
    emoji: "🎧",
    marketplace: "Ozon",
    badgeClass: "badge-ozon",
    size: "1200x1200",
    beforeText: "Фото на столе",
    afterText: "Карточка с инфографикой",
  },
  {
    category: "Косметика",
    emoji: "💄",
    marketplace: "Wildberries",
    badgeClass: "badge-wb",
    size: "900x1200",
    beforeText: "Фото в руке",
    afterText: "Стильная карточка",
  },
  {
    category: "Продукты",
    emoji: "🍯",
    marketplace: "Яндекс.Маркет",
    badgeClass: "badge-ym",
    size: "800x800",
    beforeText: "Фото на кухне",
    afterText: "Карточка с составом",
  },
];

export default function BeforeAfterSection() {
  const { ref, isVisible } = useInView();

  return (
    <section ref={ref} className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1200px] px-6">
        {/* Header */}
        <div className={`text-center ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
          <span className="badge badge-green mb-4">Результат</span>
          <h2 className="heading-section" style={{ color: "var(--text-primary)" }}>
            До и После
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base" style={{ color: "var(--text-secondary)" }}>
            Посмотрите, как обычные фото с телефона превращаются в продающие карточки
          </p>
        </div>

        {/* Examples grid */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {examples.map((example, index) => (
            <div
              key={example.category}
              className={`group ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${(index + 1) * 100}ms` }}
            >
              <div
                className="glass-card overflow-hidden"
                style={{ padding: 0 }}
              >
                {/* Before half */}
                <div
                  className="relative flex aspect-square items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="text-center">
                    <span className="text-5xl">{example.emoji}</span>
                    <p
                      className="mt-3 text-xs font-medium"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {example.beforeText}
                    </p>
                  </div>

                  {/* "Before" tag */}
                  <span
                    className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "var(--text-tertiary)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    До
                  </span>
                </div>

                {/* Divider glow line */}
                <div className="glow-line" />

                {/* After half */}
                <div
                  className="relative flex aspect-square items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]"
                  style={{
                    background: "var(--gradient-surface)",
                  }}
                >
                  <div className="text-center">
                    <div
                      className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl"
                      style={{
                        background: "var(--gradient-primary)",
                        boxShadow: "var(--shadow-glow-sm)",
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6L12 2z" fill="white" opacity="0.9" />
                      </svg>
                    </div>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {example.afterText}
                    </p>
                    <span
                      className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: "rgba(139, 92, 246, 0.15)",
                        color: "var(--purple-400)",
                      }}
                    >
                      {example.size}
                    </span>
                  </div>

                  {/* "After" tag */}
                  <span
                    className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "var(--green-400)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                    }}
                  >
                    После
                  </span>
                </div>

                {/* Footer with category + marketplace */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {example.category}
                  </span>
                  <span className={`badge ${example.badgeClass} text-[10px]`}>
                    {example.marketplace}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
