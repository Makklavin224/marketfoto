import { Link, useLocation } from "react-router";
import { useAuthStore } from "../stores/auth";
import UserBadge from "./UserBadge";

const navItems = [
  { to: "/dashboard", label: "Дашборд" },
  { to: "/upload", label: "Загрузить" },
  { to: "/editor", label: "Редактор" },
  { to: "/templates", label: "Шаблоны" },
];

export default function Header() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  return (
    <header
      style={{
        height: 64,
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
        background: "rgba(9, 9, 11, 0.75)",
        backdropFilter: `blur(var(--glass-blur))`,
        WebkitBackdropFilter: `blur(var(--glass-blur))`,
        borderBottom: "var(--border-subtle)",
      }}
    >
      {/* ── Logo ── */}
      <Link
        to={user ? "/dashboard" : "/"}
        className="font-display"
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexShrink: 0,
        }}
      >
        <span className="text-gradient">Market</span>
        <span style={{ color: "var(--text-primary)" }}>Foto</span>
      </Link>

      {/* ── Nav links (center) ── */}
      {user && (
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.to ||
              location.pathname.startsWith(item.to + "/");

            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  padding: "0.5rem 0.875rem",
                  fontSize: "0.875rem",
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: "var(--font-body)",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  textDecoration: "none",
                  borderRadius: "var(--radius-md)",
                  background: isActive ? "rgba(124, 58, 237, 0.1)" : "transparent",
                  border: isActive ? "1px solid rgba(124, 58, 237, 0.15)" : "1px solid transparent",
                  transition: "all var(--transition-fast)",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {item.label}
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: -1,
                      left: "20%",
                      right: "20%",
                      height: 2,
                      background: "var(--gradient-primary)",
                      borderRadius: 1,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      )}

      {/* ── User badge (right) ── */}
      <div style={{ flexShrink: 0 }}>
        <UserBadge />
      </div>
    </header>
  );
}
