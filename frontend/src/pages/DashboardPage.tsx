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

// Plan badge colors
const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  starter: "bg-blue-100 text-blue-700",
  business: "bg-purple-100 text-purple-700",
};

// Marketplace badge colors
const MP_COLORS: Record<string, string> = {
  wb: "bg-purple-500",
  ozon: "bg-blue-500",
  ym: "bg-yellow-500",
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
// Skeleton components
// ---------------------------------------------------------------------------

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl bg-white p-5 shadow-sm">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200 mb-3" />
          <div className="h-7 w-20 animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="rounded-lg bg-white shadow-sm overflow-hidden">
          <div className="aspect-[3/4] animate-pulse bg-gray-200" />
          <div className="p-3">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
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
      <div className="mb-8 rounded-xl bg-red-50 p-4 text-center text-red-600">
        Ошибка загрузки статистики
      </div>
    );
  }

  const cards = [
    {
      label: "Тариф",
      value: (
        <span
          className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${PLAN_COLORS[stats.plan] || PLAN_COLORS.free}`}
        >
          {PLAN_LABELS[stats.plan] || stats.plan}
        </span>
      ),
    },
    {
      label: "Осталось карточек",
      value:
        stats.plan === "business" ? (
          <span className="text-2xl font-bold text-gray-900">Безлимит</span>
        ) : (
          <span className="text-2xl font-bold text-gray-900">
            {stats.credits_remaining}{" "}
            <span className="text-base font-normal text-gray-400">
              / {stats.credits_total}
            </span>
          </span>
        ),
    },
    {
      label: "Создано за месяц",
      value: (
        <span className="text-2xl font-bold text-gray-900">
          {stats.renders_this_month}
        </span>
      ),
    },
    {
      label: "Подписка до",
      value: (
        <span className="text-2xl font-bold text-gray-900">
          {stats.subscription_expires_at
            ? formatSubscriptionDate(stats.subscription_expires_at)
            : "---"}
        </span>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-gray-500 mb-1">{card.label}</p>
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
    <div className="flex flex-col items-center justify-center py-20">
      <svg
        className="h-16 w-16 text-gray-300"
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
      <p className="mt-4 text-lg text-gray-500">
        Вы ещё не создали карточек
      </p>
      <Link
        to="/upload"
        className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
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
  const mpColor = MP_COLORS[render.marketplace] || "bg-gray-500";
  const mpLabel = MP_LABELS[render.marketplace] || render.marketplace.toUpperCase();

  return (
    <div className="group relative rounded-lg bg-white shadow-sm overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-[3/4] bg-gray-100">
        {render.output_url ? (
          <img
            src={render.output_url}
            alt={`${mpLabel} card`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
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
          className={`absolute top-0 right-0 ${mpColor} px-2 py-0.5 text-xs font-bold text-white rounded-bl-lg`}
        >
          {mpLabel}
        </span>
      </div>

      {/* Date + actions */}
      <div className="flex items-center justify-between p-3">
        <span className="text-sm text-gray-500">
          {formatDate(render.created_at)}
        </span>
        <div className="flex gap-1">
          {/* Download */}
          <button
            onClick={() => onDownload(render.id)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
            title="Скачать"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>
          {/* Delete */}
          <button
            onClick={() => onDelete(render.id)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors"
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Мои карточки
      </h1>

      {/* Stats Cards */}
      <StatsCards />

      {/* Renders Grid */}
      {isFirstLoad ? (
        <GridSkeleton />
      ) : rendersError ? (
        <div className="rounded-xl bg-red-50 p-8 text-center">
          <p className="text-red-600 mb-3">Ошибка загрузки</p>
          <button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["renders"] })
            }
            className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-100 transition-colors"
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
              className="mt-6 w-full rounded-lg border border-gray-200 py-3 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {rendersLoading ? "Загрузка..." : "Загрузить ещё"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
