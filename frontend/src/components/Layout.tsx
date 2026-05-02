import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import TerminalTickerBar from "./TickerBar";

export default function Layout() {
  const location = useLocation();

  return (
    <div
      className="bg-bg-primary text-text-primary min-h-screen flex flex-col font-body"
    >
      {/* Global ticker bar — always at very top */}
      <TerminalTickerBar />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar is always present in V2 */}
        <Sidebar />

        <div className="flex flex-1 flex-col ml-[240px] min-w-0 overflow-hidden transition-all duration-300 relative">
          <Topbar />
          <main
            key={location.pathname}
            className="animate-fade-in-up flex-1 overflow-y-auto overflow-x-hidden p-6 relative w-full"
          >
            <div className="max-w-[1600px] mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
