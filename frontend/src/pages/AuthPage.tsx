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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Logo */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          MarketFoto
        </h1>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setApiError("");
            }}
            className={`flex-1 pb-3 text-sm font-medium transition-colors ${
              tab === "login"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setApiError("");
            }}
            className={`flex-1 pb-3 text-sm font-medium transition-colors ${
              tab === "register"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* API Error */}
        {apiError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {apiError}
          </div>
        )}

        {/* Login Form */}
        {tab === "login" && (
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                {...loginForm.register("email")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="you@example.com"
              />
              {loginForm.formState.errors.email && (
                <p className="text-sm text-red-500 mt-1">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Пароль
              </label>
              <input
                type="password"
                {...loginForm.register("password")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="Минимум 6 символов"
              />
              {loginForm.formState.errors.password && (
                <p className="text-sm text-red-500 mt-1">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center"
            >
              {loginForm.formState.isSubmitting ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
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
              ) : (
                "Войти"
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700"
                onClick={() => setTab("forgot")}
              >
                Забыли пароль?
              </button>
            </div>
          </form>
        )}

        {/* Register Form */}
        {tab === "register" && (
          <form
            onSubmit={registerForm.handleSubmit(onRegister)}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                {...registerForm.register("email")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="you@example.com"
              />
              {registerForm.formState.errors.email && (
                <p className="text-sm text-red-500 mt-1">
                  {registerForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Пароль
              </label>
              <input
                type="password"
                {...registerForm.register("password")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="Минимум 6 символов"
              />
              {registerForm.formState.errors.password && (
                <p className="text-sm text-red-500 mt-1">
                  {registerForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Имя{" "}
                <span className="text-gray-400 font-normal">
                  (необязательно)
                </span>
              </label>
              <input
                type="text"
                {...registerForm.register("full_name")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="Как вас зовут"
              />
            </div>

            <button
              type="submit"
              disabled={registerForm.formState.isSubmitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center"
            >
              {registerForm.formState.isSubmitting ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
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
              ) : (
                "Зарегистрироваться"
              )}
            </button>
          </form>
        )}

        {/* Forgot Password (inline) */}
        {tab === "forgot" && <ForgotPasswordForm onBack={() => setTab("login")} />}
      </div>
    </div>
  );
}

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
      <div className="text-center space-y-4">
        <p className="text-gray-600">
          Ссылка для сброса пароля отправлена на{" "}
          <span className="font-medium">{email}</span>
        </p>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Вернуться ко входу
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600 mb-2">
        Введите email, и мы отправим ссылку для сброса пароля.
      </p>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          placeholder="you@example.com"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
      >
        {loading ? "Отправка..." : "Отправить ссылку"}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Вернуться ко входу
        </button>
      </div>
    </form>
  );
}
