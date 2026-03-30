import { useState, useCallback } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useDashboardStats,
  useRenders,
  deleteRender,
  downloadRender,
} from "../api/dashboard";
import type { RenderItem } from "../api/dashboard";

const PAGE_SIZE = 20;

// Plan display names
const PLAN_LABELS: Record<string, string> = {
  free: "Бесплатный",
  starter: "Стартер",
  business: "Бизнес",
};

// Plan badge styles (dark theme)
const PLAN_BADGE_CLASSES: Record<string, string> = {
  free: "badge badge-blue",
  starter: "badge badge-purple",
  business: "badge badge-green",
};

// Marketplace badge classes
const MP_BADGE_CLASSES: Record<string, string> = {
  wb: "badge-wb",
  ozon: "badge-ozon",
  ym: "badge-ym",
};

const MP_LABELS: Record<string, string> = {
  wb: "WB",
  ozon: "OZ",
  ym: "YM",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatSubscriptionDate(iso: string): string {
  const d = new Date(iso);
  const months = [
    "янв",
    "фев",
    "мар",
    "апр",
    "май",
    "июн",
    "июл",
    "авг",
    "сен",
    "окт",
    "ноя",
    "дек",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Stat icons with gradient backgrounds
// ---------------------------------------------------------------------------

const STAT_ICONS = [
  // Тариф — shield
  <div
    key="plan"
    className="flex h-10 w-10 items-center justify-center rounded-xl"
    style={{ background: "var(--gradient-primary)" }}
  >
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  </div>,
  // Осталось — stack
  <div
    key="credits"
    className="flex h-10 w-10 items-center justify-center rounded-xl"
    style={{ background: "var(--gradient-cta)" }}
  >
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75l-5.571-3m11.142 0l4.179 2.25L12 17.25l-9.75-5.25 4.179-2.25m11.142 0l4.179 2.25L12 21.75l-9.75-5.25 4.179-2.25" />
    </svg>
  </div>,
  // Создано — chart bar
  <div
    key="renders"
    className="flex h-10 w-10 items-center justify-center rounded-xl"
    style={{ background: "linear-gradient(135deg, var(--blue-500), var(--purple-500))" }}
  >
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  </div>,
  // Подписка — calendar
  <div
    key="sub"
    className="flex h-10 w-10 items-center justify-center rounded-xl"
    style={{ background: "linear-gradient(135deg, var(--orange-400), var(--yellow-400))" }}
  >
    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  </div>,
];

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="glass-card-static p-5">
          <div className="h-4 w-16 animate-shimmer rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="mt-3 h-7 w-20 animate-shimmer rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="glass-card-static overflow-hidden">
          <div className="aspect-[3/4] animate-shimmer" style={{ background: "rgba(255,255,255,0.04)" }} />
          <div className="p-3">
            <div className="h-4 w-20 animate-shimmer rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats Cards
// ---------------------------------------------------------------------------

function StatsCards() {
  const { data: stats, isLoading, isError } = useDashboardStats();

  if (isLoading) return <StatsSkeleton />;

  if (isError || !stats) {
    return (
      <div className="mb-8 glass-card-static p-4 text-center" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
        <p style={{ color: "var(--red-400)" }}>Ошибка загрузки статистики</p>
      </div>
    );
  }

  const cards = [
    {
      label: "Тариф",
      value: (
        <span className={PLAN_BADGE_CLASSES[stats.plan] || PLAN_BADGE_CLASSES.free}>
          {PLAN_LABELS[stats.plan] || stats.plan}
        </span>
      ),
    },
    {
      label: "Осталось карточек",
      value:
        stats.plan === "business" ? (
          <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Безлимит</span>
        ) : (
          <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {stats.credits_remaining}{" "}
            <span className="text-base font-normal" style={{ color: "var(--text-tertiary)" }}>
              / {stats.credits_total}
            </span>
          </span>
        ),
    },
    {
      label: "Создано за месяц",
      value: (
        <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {stats.renders_this_month}
        </span>
      ),
    },
    {
      label: "Подписка до",
      value: (
        <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {stats.subscription_expires_at
            ? formatSubscriptionDate(stats.subscription_expires_at)
            : "---"}
        </span>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => (
        <div
          key={card.label}
          className="glass-card p-5 animate-fade-in-up"
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <div className="flex items-center gap-3 mb-3">
            {STAT_ICONS[idx]}
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {card.label}
            </p>
          </div>
          <div>{card.value}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-2xl mb-6"
        style={{ background: "rgba(124, 58, 237, 0.1)", border: "1px solid rgba(124, 58, 237, 0.2)" }}
      >
        <svg
          className="h-10 w-10"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
          style={{ color: "var(--purple-400)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      </div>
      <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>
        Вы ещё не создали карточек
      </p>
      <Link
        to="/upload"
        className="btn-primary mt-6 inline-block font-display text-sm"
      >
        Создать первую
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Render Card
// ---------------------------------------------------------------------------

function RenderCard({
  render,
  onDelete,
  onDownload,
}: {
  render: RenderItem;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
}) {
  const mpBadgeClass = MP_BADGE_CLASSES[render.marketplace] || "badge-blue";
  const mpLabel = MP_LABELS[render.marketplace] || render.marketplace.toUpperCase();

  return (
    <div className="group relative glass-card overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-[3/4]" style={{ background: "var(--bg-tertiary)" }}>
        {render.output_url ? (
          <img
            src={render.output_url}
            alt={`${mpLabel} карточка`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ color: "var(--text-muted)" }}>
            <svg
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </div>
        )}

        {/* Marketplace badge */}
        <span
          className={`badge absolute top-2 right-2 text-xs ${mpBadgeClass}`}
        >
          {mpLabel}
        </span>
      </div>

      {/* Date + actions */}
      <div className="flex items-center justify-between p-3">
        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          {formatDate(render.created_at)}
        </span>
        <div className="flex gap-1">
          {/* Download */}
          <button
            onClick={() => onDownload(render.id)}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--blue-400)";
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
              e.currentTarget.style.background = "transparent";
            }}
            title="Скачать"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>
          {/* Delete */}
          <button
            onClick={() => onDelete(render.id)}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--red-400)";
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
              e.currentTarget.style.background = "transparent";
            }}
            title="Удалить"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const [allRenders, setAllRenders] = useState<RenderItem[]>([]);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const queryClient = useQueryClient();

  const offset = 0; // Always fetch from start for first page, append for subsequent
  const {
    data: rendersData,
    isLoading: rendersLoading,
    isError: rendersError,
  } = useRenders(page * PAGE_SIZE, 0);

  // Sync fetched data into local state
  const renders = rendersData?.renders ?? allRenders;
  const total = rendersData?.total ?? totalLoaded;
  const hasMore = renders.length < total;
  const isFirstLoad = rendersLoading && renders.length === 0;

  const handleDelete = useCallback(
    async (renderId: string) => {
      if (!window.confirm("Удалить карточку?")) return;
      try {
        await deleteRender(renderId);
        // Invalidate both queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["renders"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
      } catch {
        alert("Не удалось удалить карточку");
      }
    },
    [queryClient]
  );

  const handleDownload = useCallback(async (renderId: string) => {
    try {
      const { download_url, filename } = await downloadRender(renderId);
      // Create temporary link and trigger download
      const link = document.createElement("a");
      link.href = download_url;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert("Не удалось скачать карточку");
    }
  }, []);

  const handleLoadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div className="bg-mesh" />
      <div className="mx-auto max-w-6xl px-4 py-8 relative">
        <h1
          className="heading-section mb-8 animate-fade-in-up"
          style={{ color: "var(--text-primary)" }}
        >
          Мои карточки
        </h1>

        {/* Stats Cards */}
        <StatsCards />

        {/* Glow separator */}
        <div className="glow-line mb-8" />

        {/* Renders Grid */}
        {isFirstLoad ? (
          <GridSkeleton />
        ) : rendersError ? (
          <div className="glass-card-static p-8 text-center">
            <p className="mb-3" style={{ color: "var(--red-400)" }}>Ошибка загрузки</p>
            <button
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["renders"] })
              }
              className="btn-secondary text-sm"
            >
              Попробовать снова
            </button>
          </div>
        ) : total === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {renders.map((render) => (
                <RenderCard
                  key={render.id}
                  render={render}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={rendersLoading}
                className="btn-secondary mt-6 w-full py-3 disabled:opacity-50"
              >
                {rendersLoading ? "Загрузка..." : "Загрузить ещё"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
