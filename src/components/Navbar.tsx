import { Link, useLocation, useNavigate } from "react-router-dom";
import { Brain, Home, Trophy, User, LogOut, Gamepad2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("تم تسجيل الخروج");
    navigate("/");
  };

  const navItems = [
    { to: "/", label: "الرئيسية", icon: Home },
    { to: "/play", label: "العب", icon: Gamepad2 },
    { to: "/leaderboard", label: "الصدارة", icon: Trophy },
    { to: "/profile", label: "البروفايل", icon: User },
    ...(isAdmin ? [{ to: "/admin", label: "أدمن", icon: ShieldCheck }] : []),
  ];

  return (
    <>
      {/* Desktop top header - hidden on mobile */}
      <header className="hidden md:block sticky top-0 z-40 w-full border-b border-border/50 glass">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-bg">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-extrabold gradient-text">شغّل مخك</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-smooth",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                <span>خروج</span>
              </Button>
            ) : (
              <Button size="sm" onClick={() => navigate("/auth")}>
                تسجيل الدخول
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom nav with sign out integrated */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-smooth",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
          {user ? (
            <button
              onClick={handleSignOut}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs text-muted-foreground transition-smooth"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-[10px]">خروج</span>
            </button>
          ) : (
            <Link
              to="/auth"
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs text-muted-foreground transition-smooth"
            >
              <User className="h-5 w-5" />
              <span className="text-[10px]">دخول</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
};
