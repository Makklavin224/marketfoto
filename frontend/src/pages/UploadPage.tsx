import ImageUpload from "../components/ImageUpload";
import { useAuthStore } from "../stores/auth";

export default function UploadPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with title and credits display */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Загрузка фото
          </h1>
          {user && (
            <span className="text-sm text-gray-500">
              Осталось карточек:{" "}
              <span className="font-medium text-gray-900">
                {user.credits_remaining}
              </span>
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <ImageUpload
          onUploadComplete={(image) => {
            // Phase 4 will navigate to background removal
            console.log("Upload complete:", image.id);
          }}
        />
      </main>
    </div>
  );
}
