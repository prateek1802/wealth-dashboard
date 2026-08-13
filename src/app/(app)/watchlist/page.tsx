import { TopBar } from "@/components/layout/top-bar";
import { watchlistRepository } from "@/lib/database/repositories/watchlist.repository";
import { WatchlistView } from "@/features/watchlist/components/watchlist-view";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const items = await watchlistRepository.findAll();
  return (
    <div>
      <TopBar title="Watchlist" subtitle="Tracked without being held" />
      <WatchlistView items={items} />
    </div>
  );
}
