import UserBadge from "./UserBadge";

export default function Header() {
  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <a href="/" className="text-xl font-bold text-gray-900">
        MarketFoto
      </a>
      <UserBadge />
    </header>
  );
}
