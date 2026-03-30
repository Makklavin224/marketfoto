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

const steps = [
  {
    number: "01",
    title: "Загрузите фото",
    description: "Сфотографируйте товар на телефон и загрузите в сервис. AI на базе BiRefNet уберёт фон за 5 секунд.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M4 24l7-9 5 6 5-7 7 10" stroke="var(--purple-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="2" y="4" width="28" height="24" rx="3" stroke="var(--purple-400)" strokeWidth="1.5" />
        <circle cx="22" cy="12" r="3" stroke="var(--purple-400)" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Выберите шаблон",
    description: "Подберите шаблон с инфографикой для вашего маркетплейса. Добавьте текст, бейджи и характеристики.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="var(--blue-400)" strokeWidth="1.5" />
        <rect x="18" y="2" width="12" height="12" rx="2" stroke="var(--blue-400)" strokeWidth="1.5" />
        <rect x="2" y="18" width="12" height="12" rx="2" stroke="var(--blue-400)" strokeWidth="1.5" />
        <rect x="18" y="18" width="12" height="12" rx="2" stroke="var(--blue-400)" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Скачайте карточку",
    description: "Готовая карточка в правильном размере для WB, Ozon или Яндекс.Маркет. Один клик — и на витрину.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 4v18M10 16l6 6 6-6" stroke="var(--green-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 24v4a2 2 0 002 2h20a2 2 0 002-2v-4" stroke="var(--green-400)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function HowItWorksSection() {
  const { ref, isVisible } = useInView();

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="relative py-24 lg:py-32"
    >
      {/* Section header */}
      <div className="mx-auto max-w-[1200px] px-6">
        <div className={`text-center ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
          <span className="badge badge-blue mb-4">Просто как 1-2-3</span>
          <h2 className="heading-section" style={{ color: "var(--text-primary)" }}>
            Как это работает
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base" style={{ color: "var(--text-secondary)" }}>
            От фото с телефона до готовой карточки на маркетплейсе за три простых шага
          </p>
        </div>

        {/* Steps grid */}
        <div className="relative mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Connecting glow line (desktop only) */}
          <div className="glow-line absolute top-[60px] left-[16.67%] right-[16.67%] hidden md:block" />

          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`relative ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${(index + 1) * 150}ms` }}
            >
              {/* Card */}
              <div className="glass-card relative z-10 p-8 text-center">
                {/* Step number */}
                <div
                  className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-2xl"
                  style={{
                    background: "var(--gradient-surface)",
                    border: "var(--border-glass)",
                  }}
                >
                  <span
                    className="font-display text-2xl font-bold text-gradient"
                  >
                    {step.number}
                  </span>
                </div>

                {/* Icon */}
                <div className="mx-auto mb-5 flex justify-center">
                  {step.icon}
                </div>

                {/* Text */}
                <h3
                  className="heading-card mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {step.description}
                </p>
              </div>

              {/* Glow dot on the connecting line (desktop only) */}
              <div
                className="absolute top-[56px] left-1/2 -translate-x-1/2 hidden md:block"
                style={{ zIndex: 20 }}
              >
                <div className="glow-dot" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
