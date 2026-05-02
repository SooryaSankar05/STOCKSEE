import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Executive { name: string; role: string }
export interface CompanyProfile {
  symbol: string;
  ceo: string | null;
  founded: string | null;
  headquarters: string | null;
  employees: string | null;
  executives: Executive[];
  segments: string[];
  revenue_drivers: string[];
  industry_position: string | null;
  global_presence: string[];
  summary: string | null;
  source: string;
  cached?: boolean;
}

export function useCompanyProfile(symbol?: string, name?: string, exchange?: string, sector?: string) {
  const [data, setData] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase.functions
      .invoke("company-profile", { body: { symbol, name, exchange, sector } })
      .then(({ data: res, error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        else if (res?.error) setError(res.error);
        else setData(res as CompanyProfile);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true };
  }, [symbol, name, exchange, sector]);

  return { data, loading, error };
}
