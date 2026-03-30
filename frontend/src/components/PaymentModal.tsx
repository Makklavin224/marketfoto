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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
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
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-7 h-7 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3m0 3h.01M12 2l10 18H2L12 2z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-1">
          Карточки закончились
        </h2>
        <p className="text-gray-500 text-sm text-center mb-6">
          У вас 0 карточек. Выберите способ продолжить:
        </p>

        {/* One-time purchase option */}
        <div className="border border-gray-200 rounded-xl p-4 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">1 карточка</p>
              <p className="text-2xl font-bold text-gray-900">
                49 <span className="text-base font-normal text-gray-500">р</span>
              </p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleOneTime}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center"
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
          <p className="text-sm text-gray-500 mb-2">
            Или подключите подписку от 499 р/мес
          </p>
          <button
            type="button"
            onClick={handleViewPricing}
            className="text-blue-600 font-medium text-sm hover:text-blue-700 transition-colors"
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
