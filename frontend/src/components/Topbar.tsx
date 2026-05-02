import { useState, useRef, useMemo, useEffect } from "react";
import { Search, LogIn, LogOut, Star, Briefcase, Bell, ChevronDown, Moon, Sun, ArrowUpRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { allStocks } from "@/data/stockData";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";

export default function Topbar() {
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allStocks
      .filter((s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut: / focuses search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        (searchRef.current?.querySelector("input") as HTMLInputElement)?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const goToStock = (symbol: string) => {
    navigate(`/stock/${symbol}`);
    setSearch("");
    setShowResults(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results[0]) goToStock(results[0].symbol);
  };

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    navigate("/");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const userInitial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="h-[80px] bg-bg-primary/90 backdrop-blur-xl border-b border-border flex items-center justify-between px-12 sticky top-0 z-30 flex-shrink-0 transition-colors duration-300">
      
      {/* Left (Empty since Sidebar is always there, but could add breadcrumbs or contextual info) */}
      <div className="flex-1 flex items-center">
        {/* Placeholder for dynamic breadcrumbs */}
      </div>

      {/* Center - Massive Search Bar */}
      <div className="flex-[2] max-w-2xl relative" ref={searchRef}>
        <form onSubmit={handleSubmit}>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none group-focus-within:text-blue-accent transition-colors" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              placeholder="Search stocks, ETFs, crypto, sectors, earnings..."
              className="bg-card-surface border border-border rounded-xl text-text-primary font-sans text-base py-3 pl-12 pr-12 w-full outline-none transition-all duration-300 focus:border-blue-accent focus:ring-4 focus:ring-blue-accent/10 shadow-sm focus:shadow-blue-accent/20"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 bg-bg-primary border border-border rounded text-[10px] text-text-muted font-mono font-bold pointer-events-none">
              /
            </div>
          </div>
        </form>

        {showResults && results.length > 0 && (
          <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-card-surface/95 backdrop-blur-2xl border border-border rounded-xl shadow-2xl z-50 max-h-[400px] overflow-y-auto overflow-x-hidden p-2">
            <div className="text-xs font-semibold text-text-muted px-3 py-2 uppercase tracking-wider mb-1">
              Top Results
            </div>
            {results.map((s) => {
              const isUp = s.change >= 0;
              return (
                <button
                  key={`${s.exchange}-${s.symbol}`}
                  onClick={() => goToStock(s.symbol)}
                  className="w-full flex items-center justify-between px-3 py-3 bg-transparent rounded-lg cursor-pointer text-left transition-all hover:bg-blue-accent/10 group"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-bg-secondary border border-border flex items-center justify-center mr-3 font-bold text-xs text-text-primary group-hover:border-blue-accent/30 transition-colors">
                      {s.symbol[0]}
                    </div>
                    <div>
                      <div className="font-mono text-sm font-bold text-text-primary group-hover:text-blue-accent transition-colors">
                        {s.symbol}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5 truncate max-w-[200px]">
                        {s.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-mono text-sm font-semibold ${isUp ? "text-green-gain" : "text-red-loss"}`}>
                      {isUp ? "+" : ""}{s.changePercent.toFixed(2)}%
                    </span>
                    <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase">
                      {s.exchange}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex-1 flex items-center justify-end gap-5">
        {/* Status */}
        <div className="flex items-center gap-2.5 text-text-muted text-[11px] font-bold tracking-widest uppercase bg-card-surface px-3 py-1.5 rounded-lg border border-border">
          <span className="w-2 h-2 rounded-full bg-green-gain shadow-[0_0_8px_var(--green-gain)] animate-pulse" />
          MARKET OPEN
        </div>

        {/* Upgrade to Pro */}
        <Link 
          to="/pricing"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-premium/10 text-gold-premium border border-gold-premium/20 text-xs font-bold uppercase tracking-wider hover:bg-gold-premium/20 transition-colors"
        >
          Upgrade Pro <ArrowUpRight className="w-3 h-3" />
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 flex items-center justify-center bg-card-surface border border-border rounded-xl cursor-pointer text-text-muted transition-all duration-200 hover:text-text-primary hover:border-blue-accent hover:bg-blue-accent/10"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <button
          className="relative w-10 h-10 flex items-center justify-center bg-card-surface border border-border rounded-xl cursor-pointer text-text-muted transition-all duration-200 hover:text-text-primary hover:border-blue-accent hover:bg-blue-accent/10"
        >
          <Bell size={18} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-blue-accent border-2 border-card-surface"></span>
        </button>

        {/* User */}
        {user ? (
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2.5 bg-card-surface border border-border rounded-xl pl-2 pr-3 py-1.5 cursor-pointer transition-all duration-200 hover:border-blue-accent"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-accent to-purple-accent flex items-center justify-center font-bold text-xs text-white shadow-sm">
                {userInitial}
              </div>
              <ChevronDown size={14} className="text-text-muted" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-[240px] bg-card-surface/95 backdrop-blur-2xl border border-border rounded-xl z-50 shadow-2xl p-2">
                <div className="px-3 py-3 border-b border-border mb-1">
                  <div className="text-[10px] font-bold tracking-widest uppercase text-text-muted">Signed in as</div>
                  <div className="text-[13px] text-text-primary mt-1 font-medium truncate">{user.email}</div>
                </div>
                <div className="p-1">
                  {[
                    { to: "/watchlist", icon: Star, label: "Watchlists" },
                    { to: "/portfolio", icon: Briefcase, label: "Portfolio AI" },
                  ].map(({ to, icon: Icon, label }) => (
                    <Link key={to} to={to} onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-text-muted no-underline rounded-lg transition-all hover:bg-blue-accent/10 hover:text-blue-accent"
                    >
                      <Icon size={16} />
                      {label}
                    </Link>
                  ))}
                </div>
                <div className="p-1 border-t border-border mt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-red-loss bg-transparent cursor-pointer rounded-lg border-none outline-none transition-all hover:bg-red-loss/10"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-accent rounded-xl text-sm font-bold text-white no-underline shadow-[0_4px_14px_0_rgba(37,99,255,0.39)] transition-all duration-200 hover:bg-blue-accent/90 hover:-translate-y-0.5"
          >
            <LogIn size={16} />
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
