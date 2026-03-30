import { useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { useAuthStore } from "../stores/auth";
import { paymentsApi, type PaymentVariant } from "../api/payments";

const CHECK_ICON = (
  <svg
    className="w-5 h-5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    style={{ color: "var(--green-400)" }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

interface PlanFeature {
  text: string;
  badge?: string;
}

interface PlanCard {
  name: string;
  planKey: string;
  monthlyPrice: string;
  annualPrice: string;
  annualTotal: string;
  monthlyVariant: PaymentVariant;
  annualVariant: PaymentVariant;
  features: PlanFeature[];
  highlight: boolean;
  accentColor: string;
}

const PLANS: PlanCard[] = [
  {
    name: "Free",
    planKey: "free",
    monthlyPrice: "0",
    annualPrice: "0",
    annualTotal: "0",
    monthlyVariant: "starter",
    annualVariant: "starter",
    features: [
      { text: "3 карточки в месяц" },
      { text: "Водяной знак" },
      { text: "Базовые шаблоны" },
    ],
    highlight: false,
    accentColor: "var(--text-tertiary)",
  },
  {
    name: "Starter",
    planKey: "starter",
    monthlyPrice: "499",
    annualPrice: "3 990",
    annualTotal: "3 990",
    monthlyVariant: "starter",
    annualVariant: "starter_annual",
    features: [
      { text: "50 карточек в месяц" },
      { text: "Без водяного знака" },
      { text: "Все шаблоны" },
      { text: "Приоритетная обработка" },
    ],
    highlight: true,
    accentColor: "var(--purple-500)",
  },
  {
    name: "Business",
    planKey: "business",
    monthlyPrice: "990",
    annualPrice: "7 900",
    annualTotal: "7 900",
    monthlyVariant: "business",
    annualVariant: "business_annual",
    features: [
      { text: "200 карточек в месяц" },
      { text: "Без водяного знака" },
      { text: "Все шаблоны" },
      { text: "Приоритетная обработка" },
      { text: "Пакетная загрузка", badge: "скоро" },
    ],
    highlight: false,
    accentColor: "var(--blue-500)",
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState<PaymentVariant | null>(null);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const handleSubscribe = async (variant: PaymentVariant) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoading(variant);
    try {
      const { data } = await paymentsApi.create(variant);
      window.location.href = data.confirmation_url;
    } catch {
      toast.error("Ошибка при создании платежа");
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (planKey: string) => {
    return user?.plan === planKey;
  };

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "var(--bg-primary)" }}>
      <div className="bg-mesh" />
      <div className="max-w-5xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in-up">
          <h1 className="heading-section mb-3" style={{ color: "var(--text-primary)" }}>
            Тарифы
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>Выберите подходящий план</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10 animate-fade-in-up delay-100">
          <button
            type="button"
            onClick={() => setIsAnnual(false)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: !isAnnual ? "var(--gradient-primary)" : "rgba(255, 255, 255, 0.06)",
              color: !isAnnual ? "white" : "var(--text-secondary)",
              border: !isAnnual ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            Ежемесячно
          </button>
          <button
            type="button"
            onClick={() => setIsAnnual(true)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: isAnnual ? "var(--gradient-primary)" : "rgba(255, 255, 255, 0.06)",
              color: isAnnual ? "white" : "var(--text-secondary)",
              border: isAnnual ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            Ежегодно
          </button>
          {isAnnual && (
            <span className="badge badge-green text-xs">
              Выгоднее
            </span>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {PLANS.map((plan, idx) => {
            const isCurrent = isCurrentPlan(plan.planKey);
            const variant = isAnnual
              ? plan.annualVariant
              : plan.monthlyVariant;
            const isFree = plan.planKey === "free";

            return (
              <div
                key={plan.planKey}
                className={`glass-card-static p-6 flex flex-col animate-fade-in-up relative overflow-hidden ${
                  plan.highlight ? "animate-pulse-glow" : ""
                }`}
                style={{
                  animationDelay: `${(idx + 2) * 100}ms`,
                  border: plan.highlight
                    ? "1px solid rgba(124, 58, 237, 0.4)"
                    : "var(--border-subtle)",
                }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: plan.highlight ? "var(--gradient-primary)" : "transparent" }}
                />

                {/* Plan name */}
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="heading-card" style={{ color: "var(--text-primary)" }}>
                    {plan.name}
                  </h3>
                  {plan.highlight && (
                    <span className="badge badge-purple text-xs">
                      Популярный
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mb-6">
                  {isFree ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gradient">
                        0
                      </span>
                      <span style={{ color: "var(--text-tertiary)" }}>р/мес</span>
                    </div>
                  ) : isAnnual ? (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
                          {plan.annualPrice}
                        </span>
                        <span style={{ color: "var(--text-tertiary)" }}>р/год</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-sm line-through"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {plan.planKey === "starter" ? "5 988" : "11 880"} р
                        </span>
                        <span className="badge badge-green text-xs">
                          Экономия {plan.planKey === "starter" ? "33%" : "34%"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
                        {plan.monthlyPrice}
                      </span>
                      <span style={{ color: "var(--text-tertiary)" }}>р/мес</span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-2">
                      {CHECK_ICON}
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {feature.text}
                      </span>
                      {feature.badge && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            background: "rgba(255, 255, 255, 0.06)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {feature.badge}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Button */}
                {isFree ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3 rounded-full font-medium font-display text-sm"
                    style={{
                      background: isCurrent
                        ? "rgba(16, 185, 129, 0.1)"
                        : "rgba(255, 255, 255, 0.04)",
                      color: isCurrent
                        ? "var(--green-400)"
                        : "var(--text-muted)",
                      cursor: "default",
                    }}
                  >
                    {isCurrent ? "Текущий план" : "Бесплатный"}
                  </button>
                ) : isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3 rounded-full font-medium font-display text-sm flex items-center justify-center gap-2"
                    style={{
                      background: "rgba(16, 185, 129, 0.1)",
                      color: "var(--green-400)",
                      cursor: "default",
                    }}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Текущий план
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={loading !== null}
                    onClick={() => handleSubscribe(variant)}
                    className={`w-full py-3 rounded-full font-medium font-display text-sm transition-all disabled:opacity-50 flex items-center justify-center ${
                      plan.highlight ? "btn-primary" : "btn-secondary"
                    }`}
                  >
                    {loading === variant ? (
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      `Подключить ${plan.name}`
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Glow separator */}
        <div className="glow-line mb-12" />

        {/* One-time purchase */}
        <div className="max-w-md mx-auto glass-card-static p-6 text-center animate-fade-in-up delay-500">
          <h3 className="heading-card mb-1" style={{ color: "var(--text-primary)" }}>
            Или купите разово
          </h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-tertiary)" }}>
            Без подписки, без водяного знака
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              1 карточка — 49 р
            </span>
          </div>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => handleSubscribe("one_time")}
            className="btn-secondary mt-4 px-8 py-3 font-medium disabled:opacity-50 flex items-center justify-center mx-auto"
          >
            {loading === "one_time" ? (
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              "Купить"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
