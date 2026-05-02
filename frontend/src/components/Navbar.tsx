import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, Menu, X, TrendingUp, BarChart3, Zap, BookOpen, Bot, Sun, Moon, LogIn, Star, Briefcase, LogOut, ChevronDown } from "lucide-react";
import stocksenseLogo from "@/assets/stocksense-logo.png";
import StockSeeLogo from "@/components/StockSeeLogo";
import NotificationsBell from "@/components/NotificationsBell";
import { allStocks } from "@/data/stockData";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { path: "/", label: "Discover", icon: TrendingUp },
  { path: "/analyse", label: "Analyse", icon: BarChart3 },
  { path: "/alerts", label: "Alerts", icon: Zap },
  { path: "/learn", label: "Learn", icon: BookOpen },
  { path: "/advisor", label: "AI Advisor", icon: Bot },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
    document.documentElement.classList.toggle("light");
  };

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allStocks
      .filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.exchange.toLowerCase().includes(q)
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

  const goToStock = (symbol: string) => {
    navigate(`/stock/${symbol}`);
    setSearch("");
    setShowResults(false);
    setMobileOpen(false);
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

  const userInitial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/[0.04] backdrop-blur-[10px]">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <StockSeeLogo className="text-xl" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link flex items-center gap-2 ${location.pathname === item.path ? "nav-link-active" : ""}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <div ref={searchRef} className="relative">
            <form onSubmit={handleSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
                placeholder="Search stocks (AAPL, TCS, NSE...)"
                className="h-9 w-64 rounded-lg bg-secondary border-none pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-background transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </form>
            {showResults && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-popover shadow-xl z-50">
                {results.map((s) => (
                  <button
                    key={`${s.exchange}-${s.symbol}`}
                    onClick={() => goToStock(s.symbol)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{s.flag}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.symbol}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.name}</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">{s.exchange}</span>
                  </button>
                ))}
              </div>
            )}
            {showResults && search.trim() && results.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-muted-foreground">
                No matches for "{search}"
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <NotificationsBell />

          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-sm transition-colors"
              >
                <span className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                  {userInitial}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs text-muted-foreground">Signed in as</p>
                    <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                  </div>
                  <Link to="/watchlist" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors">
                    <Star className="w-4 h-4 text-neon-amber" /> My Watchlist
                  </Link>
                  <Link to="/portfolio" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors">
                    <Briefcase className="w-4 h-4 text-primary" /> Portfolio
                  </Link>
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary text-neon-red transition-colors border-t border-border">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <LogIn className="w-4 h-4" /> Login
            </Link>
          )}
        </div>

        <button className="lg:hidden p-2 text-muted-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-fade-in">
          <nav className="container py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`nav-link flex items-center gap-2 ${location.pathname === item.path ? "nav-link-active" : ""}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link to="/watchlist" onClick={() => setMobileOpen(false)} className="nav-link flex items-center gap-2">
                  <Star className="w-4 h-4 text-neon-amber" /> My Watchlist
                </Link>
                <Link to="/portfolio" onClick={() => setMobileOpen(false)} className="nav-link flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" /> Portfolio
                </Link>
                <button onClick={handleSignOut} className="nav-link flex items-center gap-2 text-neon-red text-left">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setMobileOpen(false)}
                className="nav-link flex items-center gap-2 text-primary"
              >
                <LogIn className="w-4 h-4" /> Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
