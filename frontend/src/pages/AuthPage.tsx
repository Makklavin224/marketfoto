import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { AxiosError } from "axios";
import { useAuthStore } from "../stores/auth";
import {
  loginSchema,
  registerSchema,
  type LoginForm,
  type RegisterForm,
} from "../lib/validators";

/* ── Spinner component ── */
function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
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
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/* ── Forgot Password (inline) ── */
function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { authApi } = await import("../lib/api");
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      setError("Не удалось отправить ссылку");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4 animate-fade-in">
        <div
          style={{
            width: 56,
            height: 56,
            margin: "0 auto",
            borderRadius: "var(--radius-full)",
            background: "rgba(16, 185, 129, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
          Ссылка для сброса пароля отправлена на{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{email}</span>
        </p>
        <button
          type="button"
          onClick={onBack}
          className="btn-ghost"
          style={{ color: "var(--purple-400)", fontSize: "0.875rem" }}
        >
          Вернуться ко входу
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
        Введите email, и мы отправим ссылку для сброса пароля.
      </p>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "var(--red-400)",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      <div>
        <label
          style={{
            display: "block",
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "var(--text-secondary)",
            marginBottom: "0.5rem",
          }}
        >
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-dark"
          placeholder="you@example.com"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          opacity: loading ? 0.6 : 1,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? <Spinner /> : "Отправить ссылку"}
      </button>

      <div style={{ textAlign: "center" }}>
        <button
          type="button"
          onClick={onBack}
          className="btn-ghost"
          style={{ color: "var(--purple-400)", fontSize: "0.875rem" }}
        >
          Вернуться ко входу
        </button>
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════
   Auth Page — Neon Forge Dark Theme
   ══════════════════════════════════════════ */
export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "register" | "forgot">("login");
  const [apiError, setApiError] = useState("");
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  // Redirect authenticated users to /editor
  useEffect(() => {
    if (token) {
      navigate("/editor", { replace: true });
    }
  }, [token, navigate]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onLogin = async (data: LoginForm) => {
    setApiError("");
    try {
      await login(data.email, data.password);
      navigate("/editor");
    } catch (err) {
      const error = err as AxiosError<{ error?: string; detail?: string }>;
      setApiError(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Ошибка входа"
      );
    }
  };

  const onRegister = async (data: RegisterForm) => {
    setApiError("");
    try {
      await register(data.email, data.password, data.full_name);
      navigate("/editor");
    } catch (err) {
      const error = err as AxiosError<{ error?: string; detail?: string }>;
      setApiError(
        error.response?.data?.error ||
          error.response?.data?.detail ||
          "Ошибка регистрации"
      );
    }
  };

  /* ── Label style helper ── */
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: "0.5rem",
  };

  const optionalStyle: React.CSSProperties = {
    color: "var(--text-tertiary)",
    fontWeight: 400,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        position: "relative",
      }}
    >
      {/* ── Animated mesh background ── */}
      <div className="bg-mesh" />

      {/* ── Glass card ── */}
      <div
        className="glass-card-static animate-scale-in"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "2.5rem",
          borderColor: "rgba(124, 58, 237, 0.12)",
          boxShadow: "var(--shadow-glow), 0 8px 32px rgba(0, 0, 0, 0.4)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative top glow line */}
        <div
          className="glow-line"
          style={{
            position: "absolute",
            top: 0,
            left: "10%",
            right: "10%",
            opacity: 0.5,
          }}
        />

        {/* ── Logo ── */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            className="font-display"
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            <span className="text-gradient">Market</span>
            <span style={{ color: "var(--text-primary)" }}>Foto</span>
          </h1>
          <p
            style={{
              color: "var(--text-tertiary)",
              fontSize: "0.875rem",
              marginTop: "0.5rem",
            }}
          >
            Карточки для маркетплейсов за 30 секунд
          </p>
        </div>

        {/* ── Tab switcher ── */}
        {tab !== "forgot" && (
          <div
            style={{
              display: "flex",
              position: "relative",
              marginBottom: "1.75rem",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: "var(--radius-md)",
              padding: "4px",
              gap: "4px",
            }}
          >
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setApiError("");
                }}
                style={{
                  flex: 1,
                  padding: "0.625rem 0",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all var(--transition-base)",
                  position: "relative",
                  background:
                    tab === t
                      ? "var(--gradient-primary)"
                      : "transparent",
                  color:
                    tab === t
                      ? "#fff"
                      : "var(--text-tertiary)",
                  boxShadow:
                    tab === t
                      ? "0 2px 8px rgba(124, 58, 237, 0.3)"
                      : "none",
                }}
              >
                {t === "login" ? "Вход" : "Регистрация"}
              </button>
            ))}
          </div>
        )}

        {/* ── API Error ── */}
        {apiError && (
          <div
            className="animate-fade-in"
            style={{
              marginBottom: "1.25rem",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "var(--red-400)",
              fontSize: "0.875rem",
            }}
          >
            {apiError}
          </div>
        )}

        {/* ── Login Form ── */}
        {tab === "login" && (
          <form
            onSubmit={loginForm.handleSubmit(onLogin)}
            className="animate-fade-in"
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                {...loginForm.register("email")}
                className="input-dark"
                placeholder="you@example.com"
              />
              {loginForm.formState.errors.email && (
                <p style={{ fontSize: "0.8125rem", color: "var(--red-400)", marginTop: "0.375rem" }}>
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label style={labelStyle}>Пароль</label>
              <input
                type="password"
                {...loginForm.register("password")}
                className="input-dark"
                placeholder="Минимум 6 символов"
              />
              {loginForm.formState.errors.password && (
                <p style={{ fontSize: "0.8125rem", color: "var(--red-400)", marginTop: "0.375rem" }}>
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="btn-primary"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                marginTop: "0.25rem",
                opacity: loginForm.formState.isSubmitting ? 0.6 : 1,
                cursor: loginForm.formState.isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {loginForm.formState.isSubmitting ? <Spinner /> : "Войти"}
            </button>

            <div style={{ textAlign: "center" }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setTab("forgot")}
                style={{ color: "var(--purple-400)", fontSize: "0.875rem" }}
              >
                Забыли пароль?
              </button>
            </div>
          </form>
        )}

        {/* ── Register Form ── */}
        {tab === "register" && (
          <form
            onSubmit={registerForm.handleSubmit(onRegister)}
            className="animate-fade-in"
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                {...registerForm.register("email")}
                className="input-dark"
                placeholder="you@example.com"
              />
              {registerForm.formState.errors.email && (
                <p style={{ fontSize: "0.8125rem", color: "var(--red-400)", marginTop: "0.375rem" }}>
                  {registerForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label style={labelStyle}>Пароль</label>
              <input
                type="password"
                {...registerForm.register("password")}
                className="input-dark"
                placeholder="Минимум 6 символов"
              />
              {registerForm.formState.errors.password && (
                <p style={{ fontSize: "0.8125rem", color: "var(--red-400)", marginTop: "0.375rem" }}>
                  {registerForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label style={labelStyle}>
                Имя <span style={optionalStyle}>(необязательно)</span>
              </label>
              <input
                type="text"
                {...registerForm.register("full_name")}
                className="input-dark"
                placeholder="Как вас зовут"
              />
            </div>

            <button
              type="submit"
              disabled={registerForm.formState.isSubmitting}
              className="btn-primary"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                marginTop: "0.25rem",
                opacity: registerForm.formState.isSubmitting ? 0.6 : 1,
                cursor: registerForm.formState.isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {registerForm.formState.isSubmitting ? <Spinner /> : "Зарегистрироваться"}
            </button>
          </form>
        )}

        {/* ── Forgot Password ── */}
        {tab === "forgot" && <ForgotPasswordForm onBack={() => setTab("login")} />}

        {/* ── Bottom decorative line ── */}
        <div
          className="glow-line"
          style={{
            position: "absolute",
            bottom: 0,
            left: "20%",
            right: "20%",
            opacity: 0.25,
          }}
        />
      </div>
    </div>
  );
}
