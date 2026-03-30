import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";

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

type BillingPeriod = "monthly" | "annual";

const plans = [
  {
    name: "Бесплатный",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Попробуйте без обязательств",
    features: [
      "3 карточки в месяц",
      "Все базовые шаблоны",
      "Удаление фона AI",
      "Водяной знак MarketFoto",
    ],
    cta: "Начать бесплатно",
    popular: false,
    accent: false,
  },
  {
    name: "Стартер",
    monthlyPrice: 499,
    annualPrice: 333,
    description: "Для активных продавцов",
    features: [
      "50 карточек в месяц",
      "Все шаблоны, включая премиум",
      "Удаление фона AI",
      "Без водяного знака",
      "Приоритетная обработка",
    ],
    cta: "Выбрать Стартер",
    popular: true,
    accent: true,
  },
  {
    name: "Бизнес",
    monthlyPrice: 990,
    annualPrice: 659,
    description: "Для магазинов с большим каталогом",
    features: [
      "Безлимит карточек",
      "Все шаблоны, включая премиум",
      "Удаление фона AI",
      "Без водяного знака",
      "Приоритетная обработка",
      "Пакетная загрузка до 50 фото",
    ],
    cta: "Выбрать Бизнес",
    popular: false,
    accent: false,
  },
];

export default function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const { ref, isVisible } = useInView();

  return (
    <section id="pricing" ref={ref} className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1100px] px-6">
        {/* Header */}
        <div className={`text-center ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
          <span className="badge badge-green mb-4">Тарифы</span>
          <h2 className="heading-section" style={{ color: "var(--text-primary)" }}>
            Простое и понятное{" "}
            <span className="text-gradient-green">ценообразование</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base" style={{ color: "var(--text-secondary)" }}>
            Начните бесплатно, масштабируйте по мере роста продаж
          </p>
        </div>

        {/* Month/Year toggle */}
        <div className={`mt-10 flex items-center justify-center gap-3 ${isVisible ? "animate-fade-in-up delay-100" : "opacity-0"}`}>
          <div
            className="inline-flex rounded-full p-1"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <button
              onClick={() => setBillingPeriod("monthly")}
              className="relative rounded-full px-5 py-2 text-sm font-medium transition-all duration-300"
              style={{
                background: billingPeriod === "monthly" ? "var(--gradient-primary)" : "transparent",
                color: billingPeriod === "monthly" ? "white" : "var(--text-secondary)",
              }}
            >
              Месяц
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className="relative rounded-full px-5 py-2 text-sm font-medium transition-all duration-300"
              style={{
                background: billingPeriod === "annual" ? "var(--gradient-primary)" : "transparent",
                color: billingPeriod === "annual" ? "white" : "var(--text-secondary)",
              }}
            >
              Год
            </button>
          </div>
          {billingPeriod === "annual" && (
            <span className="badge badge-green animate-scale-in text-xs">
              -33%
            </span>
          )}
        </div>

        {/* Plan cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${(index + 1) * 150}ms` }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
                  <span
                    className="rounded-full px-4 py-1.5 text-xs font-bold"
                    style={{
                      background: "var(--gradient-primary)",
                      color: "white",
                      boxShadow: "var(--shadow-glow-sm)",
                    }}
                  >
                    Популярный
                  </span>
                </div>
              )}

              <div
                className={`glass-card relative flex h-full flex-col overflow-hidden p-8 ${plan.accent ? "animate-pulse-glow" : ""}`}
                style={
                  plan.accent
                    ? {
                        border: "1px solid rgba(124, 58, 237, 0.4)",
                        background: "rgba(124, 58, 237, 0.06)",
                      }
                    : undefined
                }
              >
                {/* Accent glow at top for popular card */}
                {plan.accent && (
                  <div
                    className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full"
                    style={{
                      background: "radial-gradient(circle, rgba(124, 58, 237, 0.2), transparent 70%)",
                    }}
                  />
                )}

                {/* Plan name + description */}
                <h3
                  className="heading-card"
                  style={{ color: "var(--text-primary)" }}
                >
                  {plan.name}
                </h3>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mt-6 mb-8">
                  {billingPeriod === "annual" && plan.monthlyPrice > 0 && (
                    <span
                      className="mr-2 text-sm line-through"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {plan.monthlyPrice} &#8381;
                    </span>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span
                      className="font-display text-4xl font-bold"
                      style={{
                        color: plan.accent
                          ? "var(--purple-400)"
                          : "var(--text-primary)",
                      }}
                    >
                      {billingPeriod === "monthly"
                        ? plan.monthlyPrice
                        : plan.annualPrice}
                    </span>
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {plan.monthlyPrice === 0 ? "" : " \u20BD/мес"}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="mt-0.5 flex-shrink-0"
                      >
                        <path
                          d="M13.3 4.7l-6 6L4.7 8"
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

                {/* CTA button */}
                <Link
                  to="/auth?mode=register"
                  className={`block w-full text-center text-sm font-semibold ${
                    plan.accent ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* One-time purchase note */}
        <p
          className={`mt-10 text-center text-sm ${isVisible ? "animate-fade-in-up delay-600" : "opacity-0"}`}
          style={{ color: "var(--text-tertiary)" }}
        >
          Или купите 1 карточку за 49 &#8381; без подписки
        </p>
      </div>
    </section>
  );
}
