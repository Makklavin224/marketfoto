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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="bg-mesh" />
        <div className="text-center relative animate-fade-in-up">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full mx-auto mb-4 animate-pulse-glow"
            style={{ background: "rgba(124, 58, 237, 0.12)" }}
          >
            <svg
              className="animate-spin h-8 w-8"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              style={{ color: "var(--purple-400)" }}
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
          </div>
          <p className="text-lg" style={{ color: "var(--text-secondary)" }}>Обрабатываем платеж...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <div className="bg-mesh" />
      <div className="max-w-md w-full glass-card-static p-8 text-center mx-4 relative animate-scale-in">
        {/* Animated green checkmark */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{
            background: "rgba(16, 185, 129, 0.12)",
            border: "2px solid rgba(16, 185, 129, 0.25)",
            boxShadow: "0 0 40px rgba(16, 185, 129, 0.2), 0 0 80px rgba(16, 185, 129, 0.1)",
            animation: "scaleIn 0.5s ease-out forwards, pulse-glow-green 2s ease-in-out infinite 0.5s",
          }}
        >
          <svg
            className="w-10 h-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            style={{ color: "var(--green-400)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
              style={{
                strokeDasharray: 30,
                strokeDashoffset: 0,
                animation: "checkDraw 0.6s ease-out 0.3s both",
              }}
            />
          </svg>
        </div>

        <style>{`
          @keyframes checkDraw {
            from { stroke-dashoffset: 30; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes pulse-glow-green {
            0%, 100% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.15), 0 0 60px rgba(16, 185, 129, 0.05); }
            50% { box-shadow: 0 0 50px rgba(16, 185, 129, 0.3), 0 0 100px rgba(16, 185, 129, 0.1); }
          }
        `}</style>

        <h1 className="heading-section text-2xl mb-2" style={{ color: "var(--text-primary)" }}>
          Оплата прошла успешно!
        </h1>

        {user && (
          <div className="space-y-2 mb-8">
            <p style={{ color: "var(--text-secondary)" }}>
              Ваш тариф:{" "}
              <span className="font-semibold text-gradient">
                {PLAN_NAMES[user.plan] || user.plan}
              </span>
            </p>
            <p style={{ color: "var(--text-secondary)" }}>
              Доступно карточек:{" "}
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {user.credits_remaining}
              </span>
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate("/editor")}
            className="btn-primary w-full py-3 text-center"
          >
            Создать карточку
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="btn-secondary w-full py-3"
          >
            На главную
          </button>
        </div>
      </div>
    </div>
  );
}
