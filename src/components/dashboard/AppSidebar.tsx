
"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/shared/Logo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; // useRouter è già importato
import {
  LayoutDashboard,
  FileText,
  CalendarDays,
  Users,
  Settings,
  MessageSquarePlus,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  LogOut,
  Archive,
} from "lucide-react";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Richieste",
    icon: FileText,
    subItems: [
      { href: "/dashboard/requests", label: "Tutte le Richieste", icon: FileText },
      { href: "/dashboard/requests/new", label: "Nuova Richiesta", icon: MessageSquarePlus },
      { href: "/dashboard/requests/suggestions", label: "Suggerimenti AI", icon: Lightbulb },
      { href: "/dashboard/requests?statusFilter=completata", label: "Archiviate", icon: Archive },
    ]
  },
  { href: "/dashboard/appointments", label: "Appuntamenti", icon: CalendarDays },
  { href: "/dashboard/technicians", label: "Tecnici", icon: Users },
  { href: "/dashboard/settings", label: "Impostazioni", icon: Settings },
];

export function AppSidebar() {
  const currentPathname = usePathname(); // Chiamato una volta qui
  const router = useRouter();
  const { toast } = useToast();
  const { state: sidebarState, isMobile } = useSidebar();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (sidebarState === "collapsed" || isMobile) {
      setOpenSubmenus({});
    }
  }, [sidebarState, isMobile]);

  const toggleSubmenu = (label: string) => {
    if (sidebarState === "expanded") {
      setOpenSubmenus(prev => ({ ...prev, [label]: !prev[label] }));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logout Effettuato",
        description: "Sei stato disconnesso con successo.",
      });
      router.push("/");
    } catch (error) {
      console.error("Errore durante il logout:", error);
      toast({
        title: "Errore Logout",
        description: "Impossibile effettuare il logout. Riprova.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b">
        {sidebarState === "expanded" ? (
          <Link href="/dashboard" className="flex items-center gap-2 py-2">
            <Logo />
          </Link>
        ) : (
          <Link href="/dashboard" className="flex items-center justify-center py-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </Link>
        )}
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              {item.subItems ? (
                <>
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md p-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      sidebarState === "collapsed" && "!size-8 !p-2",
                      item.subItems.some(sub => {
                        const currentFullUrl = currentPathname + (typeof window !== "undefined" ? window.location.search : "");
                        return currentFullUrl === sub.href || (currentPathname === '/dashboard/requests' && sub.href.startsWith('/dashboard/requests?statusFilter='));
                      }) && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                    onClick={() => toggleSubmenu(item.label)}
                    title={item.label}
                    disabled={sidebarState === "collapsed"}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {sidebarState === "expanded" && <span>{item.label}</span>}
                    </div>
                    {sidebarState === "expanded" && (openSubmenus[item.label] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  </Button>
                  {openSubmenus[item.label] && sidebarState === "expanded" && (
                    <SidebarMenuSub>
                      {item.subItems.map((subItem) => {
                        const currentFullUrl = currentPathname + (typeof window !== "undefined" ? window.location.search : "");
                        const isActive = currentFullUrl === subItem.href || (currentPathname === '/dashboard/requests' && subItem.href.startsWith('/dashboard/requests?statusFilter=') && currentFullUrl === subItem.href);
                        
                        return (
                          <SidebarMenuSubItem key={subItem.href}>
                            <Link href={subItem.href} legacyBehavior passHref>
                              <SidebarMenuSubButton
                                isActive={isActive}
                                className="gap-2"
                              >
                                <subItem.icon className="h-4 w-4 shrink-0" />
                                <span>{subItem.label}</span>
                              </SidebarMenuSubButton>
                            </Link>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  )}
                </>
              ) : (
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={currentPathname === item.href}
                    tooltip={sidebarState === "collapsed" ? item.label : undefined}
                  >
                    <item.icon />
                    {sidebarState === "expanded" && <span>{item.label}</span>}
                  </SidebarMenuButton>
                </Link>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarSeparator />
      <SidebarFooter className="p-2 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip={sidebarState === "collapsed" ? "Esci" : undefined}
              className="w-full"
            >
              <LogOut />
              {sidebarState === "expanded" && <span>Esci</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
