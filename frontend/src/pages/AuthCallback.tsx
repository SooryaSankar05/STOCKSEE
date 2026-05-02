import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const run = async () => {
      // 1) Surface OAuth/magic-link errors early
      const hash = window.location.hash || "";
      if (hash.includes("error=") || hash.includes("error_description=")) {
        toast.error("Authentication failed or was canceled.");
        navigate("/auth", { replace: true });
        return;
      }

      const qs = new URLSearchParams(location.search);
      const code = qs.get("code");

      try {
        // 2) PKCE OAuth flow returns `code` -> must exchange for session
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // 3) For other flows, ensure we have a session hydrated
          await supabase.auth.getSession();
        }

        const redirect =
          sessionStorage.getItem("auth:redirect") ||
          qs.get("redirect") ||
          "/";
        sessionStorage.removeItem("auth:redirect");

        toast.success("Successfully logged in!");
        navigate(redirect.startsWith("/") ? redirect : "/", { replace: true });
      } catch (err: any) {
        toast.error(err?.message || "Authentication failed");
        navigate("/auth", { replace: true });
      }
    };

    void run();
  }, [navigate, location.search]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Completing sign in...</p>
      </div>
    </div>
  );
}
