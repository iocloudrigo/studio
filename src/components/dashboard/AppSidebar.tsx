
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
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { Button } from "../ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card"; // Added import

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { 
    label: "Richieste", 
    icon: FileText,
    subItems: [
      { href: "/dashboard/requests", label: "Tutte le Richieste", icon: FileText },
      { href: "/dashboard/requests/new", label: "Nuova Richiesta", icon: MessageSquarePlus },
      { href: "/dashboard/requests/suggestions", label: "Suggerimenti AI", icon: Lightbulb },
    ]
  },
  { href: "/dashboard/appointments", label: "Appuntamenti", icon: CalendarDays },
  { href: "/dashboard/technicians", label: "Tecnici", icon: Users },
  { href: "/dashboard/settings", label: "Impostazioni", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { open, state: sidebarState } = useSidebar();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar" defaultOpen={true}>
      <SidebarHeader className="border-b">
        {/* Show full logo when expanded, icon/smaller when collapsed */}
        {sidebarState === "expanded" ? (
          <Link href="/dashboard" className="flex items-center gap-2 py-2">
            <Logo />
          </Link>
        ) : (
          <Link href="/dashboard" className="flex items-center justify-center py-2">
             {/* Placeholder for small logo/icon when collapsed */}
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
                      item.subItems.some(sub => pathname.startsWith(sub.href)) && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                    onClick={() => toggleSubmenu(item.label)}
                    title={item.label}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {sidebarState === "expanded" && <span>{item.label}</span>}
                    </div>
                    {sidebarState === "expanded" && (openSubmenus[item.label] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  </Button>
                  {openSubmenus[item.label] && sidebarState === "expanded" && (
                    <SidebarMenuSub>
                      {item.subItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.href}>
                          <Link href={subItem.href} legacyBehavior passHref>
                            <SidebarMenuSubButton
                              isActive={pathname === subItem.href}
                              className="gap-2"
                            >
                              {/* <subItem.icon className="h-4 w-4 shrink-0" /> */}
                              <span>{subItem.label}</span>
                            </SidebarMenuSubButton>
                          </Link>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </>
              ) : (
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
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
      {sidebarState === "expanded" && (
        <>
          <SidebarSeparator />
          <SidebarFooter className="p-4 border-t">
             <Card className="bg-accent/10 border-accent/30">
                <CardContent className="p-4 text-center">
                  <Image src="https://placehold.co/200x100.png?text=Upgrade" alt="Upgrade Plan" width={200} height={100} className="mx-auto mb-2 rounded data-ai-hint='banner advertisement'" />
                  <p className="text-sm font-semibold text-foreground mb-1">Potenzia il tuo piano!</p>
                  <p className="text-xs text-muted-foreground mb-3">Sblocca funzionalità avanzate e supporto prioritario.</p>
                  <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Scopri di più</Button>
                </CardContent>
              </Card>
          </SidebarFooter>
        </>
      )}
    </Sidebar>
  );
}
