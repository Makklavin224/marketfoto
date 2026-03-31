/**
 * Side-by-side comparison of original and processed (background removed) images.
 *
 * Dark-themed with checkered transparency pattern and glass cards.
 * Green "next" CTA and ghost "upload another" link below.
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
        <div className="animate-fade-in-up">
          <p
            className="text-xs uppercase tracking-wide mb-2 font-semibold"
            style={{ color: "var(--text-tertiary)" }}
          >
            Оригинал
          </p>
          <div
            className="glass-card-static overflow-hidden"
            style={{ background: "var(--bg-tertiary)" }}
          >
            <div className="flex items-center justify-center" style={{ maxHeight: "24rem" }}>
              {originalUrl ? (
                <img
                  src={originalUrl}
                  alt="Оригинал"
                  className="w-full h-full object-contain"
                  style={{ maxHeight: "24rem" }}
                />
              ) : (
                <div className="flex items-center justify-center h-48" style={{ color: "var(--text-tertiary)" }}>
                  <p className="text-sm">Загрузка...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Processed image on dark checkered background */}
        <div className="animate-fade-in-up delay-200">
          <p
            className="text-xs uppercase tracking-wide mb-2 font-semibold"
            style={{ color: "var(--text-tertiary)" }}
          >
            Без фона
          </p>
          <div
            className="glass-card-static overflow-hidden"
            style={{
              backgroundImage:
                "repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, rgba(255,255,255,0.01) 0% 50%)",
              backgroundSize: "16px 16px",
            }}
          >
            <div className="flex items-center justify-center" style={{ maxHeight: "24rem" }}>
              {processedUrl ? (
                <img
                  src={processedUrl}
                  alt="Без фона"
                  className="w-full h-full object-contain"
                  style={{ maxHeight: "24rem" }}
                />
              ) : (
                <div className="flex items-center justify-center h-48" style={{ color: "var(--text-tertiary)" }}>
                  <p className="text-sm">Загрузка...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Processing time */}
      {processingTimeMs != null && (
        <p className="text-xs text-center mb-4" style={{ color: "var(--text-tertiary)" }}>
          Обработано за {(processingTimeMs / 1000).toFixed(1)}с
        </p>
      )}

      {/* CTAs */}
      <div className="flex flex-col items-center animate-fade-in-up delay-400">
        <button
          onClick={onNext}
          className="btn-primary w-full md:w-auto text-lg py-3 px-8 cursor-pointer"
        >
          Далее: AI фотосессия
        </button>
        <button
          onClick={onUploadAnother}
          className="btn-ghost text-sm mt-3 cursor-pointer"
        >
          Загрузить другое фото
        </button>
      </div>
    </div>
  );
}
