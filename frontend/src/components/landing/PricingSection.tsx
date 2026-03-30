import { useState } from "react";
import { Link } from "react-router";

type BillingPeriod = "monthly" | "annual";

export default function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  const plans = [
    {
      name: "Бесплатный",
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        "3 карточки в месяц",
        "Все шаблоны (базовые)",
        "Удаление фона AI",
        "Водяной знак",
      ],
      cta: "Начать бесплатно",
      popular: false,
      highlighted: false,
    },
    {
      name: "Стартер",
      monthlyPrice: 499,
      annualPrice: 333,
      features: [
        "50 карточек в месяц",
        "Все шаблоны (включая премиум)",
        "Удаление фона AI",
        "Без водяного знака",
        "Приоритетная обработка",
      ],
      cta: "Выбрать Стартер",
      popular: true,
      highlighted: true,
    },
    {
      name: "Бизнес",
      monthlyPrice: 990,
      annualPrice: 659,
      features: [
        "Безлимит карточек",
        "Все шаблоны (включая премиум)",
        "Удаление фона AI",
        "Без водяного знака",
        "Приоритетная обработка",
        "Пакетная загрузка",
      ],
      cta: "Выбрать Бизнес",
      popular: false,
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="bg-gray-50 py-16">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="mb-4 text-center text-3xl font-bold text-gray-900">
          Тарифы
        </h2>

        {/* Month/Year toggle */}
        <div className="mb-12 flex items-center justify-center gap-3">
          <div className="inline-flex rounded-full bg-gray-200 p-1">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                billingPeriod === "monthly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                billingPeriod === "annual"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              Год
            </button>
          </div>
          {billingPeriod === "annual" && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              Экономия 33%
            </span>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl bg-white p-6 ${
                plan.highlighted
                  ? "border-2 border-blue-500"
                  : "border border-gray-200"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                  Популярный
                </span>
              )}

              <h3 className="text-lg font-semibold text-gray-900">
                {plan.name}
              </h3>

              <div className="mt-4">
                {billingPeriod === "annual" && plan.monthlyPrice > 0 && (
                  <span className="text-sm text-gray-400 line-through">
                    {plan.monthlyPrice} &#8381;
                  </span>
                )}
                <span
                  className={`text-4xl font-bold ${
                    plan.highlighted ? "text-blue-600" : "text-gray-900"
                  }`}
                >
                  {billingPeriod === "monthly"
                    ? plan.monthlyPrice
                    : plan.annualPrice}{" "}
                  &#8381;
                </span>
                <span className="text-gray-500">/мес</span>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-gray-700"
                  >
                    <svg
                      className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
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
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/auth?mode=register"
                className={`mt-6 block w-full rounded-lg py-3 text-center text-sm font-medium ${
                  plan.highlighted
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* One-time purchase note */}
        <p className="mt-8 text-center text-gray-600">
          Или купите 1 карточку за 49 &#8381; без подписки
        </p>
      </div>
    </section>
  );
}
