import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Brain,
  Home,
  Gamepad2,
  Trophy,
  User,
  ShieldCheck,
  Users,
  Swords,
  Medal,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const mainItems = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/play", label: "العب", icon: Gamepad2 },
  { to: "/leaderboard", label: "الصدارة", icon: Trophy },
];

const socialItems = [
  { to: "/friends", label: "الأصدقاء", icon: Users },
  { to: "/matches", label: "تحديات 1v1", icon: Swords },
  { to: "/tournaments", label: "البطولات", icon: Medal },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
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

  const renderItems = (items: { to: string; label: string; icon: typeof Home }[]) =>
    items.map((item) => {
      const Icon = item.icon;
      const active = location.pathname === item.to;
      return (
        <SidebarMenuItem key={item.to}>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.to}
              className={cn(
                "flex items-center gap-2 hover:bg-muted/50",
                active && "bg-primary/10 text-primary font-semibold"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar collapsible="offcanvas" side="right">
      <SidebarHeader className="border-b border-border/50">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-bg shrink-0">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="text-lg font-extrabold gradient-text">شغّل مخك</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>الرئيسي</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <SidebarGroup>
            <SidebarGroupLabel>اجتماعي</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(socialItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {user && (
          <SidebarGroup>
            <SidebarGroupLabel>الحساب</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems([{ to: "/profile", label: "البروفايل", icon: User }])}
                {isAdmin && renderItems([{ to: "/admin", label: "أدمن", icon: ShieldCheck }])}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50">
        {user ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleSignOut} className="text-destructive">
                <LogOut className="h-4 w-4" />
                {!collapsed && <span>خروج</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => navigate("/auth")}>
                <User className="h-4 w-4" />
                {!collapsed && <span>دخول</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
