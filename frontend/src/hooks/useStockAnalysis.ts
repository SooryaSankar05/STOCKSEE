import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StockAnalysis {
  symbol: string;
  trend: "bullish" | "bearish" | "sideways";
  momentum: "strong" | "moderate" | "weak";
  risk: "low" | "medium" | "high";
  insight: string;
  confidence: number;
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  rsi_14: number | null;
  cached?: boolean;
}

export function useStockAnalysis(symbol: string | undefined, exchange?: string, enabled = true) {
  const [data, setData] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol || !enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase.functions
      .invoke("stock-analysis", { body: { symbol, exchange } })
      .then(({ data: res, error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        else if (res?.error) setError(res.error);
        else setData(res as StockAnalysis);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol, exchange, enabled]);

  return { data, loading, error };
}
