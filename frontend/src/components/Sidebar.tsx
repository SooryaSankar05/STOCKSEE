import { Link, useLocation } from "react-router-dom";
import {
  Globe, Activity, Star, BriefcaseBusiness,
  Zap, BookOpen, Bot, LayoutGrid, Map, Newspaper, Settings, BarChart3,
  Filter
} from "lucide-react";

const NAV = [
  { path: "/",          label: "Dashboard",   icon: LayoutGrid },
  { path: "/analyse",   label: "Analyse",     icon: Activity },
  { path: "/watchlist", label: "Watchlist",   icon: Star },
  { path: "/portfolio", label: "Portfolio",   icon: BriefcaseBusiness },
  { path: "/alerts",    label: "Alerts",      icon: Zap },
  { path: "/news",      label: "News Center", icon: Newspaper },
  { path: "/heatmaps",  label: "Heatmaps",    icon: Map },
  { path: "/screener",  label: "Screener Pro",icon: Filter },
  { path: "/academy",   label: "Academy",     icon: BookOpen },
  { path: "/settings",  label: "Settings",    icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside
      className="fixed left-0 bottom-0 w-[240px] flex flex-col z-40 overflow-y-auto transition-all duration-300 bg-bg-secondary border-r border-border"
      style={{ top: 0 }}
    >
      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-3 px-6 py-5 border-b border-border hover:bg-blue-accent/5 transition-colors group h-[73px]"
      >
        <div className="w-8 h-8 bg-blue-accent rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,255,0.35)] group-hover:shadow-[0_0_20px_rgba(37,99,255,0.5)] transition-shadow">
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        <span className="font-extrabold text-base tracking-widest uppercase text-text-primary group-hover:text-blue-accent transition-colors font-heading">
          STOCKSEE
        </span>
      </Link>

      {/* Section label */}
      <div className="px-6 pt-5 pb-2 text-[10px] font-bold tracking-widest uppercase text-text-muted">
        Terminal Navigation
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3">
        {NAV.map((item) => {
          // Check if active, ignoring query params for highlighting
          const isActive = item.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.path.split('?')[0]);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 mb-1 rounded-lg text-[13px] font-semibold transition-all relative group ${
                isActive 
                  ? "text-blue-accent bg-blue-accent/10" 
                  : "text-text-muted hover:text-white hover:bg-blue-accent/5"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-blue-accent rounded-r-md shadow-[0_0_8px_rgba(37,99,255,0.5)]" />
              )}
              {/* Hover edge glow effect simulated via before pseudo element */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 border border-blue-accent/10 rounded-lg pointer-events-none transition-opacity" />
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${isActive ? "text-blue-accent" : "text-text-muted group-hover:text-white"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      
      {/* Footer link or pro upsell can go here */}
    </aside>
  );
}
