export default function HowItWorksSection() {
  const steps = [
    {
      number: 1,
      title: "Загрузите фото",
      description:
        "Сфотографируйте товар на телефон и загрузите в сервис. AI уберёт фон за 5 секунд.",
      icon: (
        <svg
          className="h-12 w-12 text-blue-600"
          fill="none"
          viewBox="0 0 48 48"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <rect x="8" y="6" width="32" height="36" rx="4" />
          <circle cx="24" cy="22" r="8" />
          <circle cx="24" cy="22" r="3" />
          <rect x="18" y="8" width="12" height="2" rx="1" />
        </svg>
      ),
    },
    {
      number: 2,
      title: "Выберите шаблон",
      description:
        "Подберите шаблон с инфографикой для вашего маркетплейса. Добавьте текст и бейджи.",
      icon: (
        <svg
          className="h-12 w-12 text-blue-600"
          fill="none"
          viewBox="0 0 48 48"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <rect x="4" y="4" width="18" height="18" rx="2" />
          <rect x="26" y="4" width="18" height="18" rx="2" />
          <rect x="4" y="26" width="18" height="18" rx="2" />
          <rect x="26" y="26" width="18" height="18" rx="2" />
        </svg>
      ),
    },
    {
      number: 3,
      title: "Скачайте карточку",
      description:
        "Готовая карточка в правильном размере для WB, Ozon или Яндекс.Маркет.",
      icon: (
        <svg
          className="h-12 w-12 text-blue-600"
          fill="none"
          viewBox="0 0 48 48"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path d="M24 6v24M16 22l8 8 8-8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 34v6a2 2 0 002 2h28a2 2 0 002-2v-6" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
          Как это работает
        </h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.number} className="relative text-center">
              {/* Connecting arrow (desktop only, not on last step) */}
              {index < steps.length - 1 && (
                <div className="absolute top-10 left-[calc(50%+40px)] hidden h-0.5 w-[calc(100%-80px)] bg-blue-200 md:block">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 border-t-4 border-b-4 border-l-6 border-t-transparent border-b-transparent border-l-blue-200" />
                </div>
              )}

              {/* Numbered circle */}
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
                {step.number}
              </div>

              {/* Icon */}
              <div className="mx-auto mb-4 flex justify-center">
                {step.icon}
              </div>

              {/* Title and description */}
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                {step.title}
              </h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
