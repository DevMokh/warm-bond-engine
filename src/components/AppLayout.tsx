import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full" dir="rtl">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-[50px] flex items-center justify-between border-b border-border/50 glass sticky top-0 z-30 px-3 sm:h-14 sm:px-4">
            <SidebarTrigger className="h-9 w-9 sm:h-10 sm:w-10" />
            <span className="text-sm font-bold gradient-text">شغّل مخك</span>
          </header>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};
