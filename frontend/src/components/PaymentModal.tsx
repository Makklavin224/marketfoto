import { useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { paymentsApi } from "../api/payments";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentModal({ isOpen, onClose }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleOneTime = async () => {
    setLoading(true);
    try {
      const { data } = await paymentsApi.create("one_time");
      window.location.href = data.confirmation_url;
    } catch {
      toast.error("Ошибка при создании платежа");
    } finally {
      setLoading(false);
    }
  };

  const handleViewPricing = () => {
    onClose();
    navigate("/pricing");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop — dark with blur */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{
          background: "rgba(9, 9, 11, 0.75)",
          backdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      />

      {/* Modal card — glass */}
      <div
        className="relative glass-card-static max-w-sm w-full mx-4 p-6 animate-scale-in"
        style={{
          border: "var(--border-glass)",
          boxShadow: "var(--shadow-glow), 0 25px 50px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 transition-colors rounded-lg p-1"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-tertiary)";
            e.currentTarget.style.background = "transparent";
          }}
          aria-label="Закрыть"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Warning icon */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: "rgba(251, 146, 60, 0.12)",
            border: "1px solid rgba(251, 146, 60, 0.25)",
          }}
        >
          <svg
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ color: "var(--orange-400)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3m0 3h.01M12 2l10 18H2L12 2z"
            />
          </svg>
        </div>

        <h2 className="heading-card text-center mb-1" style={{ color: "var(--text-primary)" }}>
          Карточки закончились
        </h2>
        <p className="text-sm text-center mb-6" style={{ color: "var(--text-tertiary)" }}>
          У вас 0 карточек. Выберите способ продолжить:
        </p>

        {/* One-time purchase option */}
        <div
          className="rounded-xl p-4 mb-3"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>1 карточка</p>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                49 <span className="text-base font-normal" style={{ color: "var(--text-tertiary)" }}>р</span>
              </p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleOneTime}
              className="btn-primary px-6 py-2.5 font-medium disabled:opacity-50 flex items-center text-sm"
            >
              {loading ? (
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

        {/* Subscription option */}
        <div className="text-center">
          <p className="text-sm mb-2" style={{ color: "var(--text-tertiary)" }}>
            Или подключите подписку от 499 р/мес
          </p>
          <button
            type="button"
            onClick={handleViewPricing}
            className="font-medium text-sm transition-colors"
            style={{ color: "var(--purple-400)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--purple-500)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--purple-400)")}
          >
            Смотреть тарифы
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Convenience hook for managing PaymentModal open/close state.
 * Used by editor/render pages (Phase 7) to show modal when credits_remaining === 0.
 */
export function usePaymentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  return { isOpen, open, close };
}
