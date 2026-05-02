import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WatchlistItem {
  id: string;
  symbol: string;
  exchange: string;
  added_at: string;
}

export function useWatchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("watchlist")
      .select("id, symbol, exchange, added_at")
      .order("added_at", { ascending: false });
    if (!error && data) setItems(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = async (symbol: string, exchange: string) => {
    if (!user) {
      toast.error("Sign in to add to watchlist");
      return false;
    }
    const { error } = await supabase
      .from("watchlist")
      .insert({ user_id: user.id, symbol, exchange });
    if (error) {
      if (error.code === "23505") toast.info(`${symbol} already in watchlist`);
      else toast.error(error.message);
      return false;
    }
    toast.success(`${symbol} added to watchlist`);
    await refresh();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("watchlist").delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    toast.success("Removed from watchlist");
    await refresh();
    return true;
  };

  const has = (symbol: string, exchange: string) =>
    items.some((i) => i.symbol === symbol && i.exchange === exchange);

  return { items, loading, add, remove, has, refresh };
}
