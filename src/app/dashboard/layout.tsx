import { AppHeader } from "@/components/dashboard/AppHeader";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar"; // Import SidebarProvider

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}> {/* Wrap with SidebarProvider */}
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-6 bg-muted/40 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
