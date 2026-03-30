import { useState, useEffect, useRef } from "react";

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

const faqItems = [
  {
    question: "Какие форматы фото поддерживаются?",
    answer:
      "JPG, PNG и WebP. Максимальный размер файла — 10 МБ. Минимальное разрешение — 200x200 пикселей. Рекомендуем загружать фото от 1000 пикселей по длинной стороне для лучшего качества.",
  },
  {
    question: "Сколько стоит сервис?",
    answer:
      "Есть бесплатный тариф на 3 карточки в месяц. Стартер — 499 \u20BD/мес за 50 карточек. Бизнес — 990 \u20BD/мес без ограничений. Также можно купить одну карточку за 49 \u20BD без подписки.",
  },
  {
    question: "Какое качество удаления фона?",
    answer:
      "Мы используем нейросеть BiRefNet — одну из лучших на рынке. Качество сопоставимо с ручной обработкой в Photoshop для большинства товаров. Особенно хорошо работает с одеждой, электроникой и упаковкой.",
  },
  {
    question: "Как быстро готова карточка?",
    answer:
      "Удаление фона занимает 5-10 секунд. Весь процесс от загрузки фото до скачивания готовой карточки — около 30 секунд. На тарифах Стартер и Бизнес обработка ещё быстрее.",
  },
  {
    question: "Для каких маркетплейсов подходит?",
    answer:
      "Wildberries (900x1200), Ozon (1200x1200) и Яндекс.Маркет (800x800). Размеры подставляются автоматически при выборе маркетплейса. Шаблоны адаптированы под требования каждой площадки.",
  },
  {
    question: "Как оплатить?",
    answer:
      "Банковской картой через ЮKassa. Поддерживаются Visa, MasterCard и МИР. Подписка продлевается автоматически, отменить можно в любой момент из личного кабинета.",
  },
  {
    question: "Можно ли редактировать шаблон?",
    answer:
      "Да! После выбора шаблона вы попадаете в canvas-редактор, где можете изменить текст, переместить элементы, добавить бейджи с характеристиками и настроить цвета под свой бренд.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { ref, isVisible } = useInView();

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" ref={ref} className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[720px] px-6">
        {/* Header */}
        <div className={`text-center ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
          <span className="badge badge-purple mb-4">FAQ</span>
          <h2 className="heading-section" style={{ color: "var(--text-primary)" }}>
            Частые вопросы
          </h2>
        </div>

        {/* Accordion */}
        <div className={`mt-12 ${isVisible ? "animate-fade-in-up delay-200" : "opacity-0"}`}>
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="group"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <button
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between py-5 text-left transition-colors duration-200"
                >
                  <span
                    className="pr-4 text-base font-medium transition-colors duration-200"
                    style={{
                      fontFamily: "var(--font-body)",
                      color: isOpen ? "var(--purple-400)" : "var(--text-primary)",
                    }}
                  >
                    {item.question}
                  </span>

                  {/* Chevron */}
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-300"
                    style={{
                      background: isOpen ? "rgba(124, 58, 237, 0.15)" : "rgba(255,255,255,0.04)",
                      border: isOpen
                        ? "1px solid rgba(124, 58, 237, 0.3)"
                        : "1px solid rgba(255,255,255,0.08)",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M3.5 5.25L7 8.75l3.5-3.5"
                        stroke={isOpen ? "var(--purple-400)" : "var(--text-tertiary)"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </button>

                {/* Answer panel with smooth height transition */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: isOpen ? "200px" : "0px",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <p
                    className="pb-5 text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA after FAQ */}
        <div className={`mt-12 text-center ${isVisible ? "animate-fade-in-up delay-400" : "opacity-0"}`}>
          <p
            className="mb-4 text-base"
            style={{ color: "var(--text-secondary)" }}
          >
            Остались вопросы?
          </p>
          <a
            href="mailto:support@marketfoto.ru"
            className="btn-ghost inline-flex items-center gap-2 text-sm"
            style={{ color: "var(--purple-400)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
              <path d="M1 5l7 4 7-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            support@marketfoto.ru
          </a>
        </div>
      </div>
    </section>
  );
}
