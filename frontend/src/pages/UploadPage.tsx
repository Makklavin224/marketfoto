import { useNavigate } from "react-router";
import ImageUpload from "../components/ImageUpload";
import { useAuthStore } from "../stores/auth";

export default function UploadPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="bg-mesh" />

      {/* Header */}
      <header
        className="relative z-10"
        style={{
          borderBottom: "var(--border-subtle)",
          background: "rgba(9, 9, 11, 0.8)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <h1 className="heading-card" style={{ color: "var(--text-primary)" }}>
            Загрузка фото
          </h1>
          {user && (
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Осталось карточек:{" "}
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {user.credits_remaining}
              </span>
            </span>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-6 py-12 animate-fade-in-up">
        <ImageUpload
          onUploadComplete={(image) => {
            navigate(`/processing/${image.id}`);
          }}
        />
      </main>
    </div>
  );
}
