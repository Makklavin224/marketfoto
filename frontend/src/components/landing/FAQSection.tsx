import { useState } from "react";

const faqItems = [
  {
    question: "Какие форматы фото поддерживаются?",
    answer:
      "JPG, PNG и WebP. Максимальный размер файла — 10 МБ. Минимальное разрешение — 200x200 пикселей.",
  },
  {
    question: "Сколько стоит сервис?",
    answer:
      "Есть бесплатный тариф на 3 карточки в месяц. Стартер — 499 \u20BD/мес за 50 карточек. Бизнес — 990 \u20BD/мес без ограничений. Можно купить одну карточку за 49 \u20BD.",
  },
  {
    question: "Какое качество удаления фона?",
    answer:
      "Мы используем нейросеть BiRefNet — одну из лучших на рынке. Качество сопоставимо с ручной обработкой в Photoshop для большинства товаров.",
  },
  {
    question: "Как быстро готова карточка?",
    answer:
      "Удаление фона занимает 5-10 секунд. Весь процесс от загрузки фото до скачивания готовой карточки — около 30 секунд.",
  },
  {
    question: "Для каких маркетплейсов подходит?",
    answer:
      "Wildberries (900x1200), Ozon (1200x1200) и Яндекс.Маркет (800x800). Размеры подставляются автоматически.",
  },
  {
    question: "Как оплатить?",
    answer:
      "Банковской картой через ЮKassa. Поддерживаются Visa, MasterCard, МИР. Подписка продлевается автоматически, отменить можно в любой момент.",
  },
  {
    question: "Можно ли использовать с API?",
    answer:
      "API планируется в следующих версиях. Сейчас доступен только веб-интерфейс.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
          Частые вопросы
        </h2>

        <div>
          {faqItems.map((item, index) => (
            <div key={index} className="border-b border-gray-200 py-4">
              <button
                onClick={() => toggle(index)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-lg font-medium text-gray-900">
                  {item.question}
                </span>
                <svg
                  className={`h-5 w-5 flex-shrink-0 text-gray-500 transition-transform duration-200 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openIndex === index && (
                <p className="mt-2 pb-2 text-gray-600">{item.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
