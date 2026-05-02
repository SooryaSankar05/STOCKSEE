import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { allStocks, type Stock } from "@/data/stockData";

interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume: string | null;
  market_cap: string | null;
  pe: number | null;
  high_52w: number | null;
  low_52w: number | null;
  source: string | null;
  delay_label: string | null;
  discrepancy: boolean | null;
  exchange: string | null;
  updated_at: string;
}

export interface PriceMeta {
  source: string | null;
  delay_label: string | null;
  discrepancy: boolean;
  updated_at: string;
}

function mergeStocks(stocks: Stock[], prices: StockPrice[]): Stock[] {
  const priceMap = new Map(prices.map(p => [p.symbol, p]));
  return stocks.map(stock => {
    const live = priceMap.get(stock.symbol);
    if (!live || live.price <= 0) return stock;
    return {
      ...stock,
      price: Number(live.price),
      change: Number(live.change),
      changePercent: Number(live.change_percent),
      volume: live.volume || stock.volume,
      marketCap: live.market_cap || stock.marketCap,
      pe: live.pe ? Number(live.pe) : stock.pe,
      high52w: live.high_52w ? Number(live.high_52w) : stock.high52w,
      low52w: live.low_52w ? Number(live.low_52w) : stock.low52w,
    };
  });
}

function buildMeta(prices: StockPrice[]): Map<string, PriceMeta> {
  return new Map(
    prices.map((p) => [
      p.symbol,
      {
        source: p.source,
        delay_label: p.delay_label,
        discrepancy: !!p.discrepancy,
        updated_at: p.updated_at,
      },
    ])
  );
}

export function useStockPrices() {
  const [stocks, setStocks] = useState<Stock[]>(allStocks);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [liveSymbols, setLiveSymbols] = useState<Set<string>>(new Set());
  const [priceMeta, setPriceMeta] = useState<Map<string, PriceMeta>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCachedPrices = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("stock_prices").select("*");
      if (error) throw error;
      if (data && data.length > 0) {
        const prices = data as StockPrice[];
        setStocks(mergeStocks(allStocks, prices));
        setLiveSymbols(new Set(prices.map(d => d.symbol)));
        setPriceMeta(buildMeta(prices));
        setLastUpdated(new Date(prices[0].updated_at));
      }
    } catch (e) {
      console.error("Failed to fetch cached prices:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPrices = useCallback(async () => {
    try {
      const symbolBatch = allStocks.slice(0, 100).map(s => ({
        symbol: s.symbol,
        exchange: s.exchange,
      }));
      const { data, error } = await supabase.functions.invoke("stock-orchestrator", {
        body: { symbols: symbolBatch },
      });
      if (error) throw error;
      if (data?.prices) {
        const prices = data.prices as StockPrice[];
        setStocks(mergeStocks(allStocks, prices));
        setLiveSymbols(new Set(prices.map((p) => p.symbol)));
        setPriceMeta(buildMeta(prices));
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error("Failed to refresh prices:", e);
    }
  }, []);

  useEffect(() => {
    fetchCachedPrices();

    const checkAndRefresh = async () => {
      const { data } = await supabase
        .from("stock_prices")
        .select("updated_at")
        .limit(1)
        .order("updated_at", { ascending: false });
      const lastUpdate = data?.[0]?.updated_at;
      const isStale = !lastUpdate || (Date.now() - new Date(lastUpdate).getTime()) > 3600000;
      if (isStale) refreshPrices();
    };
    checkAndRefresh();

    // Auto-refresh every hour
    intervalRef.current = setInterval(() => {
      refreshPrices();
    }, 3600000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCachedPrices, refreshPrices]);

  return { stocks, loading, lastUpdated, refreshPrices, liveSymbols, priceMeta };
}
