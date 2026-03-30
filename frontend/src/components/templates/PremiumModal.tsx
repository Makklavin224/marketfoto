import { useNavigate } from "react-router";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateName: string;
}

export default function PremiumModal({
  isOpen,
  onClose,
  templateName,
}: PremiumModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm mx-4 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lock icon */}
        <div className="flex justify-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-500"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mt-4">
          Премиум шаблон
        </h3>

        <p className="text-sm text-gray-600 mt-2">
          Шаблон &laquo;{templateName}&raquo; доступен по подписке. Оформите
          подписку для доступа ко всем шаблонам.
        </p>

        <button
          onClick={() => navigate("/pricing")}
          className="mt-4 w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Оформить подписку
        </button>

        <button
          onClick={onClose}
          className="mt-2 w-full text-gray-500 py-2 text-sm hover:text-gray-700 transition-colors"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
