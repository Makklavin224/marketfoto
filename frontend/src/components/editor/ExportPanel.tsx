import type { RenderStatusResponse } from "../../api/renders";
import { MARKETPLACE_SIZES, type MarketplaceId } from "../../types/editor";

interface ExportPanelProps {
  renderId: string;
  renderStatus: RenderStatusResponse | undefined;
  marketplace: MarketplaceId;
  isLoading: boolean;
  onEdit: () => void;
  onCreateMore: () => void;
}

export default function ExportPanel({
  renderStatus,
  marketplace,
  isLoading,
  onEdit,
  onCreateMore,
}: ExportPanelProps) {
  const dims = MARKETPLACE_SIZES[marketplace];
  const status = renderStatus?.status;

  // State 1: Rendering (pending / rendering / initial loading)
  if (isLoading || status === "pending" || status === "rendering" || !status) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="flex flex-col items-center gap-4 max-w-lg mx-auto py-8">
          {/* Pulsing spinner */}
          <div className="relative">
            <svg
              className="animate-spin h-16 w-16"
              style={{ color: "var(--purple-400)" }}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <div className="text-center">
            <p
              className="text-lg font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Создаём карточку...
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {dims.label} {dims.width}x{dims.height}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Failed
  if (status === "failed") {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="flex flex-col items-center gap-4 max-w-lg mx-auto py-8">
          {/* Error icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(239, 68, 68, 0.1)" }}
          >
            <svg
              className="h-8 w-8"
              style={{ color: "var(--red-400)" }}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="text-center">
            <p
              className="text-lg font-medium"
              style={{ color: "var(--red-400)" }}
            >
              Не удалось создать карточку
            </p>
            {renderStatus?.error_message && (
              <p
                className="text-sm mt-1 max-w-sm"
                style={{ color: "var(--red-400)", opacity: 0.8 }}
              >
                {renderStatus.error_message}
              </p>
            )}
          </div>
          <button
            onClick={onEdit}
            className="btn-primary px-6 py-2.5 rounded-xl font-medium"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // State 2: Complete
  return (
    <div
      className="flex-1 flex items-center justify-center overflow-y-auto"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="flex flex-col items-center gap-6 max-w-lg mx-auto py-8 px-4">
        {/* Preview image */}
        {renderStatus?.output_url && (
          <img
            src={renderStatus.output_url}
            alt={`Карточка ${dims.label}`}
            className="rounded-xl max-h-[500px] w-auto mx-auto"
            style={{ boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)" }}
          />
        )}

        {/* Marketplace pill */}
        <span className="badge badge-purple">
          {dims.label} {dims.width}&times;{dims.height}
        </span>

        {/* Download buttons */}
        <div className="flex gap-3 w-full">
          <a
            href={renderStatus?.output_url ?? "#"}
            download={`card-${marketplace}.png`}
            className="btn-primary px-6 py-3 rounded-xl flex-1 text-center font-medium"
          >
            Скачать PNG
          </a>
          <a
            href={renderStatus?.output_url ? `${renderStatus.output_url}` : "#"}
            download={`card-${marketplace}.jpg`}
            className="btn-secondary px-6 py-3 rounded-xl flex-1 text-center font-medium"
          >
            Скачать JPG
          </a>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onEdit}
            className="btn-secondary px-4 py-2.5 rounded-lg flex-1 font-medium"
          >
            Редактировать
          </button>
          <button
            onClick={onCreateMore}
            className="btn-primary px-4 py-2.5 rounded-lg flex-1 font-medium"
          >
            Создать ещё
          </button>
        </div>
      </div>
    </div>
  );
}
