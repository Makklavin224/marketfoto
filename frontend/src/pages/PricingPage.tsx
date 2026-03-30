import { useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { useAuthStore } from "../stores/auth";
import { paymentsApi, type PaymentVariant } from "../api/payments";

const CHECK_ICON = (
  <svg
    className="w-5 h-5 text-green-500 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
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
  borderColor: string;
  buttonColor: string;
  crossedPrice?: string;
  savings?: string;
}

const PLANS: PlanCard[] = [
  {
    name: "Free",
    planKey: "free",
    monthlyPrice: "0",
    annualPrice: "0",
    annualTotal: "0",
    monthlyVariant: "starter", // unused for free
    annualVariant: "starter", // unused for free
    features: [
      { text: "3 карточки в месяц" },
      { text: "Водяной знак" },
      { text: "Базовые шаблоны" },
    ],
    highlight: false,
    borderColor: "border-gray-200",
    buttonColor: "bg-gray-100 text-gray-600 hover:bg-gray-200",
  },
  {
    name: "Starter",
    planKey: "starter",
    monthlyPrice: "499",
    annualPrice: "3 990",
    annualTotal: "3 990",
    monthlyVariant: "starter",
    annualVariant: "starter_annual",
    crossedPrice: "5 988",
    savings: "33%",
    features: [
      { text: "50 карточек в месяц" },
      { text: "Без водяного знака" },
      { text: "Все шаблоны" },
      { text: "Приоритетная обработка" },
    ],
    highlight: true,
    borderColor: "border-blue-500",
    buttonColor: "bg-blue-600 text-white hover:bg-blue-700",
  },
  {
    name: "Business",
    planKey: "business",
    monthlyPrice: "990",
    annualPrice: "7 900",
    annualTotal: "7 900",
    monthlyVariant: "business",
    annualVariant: "business_annual",
    crossedPrice: "11 880",
    savings: "34%",
    features: [
      { text: "200 карточек в месяц" },
      { text: "Без водяного знака" },
      { text: "Все шаблоны" },
      { text: "Приоритетная обработка" },
      { text: "Пакетная загрузка", badge: "скоро" },
    ],
    highlight: false,
    borderColor: "border-purple-500",
    buttonColor: "bg-purple-600 text-white hover:bg-purple-700",
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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Тарифы</h1>
          <p className="text-gray-600">Выберите подходящий план</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            type="button"
            onClick={() => setIsAnnual(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !isAnnual
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Ежемесячно
          </button>
          <button
            type="button"
            onClick={() => setIsAnnual(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isAnnual
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Ежегодно
          </button>
          {isAnnual && (
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
              Выгоднее
            </span>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {PLANS.map((plan) => {
            const isCurrent = isCurrentPlan(plan.planKey);
            const variant = isAnnual
              ? plan.annualVariant
              : plan.monthlyVariant;
            const isFree = plan.planKey === "free";

            return (
              <div
                key={plan.planKey}
                className={`bg-white rounded-2xl shadow-sm border-2 p-6 flex flex-col ${
                  plan.borderColor
                } ${plan.highlight ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
              >
                {/* Plan name */}
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    {plan.name}
                  </h3>
                  {plan.highlight && (
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      Популярный
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mb-6">
                  {isFree ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">
                        0
                      </span>
                      <span className="text-gray-500">р/мес</span>
                    </div>
                  ) : isAnnual ? (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-gray-900">
                          {plan.annualPrice}
                        </span>
                        <span className="text-gray-500">р/год</span>
                      </div>
                      {plan.crossedPrice && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-400 line-through">
                            {plan.crossedPrice} р
                          </span>
                          {plan.savings && (
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              Экономия {plan.savings}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">
                        {plan.monthlyPrice}
                      </span>
                      <span className="text-gray-500">р/мес</span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-2">
                      {CHECK_ICON}
                      <span className="text-sm text-gray-700">
                        {feature.text}
                      </span>
                      {feature.badge && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
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
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      isCurrent
                        ? "bg-green-50 text-green-600 cursor-default"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isCurrent ? "Текущий план" : "Бесплатный"}
                  </button>
                ) : isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3 rounded-lg font-medium bg-green-50 text-green-600 cursor-default flex items-center justify-center gap-2"
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
                    className={`w-full py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center ${plan.buttonColor}`}
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

        {/* One-time purchase */}
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Или купите разово
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Без подписки, без водяного знака
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl font-bold text-gray-900">
              1 карточка — 49 р
            </span>
          </div>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => handleSubscribe("one_time")}
            className="mt-4 px-8 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center mx-auto"
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
