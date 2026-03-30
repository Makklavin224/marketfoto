import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "../stores/auth";

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  business: "Business",
};

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const initialize = useAuthStore((s) => s.initialize);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Refresh user data immediately (webhook may have already processed)
    initialize().finally(() => setIsLoading(false));

    // Retry after 3 seconds in case webhook was delayed
    const timer = setTimeout(() => {
      initialize();
    }, 3000);

    // Stop loading after 5 seconds no matter what
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(loadingTimer);
    };
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4"
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
          <p className="text-gray-600 text-lg">Обрабатываем платеж...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Green checkmark */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Оплата прошла успешно!
        </h1>

        {user && (
          <div className="space-y-2 mb-8">
            <p className="text-gray-600">
              Ваш тариф:{" "}
              <span className="font-semibold text-gray-900">
                {PLAN_NAMES[user.plan] || user.plan}
              </span>
            </p>
            <p className="text-gray-600">
              Доступно карточек:{" "}
              <span className="font-semibold text-gray-900">
                {user.credits_remaining}
              </span>
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate("/editor")}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Создать карточку
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            На главную
          </button>
        </div>
      </div>
    </div>
  );
}
