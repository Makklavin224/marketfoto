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
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 max-w-lg mx-auto py-8">
          {/* Pulsing spinner */}
          <div className="relative">
            <svg
              className="animate-spin h-16 w-16 text-green-600"
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
            <p className="text-lg font-medium text-gray-900">
              Создаём карточку...
            </p>
            <p className="text-sm text-gray-400 mt-1">
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
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 max-w-lg mx-auto py-8">
          {/* Error icon */}
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="h-8 w-8 text-red-600"
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
            <p className="text-lg font-medium text-red-600">
              Не удалось создать карточку
            </p>
            {renderStatus?.error_message && (
              <p className="text-sm text-red-500 mt-1 max-w-sm">
                {renderStatus.error_message}
              </p>
            )}
          </div>
          <button
            onClick={onEdit}
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // State 2: Complete
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 overflow-y-auto">
      <div className="flex flex-col items-center gap-6 max-w-lg mx-auto py-8 px-4">
        {/* Preview image */}
        {renderStatus?.output_url && (
          <img
            src={renderStatus.output_url}
            alt={`Карточка ${dims.label}`}
            className="rounded-xl shadow-lg max-h-[500px] w-auto mx-auto"
          />
        )}

        {/* Marketplace pill */}
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          {dims.label} {dims.width}&times;{dims.height}
        </span>

        {/* Download buttons */}
        <div className="flex gap-3 w-full">
          <a
            href={renderStatus?.output_url ?? "#"}
            download={`card-${marketplace}.png`}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-xl flex-1 text-center transition-colors"
          >
            Скачать PNG
          </a>
          <a
            href={renderStatus?.output_url ? `${renderStatus.output_url}` : "#"}
            download={`card-${marketplace}.jpg`}
            className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-6 py-3 rounded-xl flex-1 text-center transition-colors"
          >
            Скачать JPG
          </a>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onEdit}
            className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2.5 rounded-lg flex-1 transition-colors"
          >
            Редактировать
          </button>
          <button
            onClick={onCreateMore}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2.5 rounded-lg flex-1 transition-colors"
          >
            Создать ещё
          </button>
        </div>
      </div>
    </div>
  );
}
