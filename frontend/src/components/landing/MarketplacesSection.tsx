import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.15) {
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

const marketplaces = [
  {
    name: "Wildberries",
    shortName: "WB",
    size: "900 x 1200",
    ratio: "3:4",
    badgeClass: "badge-wb",
    glowColor: "rgba(203, 17, 171, 0.2)",
    borderColor: "rgba(203, 17, 171, 0.3)",
    features: ["Основное фото", "Дополнительные ракурсы", "Карточка с инфографикой"],
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="4" y="4" width="32" height="32" rx="8" stroke="#E879B9" strokeWidth="1.5" />
        <path d="M12 14l4 12 4-8 4 8 4-12" stroke="#E879B9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "Ozon",
    shortName: "Ozon",
    size: "1200 x 1200",
    ratio: "1:1",
    badgeClass: "badge-ozon",
    glowColor: "rgba(0, 91, 255, 0.2)",
    borderColor: "rgba(0, 91, 255, 0.3)",
    features: ["Квадратный формат", "Rich-контент", "Инфографика с характеристиками"],
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="4" y="4" width="32" height="32" rx="8" stroke="#60A5FA" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="8" stroke="#60A5FA" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="3" fill="#60A5FA" opacity="0.3" />
      </svg>
    ),
  },
  {
    name: "Яндекс.Маркет",
    shortName: "ЯМ",
    size: "800 x 800",
    ratio: "1:1",
    badgeClass: "badge-ym",
    glowColor: "rgba(255, 204, 0, 0.15)",
    borderColor: "rgba(255, 204, 0, 0.3)",
    features: ["Компактный формат", "Белый фон обязателен", "Минималистичный дизайн"],
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="4" y="4" width="32" height="32" rx="8" stroke="#FACC15" strokeWidth="1.5" />
        <path d="M20 10v12M20 22l-6 8h12l-6-8z" stroke="#FACC15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function MarketplacesSection() {
  const { ref, isVisible } = useInView();

  return (
    <section ref={ref} className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1200px] px-6">
        {/* Header */}
        <div className={`text-center ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
          <span className="badge badge-purple mb-4">Маркетплейсы</span>
          <h2 className="heading-section" style={{ color: "var(--text-primary)" }}>
            Правильные размеры{" "}
            <span className="text-gradient">автоматически</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base" style={{ color: "var(--text-secondary)" }}>
            Выберите маркетплейс — мы подставим правильные размеры и соотношение сторон
          </p>
        </div>

        {/* Marketplace cards */}
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {marketplaces.map((mp, index) => (
            <div
              key={mp.name}
              className={`${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${(index + 1) * 150}ms` }}
            >
              <div
                className="glass-card relative overflow-hidden p-8"
                style={{
                  "--card-glow": mp.glowColor,
                } as React.CSSProperties}
              >
                {/* Subtle top glow */}
                <div
                  className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: mp.glowColor, filter: "blur(40px)" }}
                />

                {/* Icon + badge */}
                <div className="mb-6 flex items-center justify-between">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${mp.borderColor}`,
                    }}
                  >
                    {mp.icon}
                  </div>
                  <span className={`badge ${mp.badgeClass}`}>{mp.shortName}</span>
                </div>

                {/* Name */}
                <h3
                  className="heading-card mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {mp.name}
                </h3>

                {/* Size info */}
                <div className="mb-6 flex items-center gap-3">
                  <span
                    className="rounded-md px-2.5 py-1 text-sm font-mono font-medium"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "var(--text-secondary)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {mp.size}
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {mp.ratio}
                  </span>
                </div>

                {/* Features list */}
                <ul className="space-y-2.5">
                  {mp.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                        <path
                          d="M11.2 3.8L5.6 9.4 2.8 6.6"
                          stroke="var(--green-400)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
