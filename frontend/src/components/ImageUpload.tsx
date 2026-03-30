import { useState, useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { imagesApi, type ImageRecord } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { AxiosError } from "axios";

interface ImageUploadProps {
  onUploadComplete?: (image: ImageRecord) => void;
}

type UploadStatus = "idle" | "uploading" | "uploaded" | "error";

/**
 * Check image dimensions client-side before upload.
 * Rejects images smaller than 200x200.
 */
function checkDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width < 200 || img.height < 200) {
        reject(new Error("Минимальный размер 200x200 пикселей"));
      } else {
        resolve({ width: img.width, height: img.height });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Не удалось прочитать изображение"));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Format file size for display (e.g. "2.4 МБ").
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default function ImageUpload({ onUploadComplete }: ImageUploadProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<ImageRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const hasCredits = (user?.credits_remaining ?? 0) > 0;

  const handleUpload = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      setStatus("uploading");
      setProgress(0);
      setError(null);

      try {
        // Client-side dimension check
        await checkDimensions(file);

        // Upload to backend
        const { data } = await imagesApi.upload(file, (percent) =>
          setProgress(percent)
        );
        setUploadedImage(data);
        setPreviewUrl(data.original_url);
        setStatus("uploaded");
        onUploadComplete?.(data);
      } catch (err) {
        setStatus("error");
        if (err instanceof Error && err.message.includes("200x200")) {
          setError(err.message);
        } else {
          const axiosErr = err as AxiosError<{
            detail?: string;
            error?: string;
          }>;
          setError(
            axiosErr.response?.data?.detail ||
              axiosErr.response?.data?.error ||
              "Ошибка загрузки. Попробуйте ещё раз"
          );
        }
      }
    },
    [onUploadComplete]
  );

  const handleRejection = useCallback((rejections: FileRejection[]) => {
    const rejection = rejections[0];
    const code = rejection?.errors[0]?.code;
    setStatus("error");
    if (code === "file-too-large") {
      setError("Файл слишком большой. Максимум 10 МБ");
    } else if (code === "file-invalid-type") {
      setError("Неподдерживаемый формат. Допустимы JPG, PNG, WebP");
    } else {
      setError("Ошибка при выборе файла");
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!uploadedImage) return;
    try {
      await imagesApi.delete(uploadedImage.id);
    } catch {
      // Ignore delete errors -- reset UI anyway
    }
    setUploadedImage(null);
    setPreviewUrl(null);
    setStatus("idle");
    setProgress(0);
  }, [uploadedImage]);

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setError(null);
    setProgress(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    onDropAccepted: handleUpload,
    onDropRejected: handleRejection,
    disabled: !hasCredits || status === "uploading",
  });

  // ---------- No credits state ----------
  if (!hasCredits) {
    return (
      <div
        className="glass-card-static p-12 text-center"
        style={{ border: "2px dashed rgba(255, 255, 255, 0.1)" }}
      >
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "rgba(255, 255, 255, 0.05)" }}
        >
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            style={{ color: "var(--text-tertiary)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>
          Нет доступных карточек
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Оформите подписку для продолжения работы
        </p>
        <a
          href="/pricing"
          className="btn-primary mt-4 inline-block text-sm"
        >
          Выбрать тариф
        </a>
      </div>
    );
  }

  // ---------- Error state ----------
  if (status === "error") {
    return (
      <div
        className="glass-card-static p-12 text-center"
        style={{ border: "2px dashed rgba(239, 68, 68, 0.3)" }}
      >
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "rgba(239, 68, 68, 0.1)" }}
        >
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            style={{ color: "var(--red-400)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <p className="text-lg font-medium" style={{ color: "var(--red-400)" }}>{error}</p>
        <button
          onClick={handleRetry}
          className="mt-4 text-sm font-medium transition-colors"
          style={{ color: "var(--purple-400)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--purple-500)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--purple-400)")}
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  // ---------- Uploading state ----------
  if (status === "uploading") {
    return (
      <div
        className="glass-card-static p-12 text-center animate-pulse-glow"
        style={{ border: "2px dashed rgba(124, 58, 237, 0.3)" }}
      >
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "rgba(124, 58, 237, 0.15)" }}
        >
          <svg
            className="h-8 w-8 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            style={{ color: "var(--purple-400)" }}
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
        <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>
          Загрузка...
        </p>
        <div
          className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full"
          style={{ background: "rgba(255, 255, 255, 0.06)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: "var(--gradient-primary)",
            }}
          />
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>{progress}%</p>
      </div>
    );
  }

  // ---------- Uploaded state ----------
  if (status === "uploaded" && uploadedImage && previewUrl) {
    return (
      <div className="glass-card-static p-6 animate-scale-in">
        {/* Image preview with dark checkerboard */}
        <div
          className="mx-auto flex max-h-64 items-center justify-center overflow-hidden rounded-lg"
          style={{
            backgroundImage:
              "repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, transparent 0% 50%)",
            backgroundSize: "20px 20px",
          }}
        >
          <img
            src={previewUrl}
            alt={uploadedImage.original_filename}
            className="max-h-64 rounded-lg object-contain"
          />
        </div>

        {/* Image info */}
        <div className="mt-4 text-center">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {uploadedImage.original_filename}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
            {uploadedImage.original_width} x {uploadedImage.original_height} px
            {" | "}
            {formatSize(uploadedImage.original_size)}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => {
              console.log("Navigate to remove-bg:", uploadedImage.id);
            }}
            className="btn-primary w-full py-3 text-center"
          >
            Далее: убрать фон
          </button>
          <button
            onClick={handleDelete}
            className="w-full text-sm transition-colors"
            style={{ color: "var(--red-400)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--red-500)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--red-400)")}
          >
            Удалить
          </button>
        </div>
      </div>
    );
  }

  // ---------- Idle state (drag-and-drop zone) ----------
  return (
    <div
      {...getRootProps()}
      className="cursor-pointer rounded-2xl p-12 text-center transition-all"
      style={{
        border: isDragActive
          ? "2px dashed var(--purple-500)"
          : "2px dashed rgba(124, 58, 237, 0.3)",
        background: isDragActive
          ? "rgba(124, 58, 237, 0.08)"
          : "var(--bg-card)",
        boxShadow: isDragActive ? "var(--shadow-glow)" : "none",
      }}
    >
      <input {...getInputProps()} />
      <div
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: "rgba(124, 58, 237, 0.12)" }}
      >
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          style={{ color: "var(--purple-400)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
          />
        </svg>
      </div>
      <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>
        {isDragActive
          ? "Отпустите для загрузки"
          : "Перетащите фото товара сюда или нажмите для выбора"}
      </p>
      <p className="mt-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
        JPG, PNG, WebP до 10 МБ
      </p>
    </div>
  );
}
