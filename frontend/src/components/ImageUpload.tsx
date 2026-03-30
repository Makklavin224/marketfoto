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
      <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-700">
          Нет доступных карточек
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Оформите подписку для продолжения работы
        </p>
        <a
          href="/pricing"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Выбрать тариф
        </a>
      </div>
    );
  }

  // ---------- Error state ----------
  if (status === "error") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-red-300 bg-red-50 p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <p className="text-lg font-medium text-red-600">{error}</p>
        <button
          onClick={handleRetry}
          className="mt-4 text-sm font-medium text-blue-600 hover:underline"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  // ---------- Uploading state ----------
  if (status === "uploading") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <svg
            className="h-8 w-8 animate-spin text-blue-600"
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
        <p className="text-lg font-medium text-blue-700">Загрузка...</p>
        <div className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">{progress}%</p>
      </div>
    );
  }

  // ---------- Uploaded state ----------
  if (status === "uploaded" && uploadedImage && previewUrl) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        {/* Image preview with checkerboard background for transparency */}
        <div
          className="mx-auto flex max-h-64 items-center justify-center overflow-hidden rounded-lg"
          style={{
            backgroundImage:
              "repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%)",
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
          <p className="text-sm font-medium text-gray-900">
            {uploadedImage.original_filename}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {uploadedImage.original_width} x {uploadedImage.original_height} px
            {" | "}
            {formatSize(uploadedImage.original_size)}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => {
              // Phase 4 will navigate to background removal
              console.log("Navigate to remove-bg:", uploadedImage.id);
            }}
            className="w-full rounded-lg bg-green-600 py-3 font-medium text-white hover:bg-green-700"
          >
            Далее: убрать фон
          </button>
          <button
            onClick={handleDelete}
            className="w-full text-sm text-red-500 hover:text-red-700"
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
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
        isDragActive
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
      }`}
    >
      <input {...getInputProps()} />
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
        <svg
          className="h-8 w-8 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
          />
        </svg>
      </div>
      <p className="text-lg font-medium text-gray-700">
        {isDragActive
          ? "Отпустите для загрузки"
          : "Перетащите фото товара сюда или нажмите для выбора"}
      </p>
      <p className="mt-2 text-sm text-gray-400">JPG, PNG, WebP до 10 МБ</p>
    </div>
  );
}
