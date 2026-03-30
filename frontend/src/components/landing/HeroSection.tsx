import { useState, useRef, useCallback } from "react";
import { Link } from "react-router";

export default function HeroSection() {
  const [sliderValue, setSliderValue] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updateSlider = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderValue(Math.round((x / rect.width) * 100));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateSlider(e.clientX);
    },
    [updateSlider],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      updateSlider(e.clientX);
    },
    [updateSlider],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <section id="hero" className="relative overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{
        background: "rgba(9, 9, 11, 0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <a href="/" className="font-display text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            <span className="text-gradient">Market</span>Foto
          </a>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="btn-ghost hidden text-sm sm:inline-block">
              Войти
            </Link>
            <Link to="/auth?mode=register" className="btn-primary text-sm">
              Попробовать бесплатно
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero content */}
      <div className="mx-auto max-w-[1200px] px-6 pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="flex flex-col items-center gap-16 lg:flex-row lg:gap-20">
          {/* Left column — text */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2">
              <span className="badge badge-purple">
                <span className="glow-dot" style={{ width: 6, height: 6 }} />
                AI-powered
              </span>
            </div>

            {/* Headline */}
            <h1 className="heading-hero animate-fade-in-up delay-100">
              <span style={{ color: "var(--text-primary)" }}>
                Карточки для маркетплейсов{" "}
              </span>
              <span className="text-gradient">за 30 секунд</span>
            </h1>

            {/* Subheading */}
            <p
              className="animate-fade-in-up delay-200 mx-auto mt-6 max-w-xl text-lg leading-relaxed lg:mx-0 lg:text-xl"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
            >
              Загрузите фото товара — AI уберёт фон, вы выберете шаблон
              с инфографикой и скачаете готовую карточку. Без фотографа
              и дизайнера.
            </p>

            {/* CTA buttons */}
            <div className="animate-fade-in-up delay-300 mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Link to="/auth?mode=register" className="btn-primary text-base">
                Создать карточку бесплатно
              </Link>
              <a href="#how-it-works" className="btn-secondary text-base">
                Как это работает
              </a>
            </div>

            {/* Social proof */}
            <div
              className="animate-fade-in-up delay-400 mt-8 flex flex-wrap items-center justify-center gap-6 lg:justify-start"
              style={{ color: "var(--text-tertiary)" }}
            >
              <div className="flex items-center gap-2 text-sm">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1l2.12 4.3 4.74.69-3.43 3.34.81 4.72L8 11.74l-4.24 2.23.81-4.72L1.14 5.91l4.74-.69L8 1z" fill="var(--yellow-400)" />
                </svg>
                <span>3 карточки бесплатно</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.3 4.7l-6 6L4.7 8" stroke="var(--green-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Без привязки карты</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="3" fill="var(--purple-400)" opacity="0.6" />
                  <circle cx="8" cy="8" r="6" stroke="var(--purple-400)" strokeWidth="1" opacity="0.3" />
                </svg>
                <span>BiRefNet нейросеть</span>
              </div>
            </div>
          </div>

          {/* Right column — Before/After slider */}
          <div className="animate-fade-in-up delay-300 w-full max-w-md flex-shrink-0 lg:w-[440px]">
            <div
              ref={sliderRef}
              className="group relative aspect-[3/4] cursor-ew-resize select-none overflow-hidden"
              style={{
                borderRadius: "var(--radius-xl)",
                border: "var(--border-glass)",
                boxShadow: "var(--shadow-glow)",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* "Before" layer — raw phone photo placeholder */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <rect x="10" y="4" width="20" height="32" rx="4" stroke="var(--text-tertiary)" strokeWidth="1.5" />
                      <circle cx="20" cy="20" r="5" stroke="var(--text-tertiary)" strokeWidth="1.5" />
                      <rect x="16" y="6" width="8" height="2" rx="1" fill="var(--text-tertiary)" opacity="0.5" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>
                    Фото с телефона
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    Любой ракурс, любой фон
                  </p>
                </div>
              </div>

              {/* "After" layer — finished marketplace card */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, var(--purple-600) 0%, var(--blue-600) 100%)",
                  clipPath: `inset(0 0 0 ${sliderValue}%)`,
                }}
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.15)" }}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <rect x="4" y="4" width="32" height="32" rx="4" stroke="white" strokeWidth="1.5" />
                      <path d="M12 28l6-8 4 5 4-3 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="26" cy="14" r="3" stroke="white" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    Готовая карточка
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ background: "rgba(255,255,255,0.2)" }}>
                      WB 900x1200
                    </span>
                  </div>
                </div>
              </div>

              {/* Slider divider line */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-10 w-[2px]"
                style={{
                  left: `${sliderValue}%`,
                  background: "linear-gradient(180deg, var(--purple-400), var(--blue-400))",
                  boxShadow: "0 0 12px rgba(139, 92, 246, 0.5)",
                }}
              />

              {/* Slider handle */}
              <div
                className="pointer-events-none absolute top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                style={{
                  left: `${sliderValue}%`,
                  background: "rgba(9, 9, 11, 0.8)",
                  border: "2px solid var(--purple-400)",
                  boxShadow: "0 0 20px rgba(139, 92, 246, 0.4)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M5 3l-3 5 3 5M11 3l3 5-3 5" stroke="var(--purple-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* Labels */}
              <span
                className="absolute top-4 left-4 z-10 rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: "rgba(9,9,11,0.7)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                До
              </span>
              <span
                className="absolute top-4 right-4 z-10 rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: "rgba(9,9,11,0.7)", color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                После
              </span>
            </div>

            {/* Floating marketplace badges around the slider */}
            <div className="relative mt-6 flex items-center justify-center gap-3">
              <span className="badge badge-wb animate-float text-xs" style={{ animationDelay: "0s" }}>Wildberries</span>
              <span className="badge badge-ozon animate-float text-xs" style={{ animationDelay: "2s" }}>Ozon</span>
              <span className="badge badge-ym animate-float text-xs" style={{ animationDelay: "4s" }}>Яндекс.Маркет</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade to next section */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
        style={{ background: "linear-gradient(to top, var(--bg-primary), transparent)" }}
      />
    </section>
  );
}
