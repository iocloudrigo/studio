
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
import { usePathname, useRouter } from "next/navigation";
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
  User as UserIcon,
  Loader2,
} from "lucide-react";
import { Button } from "../ui/button";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { signOut, onAuthStateChanged, type User as FirebaseUser, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator as DropdownMenuSeparatorItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import type { Collaborator } from "@/app/dashboard/settings/page";

interface ActiveCollaborator {
  id: string;
  nome_completo: string;
  ruolo: string; // Aggiunto ruolo
}

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

const LOCAL_STORAGE_ACTIVE_COLLABORATOR_KEY = "activeIncastroCollaborator";

export function AppSidebar() {
  const currentPathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { state: sidebarState, isMobile } = useSidebar();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activeCollaborator, setActiveCollaborator] = useState<ActiveCollaborator | null>(null);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(true);

  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [targetAdminCollaboratorToSwitch, setTargetAdminCollaboratorToSwitch] = useState<ActiveCollaborator | null>(null);
  const [passwordForReauth, setPasswordForReauth] = useState("");
  const [isReauthenticating, setIsReauthenticating] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setCompanyId(user.uid);
      } else {
        setCurrentUser(null);
        setCompanyId(null);
        setCollaborators([]);
        setActiveCollaborator(null);
        localStorage.removeItem(LOCAL_STORAGE_ACTIVE_COLLABORATOR_KEY);
      }
    });
    return () => unsubscribe();
  }, []);

  const setDefaultActiveCollaborator = useCallback((collaboratorList: Collaborator[], user: FirebaseUser | null) => {
    if (user && collaboratorList.length > 0) {
      const adminCollaborator = collaboratorList.find(c => c.email === user.email && c.ruolo === "Amministratore");
      if (adminCollaborator) {
        const defaultActive: ActiveCollaborator = { 
          id: adminCollaborator.id, 
          nome_completo: adminCollaborator.nome_completo,
          ruolo: adminCollaborator.ruolo // Salva anche il ruolo
        };
        setActiveCollaborator(defaultActive);
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_COLLABORATOR_KEY, JSON.stringify(defaultActive));
      } else if (collaboratorList.length > 0) {
        const firstCollaborator = collaboratorList[0];
        const fallbackActive: ActiveCollaborator = { 
            id: firstCollaborator.id, 
            nome_completo: firstCollaborator.nome_completo,
            ruolo: firstCollaborator.ruolo // Salva anche il ruolo
        };
        setActiveCollaborator(fallbackActive);
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_COLLABORATOR_KEY, JSON.stringify(fallbackActive));
      }
    } else {
      setActiveCollaborator(null);
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_COLLABORATOR_KEY);
    }
  }, []);


  const fetchCollaborators = useCallback(async (currentCompanyId: string) => {
    if (!currentCompanyId) return;
    setIsLoadingCollaborators(true);
    try {
      const q = query(collection(db, "collaboratori_azienda"), where("id_azienda", "==", currentCompanyId), orderBy("data_creazione", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedCollaborators = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as Collaborator)); // Collaborator ha già il ruolo
      setCollaborators(fetchedCollaborators);

      const storedActiveCollaborator = localStorage.getItem(LOCAL_STORAGE_ACTIVE_COLLABORATOR_KEY);
      if (storedActiveCollaborator) {
        try {
          const parsedCollaborator: ActiveCollaborator = JSON.parse(storedActiveCollaborator);
          if (fetchedCollaborators.some(c => c.id === parsedCollaborator.id)) {
            // Assicurati che il ruolo sia aggiornato da localStorage se è cambiato in DB
            const matchingDbCollaborator = fetchedCollaborators.find(c => c.id === parsedCollaborator.id);
            if(matchingDbCollaborator && parsedCollaborator.ruolo !== matchingDbCollaborator.ruolo){
              parsedCollaborator.ruolo = matchingDbCollaborator.ruolo;
              localStorage.setItem(LOCAL_STORAGE_ACTIVE_COLLABORATOR_KEY, JSON.stringify(parsedCollaborator));
            }
            setActiveCollaborator(parsedCollaborator);
          } else {
            setDefaultActiveCollaborator(fetchedCollaborators, auth.currentUser);
          }
        } catch (e) {
          console.error("Error parsing active collaborator from localStorage", e);
          setDefaultActiveCollaborator(fetchedCollaborators, auth.currentUser);
        }
      } else {
        setDefaultActiveCollaborator(fetchedCollaborators, auth.currentUser);
      }

    } catch (error) {
      console.error("Errore nel caricare i collaboratori:", error);
      toast({ title: "Errore Caricamento Collaboratori", description: "Impossibile caricare l'elenco dei collaboratori per il selettore.", variant: "destructive" });
    } finally {
      setIsLoadingCollaborators(false);
    }
  }, [toast, setDefaultActiveCollaborator]);

  useEffect(() => {
    if (companyId) {
      fetchCollaborators(companyId);
    }
  }, [companyId, fetchCollaborators]);


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
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_COLLABORATOR_KEY);
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

  const handleActiveCollaboratorChange = (collaboratorId: string) => {
    const selected = collaborators.find(c => c.id === collaboratorId);
    if (selected) {
      const newActiveTarget: ActiveCollaborator = { 
        id: selected.id, 
        nome_completo: selected.nome_completo,
        ruolo: selected.ruolo
      };

      // Se si sta cercando di switchare a un "Amministratore"
      // e l'utente attivo corrente non è già *quello stesso* amministratore
      if (newActiveTarget.ruolo === "Amministratore" && 
          !(activeCollaborator?.ruolo === "Amministratore" && activeCollaborator?.id === newActiveTarget.id)) {
        setTargetAdminCollaboratorToSwitch(newActiveTarget);
        setIsPasswordPromptOpen(true);
      } else {
        // Altrimenti, esegui lo switch normalmente
        setActiveCollaborator(newActiveTarget);
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_COLLABORATOR_KEY, JSON.stringify(newActiveTarget));
        toast({ title: "Utente Attivo Cambiato", description: `Ora stai operando come ${newActiveTarget.nome_completo}.` });
      }
    }
  };

  const handlePasswordPromptSubmit = async () => {
    if (!currentUser || !currentUser.email || !targetAdminCollaboratorToSwitch) return;
    if (!passwordForReauth) {
      toast({ title: "Errore", description: "La password è richiesta.", variant: "destructive" });
      return;
    }

    setIsReauthenticating(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, passwordForReauth);
      await reauthenticateWithCredential(currentUser, credential);
      
      setActiveCollaborator(targetAdminCollaboratorToSwitch);
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_COLLABORATOR_KEY, JSON.stringify(targetAdminCollaboratorToSwitch));
      toast({ title: "Successo!", description: `Ora stai operando come Amministratore: ${targetAdminCollaboratorToSwitch.nome_completo}.` });
      
      setIsPasswordPromptOpen(false);
      setPasswordForReauth("");
      setTargetAdminCollaboratorToSwitch(null);
    } catch (error: any) {
      console.error("Errore di riautenticazione:", error);
      toast({
        title: "Errore Riconferma Password",
        description: error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' ? "Password errata." : "Impossibile riconfermare la password. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsReauthenticating(false);
    }
  };


  return (
    <>
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
                          return currentFullUrl === sub.href || (currentPathname === '/dashboard/requests' && sub.href.startsWith('/dashboard/requests?statusFilter=') && currentFullUrl === sub.href);
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
                          const isActive = currentFullUrl === subItem.href;
                          
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
        
        <SidebarFooter className="p-2 border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    tooltip={sidebarState === "collapsed" ? (activeCollaborator?.nome_completo || "Seleziona Utente") : undefined}
                    className="w-full"
                    variant="ghost"
                    aria-label="Seleziona utente attivo"
                  >
                    <UserIcon />
                    {sidebarState === "expanded" && (
                      <span className="truncate">
                        {isLoadingCollaborators ? "Caricamento..." : activeCollaborator?.nome_completo || "Seleziona Utente"}
                      </span>
                    )}
                    {sidebarState === "expanded" && <ChevronDown className="h-4 w-4 ml-auto opacity-50" />}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 ml-2 mb-1" side="top" align="start">
                  <DropdownMenuLabel>Opera come:</DropdownMenuLabel>
                  <DropdownMenuSeparatorItem />
                  {isLoadingCollaborators ? (
                    <DropdownMenuRadioItem value="loading" disabled>Caricamento utenti...</DropdownMenuRadioItem>
                  ) : collaborators.length > 0 ? (
                    <DropdownMenuRadioGroup value={activeCollaborator?.id || ""} onValueChange={handleActiveCollaboratorChange}>
                      {collaborators.map((collaborator) => (
                        <DropdownMenuRadioItem key={collaborator.id} value={collaborator.id} className="cursor-pointer">
                          {collaborator.nome_completo} ({collaborator.ruolo})
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  ) : (
                    <DropdownMenuRadioItem value="no-users" disabled>Nessun collaboratore</DropdownMenuRadioItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
            <SidebarSeparator />
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

      {currentUser && (
        <AlertDialog open={isPasswordPromptOpen} onOpenChange={(open) => {
          if (!open) { // Se l'utente chiude il dialogo (es. cliccando fuori o Esc)
            setPasswordForReauth("");
            setTargetAdminCollaboratorToSwitch(null);
          }
          setIsPasswordPromptOpen(open);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma Identità Amministratore</AlertDialogTitle>
              <AlertDialogDescription>
                Per operare come Amministratore ("{targetAdminCollaboratorToSwitch?.nome_completo}"), 
                inserisci la password di login dell'account principale ({currentUser.email}).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="reauth-password">Password Amministratore</Label>
              <Input
                id="reauth-password"
                type="password"
                value={passwordForReauth}
                onChange={(e) => setPasswordForReauth(e.target.value)}
                placeholder="••••••••"
                disabled={isReauthenticating}
                onKeyPress={(e) => { if (e.key === 'Enter' && passwordForReauth) handlePasswordPromptSubmit(); }}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isReauthenticating} onClick={() => {
                setIsPasswordPromptOpen(false); 
                setPasswordForReauth(""); 
                setTargetAdminCollaboratorToSwitch(null);
              }}>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handlePasswordPromptSubmit} disabled={isReauthenticating || !passwordForReauth}>
                {isReauthenticating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Conferma e Cambia Utente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

    