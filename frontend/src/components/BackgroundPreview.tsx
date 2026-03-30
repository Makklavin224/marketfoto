/**
 * Side-by-side comparison of original and processed (background removed) images.
 *
 * The processed image is displayed on a checkered transparency pattern (D-09).
 * Green "next" CTA and gray "upload another" link below (D-11).
 */

interface BackgroundPreviewProps {
  originalUrl: string;
  processedUrl: string;
  processingTimeMs?: number;
  onNext: () => void;
  onUploadAnother: () => void;
}

export default function BackgroundPreview({
  originalUrl,
  processedUrl,
  processingTimeMs,
  onNext,
  onUploadAnother,
}: BackgroundPreviewProps) {
  return (
    <div className="w-full">
      {/* Side-by-side comparison grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Original image */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
            Оригинал
          </p>
          <div className="rounded-lg overflow-hidden shadow-sm border border-gray-200 bg-gray-100">
            <div className="flex items-center justify-center" style={{ maxHeight: "24rem" }}>
              <img
                src={originalUrl}
                alt="Оригинал"
                className="w-full h-full object-contain"
                style={{ maxHeight: "24rem" }}
              />
            </div>
          </div>
        </div>

        {/* Processed image on checkered background */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
            Без фона
          </p>
          <div
            className="rounded-lg overflow-hidden shadow-sm border border-gray-200"
            style={{
              backgroundImage:
                "repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%)",
              backgroundSize: "16px 16px",
            }}
          >
            <div className="flex items-center justify-center" style={{ maxHeight: "24rem" }}>
              <img
                src={processedUrl}
                alt="Без фона"
                className="w-full h-full object-contain"
                style={{ maxHeight: "24rem" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Processing time */}
      {processingTimeMs != null && (
        <p className="text-xs text-gray-400 text-center mb-4">
          Обработано за {(processingTimeMs / 1000).toFixed(1)}с
        </p>
      )}

      {/* CTAs */}
      <div className="flex flex-col items-center">
        <button
          onClick={onNext}
          className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors cursor-pointer"
        >
          Далее: выбрать шаблон
        </button>
        <button
          onClick={onUploadAnother}
          className="text-gray-500 hover:text-gray-700 text-sm mt-3 cursor-pointer"
        >
          Загрузить другое фото
        </button>
      </div>
    </div>
  );
}
