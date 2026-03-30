import { useState } from "react";
import { Link } from "react-router";

export default function HeroSection() {
  const [sliderValue, setSliderValue] = useState(50);

  return (
    <section id="hero" className="bg-white">
      {/* Navigation bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="/" className="text-xl font-bold text-gray-900">
            MarketFoto
          </a>
          <div className="flex items-center gap-4">
            <Link
              to="/auth"
              className="text-sm text-gray-700 hover:text-blue-600"
            >
              Войти
            </Link>
            <Link
              to="/auth?mode=register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Попробовать бесплатно
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero content */}
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-16">
        <div className="lg:flex lg:items-center lg:gap-12">
          {/* Text column */}
          <div className="mb-10 lg:mb-0 lg:flex-1">
            <h1 className="text-4xl font-bold leading-tight text-gray-900 lg:text-5xl">
              Профессиональные карточки для WB и Ozon за 30 секунд
            </h1>
            <p className="mt-4 max-w-lg text-lg text-gray-600">
              Загрузите фото товара — AI уберёт фон, вы выберете шаблон с
              инфографикой и скачаете готовую карточку. Без фотографа и
              дизайнера.
            </p>
            <Link
              to="/auth?mode=register"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-8 py-4 text-lg text-white shadow-lg hover:bg-blue-700"
            >
              Попробовать бесплатно
            </Link>
            <p className="mt-2 text-sm text-gray-500">
              3 карточки бесплатно, без карты
            </p>
          </div>

          {/* Before/After slider */}
          <div className="lg:flex-1">
            <div className="relative mx-auto aspect-[3/4] max-w-md overflow-hidden rounded-2xl shadow-2xl">
              {/* "Before" layer */}
              <div className="absolute inset-0 flex items-center justify-center bg-gray-300">
                <div className="text-center">
                  <span className="text-4xl">📱</span>
                  <p className="mt-2 font-medium text-gray-600">
                    Фото с телефона
                  </p>
                </div>
              </div>

              {/* "After" layer — clipped by slider */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600"
                style={{
                  clipPath: `inset(0 0 0 ${sliderValue}%)`,
                }}
              >
                <div className="text-center">
                  <span className="text-4xl">✨</span>
                  <p className="mt-2 font-medium text-white">
                    Готовая карточка
                  </p>
                  <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs text-white">
                    WB 900x1200
                  </span>
                </div>
              </div>

              {/* Divider line */}
              <div
                className="absolute top-0 h-full w-0.5 bg-white"
                style={{ left: `${sliderValue}%` }}
              />

              {/* Range slider */}
              <input
                type="range"
                min={0}
                max={100}
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="absolute bottom-4 left-1/2 w-3/4 -translate-x-1/2 accent-blue-600"
              />

              {/* Labels */}
              <span className="absolute top-3 left-3 rounded-full bg-black/40 px-2 py-0.5 text-xs text-white">
                До
              </span>
              <span className="absolute top-3 right-3 rounded-full bg-black/40 px-2 py-0.5 text-xs text-white">
                После
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
