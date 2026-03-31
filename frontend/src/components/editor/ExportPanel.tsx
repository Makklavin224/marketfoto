import { useCallback } from "react";
import { MARKETPLACE_SIZES, type MarketplaceId } from "../../types/editor";

interface ExportPanelProps {
  imageDataUrl: string;
  marketplace: MarketplaceId;
  onEdit: () => void;
  onCreateMore: () => void;
}

/**
 * Convert a PNG data URL to JPEG by drawing onto an offscreen canvas.
 */
function convertToJpeg(pngDataUrl: string, quality = 0.92): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get 2d context"));
        return;
      }
      // JPEG doesn't support transparency — fill white background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Failed to load image for JPEG conversion"));
    img.src = pngDataUrl;
  });
}

/**
 * Trigger a file download from a data URL.
 */
function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ExportPanel({
  imageDataUrl,
  marketplace,
  onEdit,
  onCreateMore,
}: ExportPanelProps) {
  const dims = MARKETPLACE_SIZES[marketplace];

  const handleDownloadPng = useCallback(() => {
    downloadDataUrl(imageDataUrl, `card-${marketplace}-${dims.width}x${dims.height}.png`);
  }, [imageDataUrl, marketplace, dims]);

  const handleDownloadJpg = useCallback(async () => {
    try {
      const jpegUrl = await convertToJpeg(imageDataUrl);
      downloadDataUrl(jpegUrl, `card-${marketplace}-${dims.width}x${dims.height}.jpg`);
    } catch (err) {
      console.error("JPEG conversion failed:", err);
    }
  }, [imageDataUrl, marketplace, dims]);

  return (
    <div
      className="flex-1 flex items-center justify-center overflow-y-auto"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="flex flex-col items-center gap-6 max-w-lg mx-auto py-8 px-4">
        {/* Success icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "rgba(34, 197, 94, 0.1)" }}
        >
          <svg
            className="h-8 w-8"
            style={{ color: "var(--green-400, #4ade80)" }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <p
          className="text-lg font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          Карточка готова!
        </p>

        {/* Preview image */}
        <img
          src={imageDataUrl}
          alt={`Карточка ${dims.label}`}
          className="rounded-xl max-h-[500px] w-auto mx-auto"
          style={{ boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)" }}
        />

        {/* Marketplace pill */}
        <span className="badge badge-purple">
          {dims.label} {dims.width}&times;{dims.height}
        </span>

        {/* Download buttons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={handleDownloadPng}
            className="btn-primary px-6 py-3 rounded-xl flex-1 text-center font-medium"
          >
            Скачать PNG
          </button>
          <button
            onClick={handleDownloadJpg}
            className="btn-secondary px-6 py-3 rounded-xl flex-1 text-center font-medium"
          >
            Скачать JPG
          </button>
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
