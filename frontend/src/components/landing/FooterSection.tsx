export default function FooterSection() {
  return (
    <footer className="relative">
      {/* Top gradient separator line */}
      <div className="glow-line" />

      <div
        className="py-12 lg:py-16"
        style={{ background: "rgba(9, 9, 11, 0.6)" }}
      >
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {/* Branding */}
            <div>
              <a href="/" className="font-display text-xl font-bold">
                <span className="text-gradient">Market</span>
                <span style={{ color: "var(--text-primary)" }}>Foto</span>
              </a>
              <p
                className="mt-3 max-w-xs text-sm leading-relaxed"
                style={{ color: "var(--text-tertiary)" }}
              >
                Превращаем фото с телефона в продающие карточки для маркетплейсов
                за секунды. AI-powered.
              </p>
              {/* Marketplace badges */}
              <div className="mt-4 flex items-center gap-2">
                <span className="badge badge-wb text-[10px]">WB</span>
                <span className="badge badge-ozon text-[10px]">Ozon</span>
                <span className="badge badge-ym text-[10px]">ЯМ</span>
              </div>
            </div>

            {/* Navigation */}
            <div>
              <h4
                className="mb-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}
              >
                Навигация
              </h4>
              <nav className="flex flex-col gap-2.5">
                <a
                  href="#hero"
                  className="text-sm transition-colors duration-200"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--purple-400)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                  О сервисе
                </a>
                <a
                  href="#how-it-works"
                  className="text-sm transition-colors duration-200"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--purple-400)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                  Как это работает
                </a>
                <a
                  href="#pricing"
                  className="text-sm transition-colors duration-200"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--purple-400)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                  Тарифы
                </a>
                <a
                  href="#faq"
                  className="text-sm transition-colors duration-200"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--purple-400)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                  FAQ
                </a>
              </nav>
            </div>

            {/* Support */}
            <div>
              <h4
                className="mb-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}
              >
                Поддержка
              </h4>
              <nav className="flex flex-col gap-2.5">
                <a
                  href="mailto:support@marketfoto.ru"
                  className="inline-flex items-center gap-2 text-sm transition-colors duration-200"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--purple-400)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="2.5" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1" />
                    <path d="M1 4.5l6 3.5 6-3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                  support@marketfoto.ru
                </a>
                <a
                  href="/privacy"
                  className="text-sm transition-colors duration-200"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--purple-400)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                  Политика конфиденциальности
                </a>
                <a
                  href="/terms"
                  className="text-sm transition-colors duration-200"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--purple-400)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                  Пользовательское соглашение
                </a>
              </nav>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="mt-12 flex flex-col items-center justify-between gap-4 pt-8 sm:flex-row"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              &copy; 2026 MarketFoto. Все права защищены.
            </p>
            <div className="flex items-center gap-1.5">
              <span className="glow-dot" style={{ width: 4, height: 4 }} />
              <span
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Сделано с AI
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
