import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../stores/auth";

function pluralCredits(n: number): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return "карточек";
  if (lastDigit > 1 && lastDigit < 5) return "карточки";
  if (lastDigit === 1) return "карточка";
  return "карточек";
}

const planLabels: Record<string, { label: string; className: string }> = {
  free: {
    label: "Бесплатный",
    className: "bg-gray-100 text-gray-600",
  },
  starter: {
    label: "Стартер",
    className: "bg-blue-100 text-blue-700",
  },
  business: {
    label: "Бизнес",
    className: "bg-purple-100 text-purple-700",
  },
};

export default function UserBadge() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const displayName = user.full_name || user.email;
  const initial = (user.full_name || user.email).charAt(0).toUpperCase();
  const defaultPlan = { label: "Бесплатный", className: "bg-gray-100 text-gray-600" };
  const plan = planLabels[user.plan] ?? defaultPlan;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
          {initial}
        </div>

        {/* Name + Plan */}
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-medium text-gray-900 leading-tight">
            {displayName}
          </span>
          <span className="text-xs text-gray-500 leading-tight">
            Осталось {user.credits_remaining} {pluralCredits(user.credits_remaining)}
          </span>
        </div>

        {/* Plan badge */}
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${plan.className}`}
        >
          {plan.label}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            type="button"
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setIsOpen(false)}
          >
            Мой аккаунт
          </button>
          <button
            type="button"
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setIsOpen(false)}
          >
            Тарифы
          </button>
          <hr className="my-1 border-gray-100" />
          <button
            type="button"
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}
