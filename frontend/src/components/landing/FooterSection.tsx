export default function FooterSection() {
  return (
    <footer className="bg-gray-900 py-12 text-gray-400">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Branding */}
          <div>
            <h3 className="mb-2 text-xl font-bold text-white">MarketFoto</h3>
            <p className="text-sm">
              Создавайте профессиональные карточки для маркетплейсов за секунды
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase text-gray-300">
              Навигация
            </h4>
            <a
              href="#hero"
              className="mb-2 block text-sm text-gray-400 hover:text-white"
            >
              О сервисе
            </a>
            <a
              href="#pricing"
              className="mb-2 block text-sm text-gray-400 hover:text-white"
            >
              Тарифы
            </a>
            <a
              href="#faq"
              className="mb-2 block text-sm text-gray-400 hover:text-white"
            >
              FAQ
            </a>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase text-gray-300">
              Поддержка
            </h4>
            <a
              href="mailto:support@marketfoto.ru"
              className="mb-2 block text-sm text-gray-400 hover:text-white"
            >
              support@marketfoto.ru
            </a>
            <a
              href="/privacy"
              className="mb-2 block text-sm text-gray-400 hover:text-white"
            >
              Политика конфиденциальности
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-gray-800 pt-8">
          <p className="text-center text-sm text-gray-500">
            2026 MarketFoto. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}
