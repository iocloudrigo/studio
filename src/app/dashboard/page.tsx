
"use client";

import { useState, useEffect, useCallback, useRef } from "react"; // Aggiunto useRef
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, ClipboardCheck, PlusCircle, Lightbulb, Activity, CalendarDays, UserCheck, Clock, Edit3, Search, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestDetailsSheet, type RequestSheetData } from "@/components/dashboard/requests/RequestDetailsSheet";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils"; 

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { collection, query, where, getCountFromServer, getDocs, orderBy, limit, Timestamp, doc, updateDoc } from "firebase/firestore";

interface DashboardStats {
  activeRequests: number | null;
  assignedRequests: number | null;
  inProgressRequests: number | null;
}

export interface RecentRequest extends RequestSheetData {
  // RequestSheetData già include id_azienda, assegnato_a_tecnico_id, assegnato_a_tecnico_nome
}

const activeRequestStatusesForLink = encodeURIComponent("in attesa,assegnata,programmata,in corso");

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats>({
    activeRequests: 0,
    assignedRequests: 0,
    inProgressRequests: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);

  const [loadingStats, setLoadingStats] = useState({
    activeRequests: true,
    assignedRequests: true,
    inProgressRequests: true,
  });
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedRequestForSheet, setSelectedRequestForSheet] = useState<RequestSheetData | null>(null);
  
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRequestDetailsForAI, setSelectedRequestDetailsForAI] = useState<RecentRequest | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null); // Riferimento per la tabella

  const fetchDashboardData = useCallback(async (currentCompanyId: string) => {
    // Fetch Active Requests ("Interventi Aperti")
    setLoadingStats(prev => ({ ...prev, activeRequests: true }));
    try {
      const activeRequestsQuery = query(
        collection(db, "richieste_clienti"),
        where("id_azienda", "==", currentCompanyId),
        where("stato", "not-in", ["completata", "annullata"])
      );
      const activeRequestsSnap = await getCountFromServer(activeRequestsQuery);
      setStats(prev => ({ ...prev, activeRequests: activeRequestsSnap.data().count }));
    } catch (error) {
      console.error("Error fetching active requests count:", error);
      toast({ title: "Errore Conteggio Interventi Aperti", description: "Impossibile caricare il conteggio.", variant: "destructive" });
      setStats(prev => ({ ...prev, activeRequests: 0 })); 
    } finally {
      setLoadingStats(prev => ({ ...prev, activeRequests: false }));
    }

    // Fetch Assigned Requests
    setLoadingStats(prev => ({ ...prev, assignedRequests: true }));
    try {
      const assignedRequestsQuery = query(
        collection(db, "richieste_clienti"),
        where("id_azienda", "==", currentCompanyId),
        where("stato", "==", "assegnata")
      );
      const assignedRequestsSnap = await getCountFromServer(assignedRequestsQuery);
      setStats(prev => ({ ...prev, assignedRequests: assignedRequestsSnap.data().count }));
    } catch (error) {
      console.error("Error fetching assigned requests stats:", error);
      toast({ title: "Errore Conteggio Richieste Assegnate", description: "Impossibile caricare il conteggio.", variant: "destructive" });
      setStats(prev => ({ ...prev, assignedRequests: 0 }));
    } finally {
      setLoadingStats(prev => ({ ...prev, assignedRequests: false }));
    }

    // Fetch In Progress Requests
    setLoadingStats(prev => ({ ...prev, inProgressRequests: true }));
    try {
      const inProgressRequestsQuery = query(
        collection(db, "richieste_clienti"),
        where("id_azienda", "==", currentCompanyId),
        where("stato", "==", "in corso")
      );
      const inProgressRequestsSnap = await getCountFromServer(inProgressRequestsQuery);
      setStats(prev => ({ ...prev, inProgressRequests: inProgressRequestsSnap.data().count }));
    } catch (error) {
      console.error("Error fetching in-progress requests stats:", error);
      toast({ title: "Errore Conteggio Tecnici al Lavoro", description: "Impossibile caricare il conteggio.", variant: "destructive" });
      setStats(prev => ({ ...prev, inProgressRequests: 0 }));
    } finally {
      setLoadingStats(prev => ({ ...prev, inProgressRequests: false }));
    }

    // Fetch Recent Requests (Table)
    setLoadingRequests(true);
    try {
      const requestsQuery = query(
        collection(db, "richieste_clienti"),
        where("id_azienda", "==", currentCompanyId),
        where("stato", "not-in", ["completata", "annullata"]), 
        orderBy("created_at", "desc"),
        limit(10)
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const fetchedRequests = requestsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          id_azienda: data.id_azienda,
          customer: data.nome_cliente || "N/D",
          service: data.tipo_servizio || "N/D",
          status: data.stato || "N/D",
          created_at: data.created_at as Timestamp | undefined,
          note_aggiuntive: data.note_aggiuntive || "",
          indirizzo_intervento: data.indirizzo_intervento || "",
          telefono_cliente: data.telefono_cliente || "",
          email_cliente: data.email_cliente || "",
          giorno_preferito: data.giorno_preferito || "",
          fascia_oraria: data.fascia_oraria || "",
          completata_da_collaboratore_id: data.completata_da_collaboratore_id,
          completata_da_collaboratore_nome: data.completata_da_collaboratore_nome,
          data_completamento: data.data_completamento as Timestamp | undefined,
          assegnato_a_tecnico_id: data.assegnato_a_tecnico_id,
          assegnato_a_tecnico_nome: data.assegnato_a_tecnico_nome,
        } as RecentRequest;
      });
      setRecentRequests(fetchedRequests);
    } catch (error) {
      console.error("Error fetching recent requests:", error);
      toast({ title: "Errore Richieste Recenti", description: "Impossibile caricare le richieste recenti.", variant: "destructive" });
      setRecentRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [toast]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setCompanyId(user.uid);
        fetchDashboardData(user.uid);
      } else {
        setCurrentUser(null);
        setCompanyId(null);
        setStats({ activeRequests: 0, assignedRequests: 0, inProgressRequests: 0 });
        setRecentRequests([]);
        setLoadingStats({ activeRequests: false, assignedRequests: false, inProgressRequests: false });
        setLoadingRequests(false);
      }
    });
    return () => unsubscribe();
  }, [fetchDashboardData]);


  const handleUpdateRequestStatus = async (requestId: string, newStatus: string, additionalData: Record<string, any> = {}) => {
    if (!companyId) {
      toast({ title: "Errore", description: "ID azienda non trovato.", variant: "destructive" });
      return;
    }
    try {
      const requestDocRef = doc(db, "richieste_clienti", requestId);
      await updateDoc(requestDocRef, { stato: newStatus, ...additionalData });
      toast({ title: "Successo!", description: `Stato della richiesta aggiornato a "${newStatus}".` });

      if (newStatus === "completata" || newStatus === "annullata") {
        setRecentRequests(prevRequests => prevRequests.filter(req => req.id !== requestId));
        if (selectedRowId === requestId) {
          setSelectedRowId(null);
          setSelectedRequestDetailsForAI(null);
        }
      } else {
        setRecentRequests(prevRequests =>
          prevRequests.map(req =>
            req.id === requestId ? { ...req, status: newStatus, ...additionalData } : req
          )
        );
        if (selectedRowId === requestId && selectedRequestDetailsForAI) {
            setSelectedRequestDetailsForAI(prev => prev ? {...prev, status: newStatus, ...additionalData} : null);
        }
      }
      
      if (companyId) {
        // Recalculate active requests
        setLoadingStats(prev => ({ ...prev, activeRequests: true }));
        getCountFromServer(query(collection(db, "richieste_clienti"), where("id_azienda", "==", companyId), where("stato", "not-in", ["completata", "annullata"])))
          .then(snap => setStats(prev => ({ ...prev, activeRequests: snap.data().count })))
          .catch(err => { console.error("Error refetching active requests:", err); toast({ title: "Errore Aggiornamento Statistiche", description: "Impossibile aggiornare conteggio interventi aperti.", variant: "destructive" });})
          .finally(() => setLoadingStats(prev => ({...prev, activeRequests: false })));

        // Recalculate assigned requests
        setLoadingStats(prev => ({ ...prev, assignedRequests: true }));
        getCountFromServer(query(collection(db, "richieste_clienti"), where("id_azienda", "==", companyId), where("stato", "==", "assegnata")))
          .then(snap => setStats(prev => ({ ...prev, assignedRequests: snap.data().count })))
          .catch(err => { console.error("Error refetching assigned requests:", err); toast({ title: "Errore Aggiornamento Statistiche", description: "Impossibile aggiornare conteggio richieste assegnate.", variant: "destructive" });})
          .finally(() => setLoadingStats(prev => ({...prev, assignedRequests: false })));
        
        // Recalculate in-progress requests
        setLoadingStats(prev => ({ ...prev, inProgressRequests: true }));
        getCountFromServer(query(collection(db, "richieste_clienti"), where("id_azienda", "==", companyId), where("stato", "==", "in corso")))
          .then(snap => setStats(prev => ({ ...prev, inProgressRequests: snap.data().count })))
          .catch(err => { console.error("Error refetching in-progress requests:", err); toast({ title: "Errore Aggiornamento Statistiche", description: "Impossibile aggiornare conteggio tecnici al lavoro.", variant: "destructive" });})
          .finally(() => setLoadingStats(prev => ({...prev, inProgressRequests: false })));
      }

    } catch (error) {
      console.error("Error updating request status:", error);
      toast({ title: "Errore Aggiornamento", description: "Impossibile aggiornare lo stato della richiesta.", variant: "destructive" });
      throw error;
    }
  };

  const handleRowClick = (req: RecentRequest) => {
    if (req.status === "in attesa") {
      if (selectedRowId === req.id) {
        setSelectedRowId(null);
        setSelectedRequestDetailsForAI(null);
      } else {
        setSelectedRowId(req.id);
        const requestDetails = recentRequests.find(r => r.id === req.id);
        setSelectedRequestDetailsForAI(requestDetails || null);
      }
    } else {
      setSelectedRowId(null);
      setSelectedRequestDetailsForAI(null);
    }
  };

  // Effect per gestire il click fuori dalla tabella
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tableContainerRef.current && !tableContainerRef.current.contains(event.target as Node) && selectedRowId) {
        setSelectedRowId(null);
        setSelectedRequestDetailsForAI(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedRowId]); // Aggiunto selectedRowId come dipendenza per ri-agganciare l'event listener se necessario


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Aziendale</h1>
          <p className="text-muted-foreground">Panoramica delle attività e gestione interventi.</p>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/dashboard/requests/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Nuova Richiesta
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href={`/dashboard/requests?statusFilter=${activeRequestStatusesForLink}`}>
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interventi Aperti</CardTitle>
              <FileText className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingStats.activeRequests ? (
                <Skeleton className="h-7 w-1/4" />
              ) : (
                <div className="text-2xl font-bold">{stats.activeRequests ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Richieste da gestire o in corso.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/requests?statusFilter=assegnata`}>
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Richieste Assegnate</CardTitle>
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingStats.assignedRequests ? (
                <Skeleton className="h-7 w-1/4" />
              ) : (
                <div className="text-2xl font-bold">{stats.assignedRequests ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Richieste con tecnico assegnato.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/requests?statusFilter=in%20corso`}>
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tecnici al lavoro</CardTitle>
              <Activity className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingStats.inProgressRequests ? (
                <Skeleton className="h-7 w-1/4" />
              ) : (
                <div className="text-2xl font-bold">{stats.inProgressRequests ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Richieste attualmente in lavorazione.</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ultime Richieste</CardTitle> 
          <CardDescription>Visualizza le richieste di intervento più recenti che necessitano attenzione. Clicca su una richiesta "in attesa" per vederla nella card Assistenza AI.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : recentRequests.length > 0 ? (
            <div ref={tableContainerRef}> {/* Wrapper per la tabella */}
              <ScrollArea className="h-[380px] w-full">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b">
                        <th className="p-3 text-left text-sm font-semibold text-muted-foreground">ID</th>
                        <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Cliente</th>
                        <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Servizio</th>
                        <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Tecnico Assegnato</th>
                        <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Stato</th>
                        <th className="p-3 text-right text-sm font-semibold text-muted-foreground">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRequests.map((req) => (
                        <tr 
                          key={req.id} 
                          className={cn(
                            "border-b hover:bg-muted/50",
                            req.status === "in attesa" && "cursor-pointer",
                            selectedRowId === req.id && req.status === "in attesa" && "bg-accent/20" 
                          )}
                          onClick={() => handleRowClick(req)}
                        >
                          <td className="p-3 text-sm font-medium text-primary">{req.id.substring(0, 6)}...</td>
                          <td className="p-3 text-sm">{req.customer}</td>
                          <td className="p-3 text-sm">{req.service}</td>
                          <td className="p-3 text-sm">{req.assegnato_a_tecnico_nome || ""}</td>
                          <td className="p-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                              req.status === "completata" ? "bg-green-100 text-green-700" :
                              req.status === "assegnata" ? "bg-blue-100 text-blue-700" :
                              req.status === "in attesa" ? "bg-orange-100 text-orange-700" :
                              req.status === "programmata" ? "bg-yellow-100 text-yellow-700" :
                              req.status === "in corso" ? "bg-indigo-100 text-indigo-700" :
                              req.status === "annullata" ? "bg-red-100 text-red-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>
                              {req.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="p-3 text-right text-sm">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Impedisce al click sulla riga di attivarsi
                                setSelectedRequestForSheet(req);
                                setIsSheetOpen(true);
                              }}
                            >
                              Dettagli
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-2" />
              <p>Nessuna richiesta recente attiva trovata.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Prossimi Appuntamenti</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mb-2" />
            <p>Nessun appuntamento imminente.</p>
            <Button variant="link" asChild className="mt-2 text-accent"><Link href="/dashboard/appointments">Vedi tutti</Link></Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Assistenza AI</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            {!selectedRequestDetailsForAI ? (
              <>
                <Lightbulb className="h-12 w-12 mb-4 text-primary opacity-70" />
                <p className="mb-3 text-center">Seleziona una richiesta "in attesa" dalla tabella sopra per vedere i dettagli qui e richiedere un suggerimento AI.</p>
                 <Button 
                    variant="outline" 
                    className="text-accent border-accent hover:bg-accent/10"
                    onClick={() => router.push("/dashboard/ai/suggestions")} // Modificato per navigare alla pagina corretta
                  >
                    Vai a Suggerimenti AI 
                  </Button>
              </>
            ) : (
              <div className="w-full text-left space-y-2 text-sm">
                <h3 className="font-semibold text-base text-foreground">Dettagli Richiesta per AI: <span className="text-primary">{selectedRequestDetailsForAI.id.substring(0,6)}...</span></h3>
                <p><strong className="text-muted-foreground">Cliente:</strong> {selectedRequestDetailsForAI.customer}</p>
                <p><strong className="text-muted-foreground">Servizio:</strong> {selectedRequestDetailsForAI.service}</p>
                {selectedRequestDetailsForAI.note_aggiuntive && <p><strong className="text-muted-foreground">Note:</strong> {selectedRequestDetailsForAI.note_aggiuntive}</p>}
                {selectedRequestDetailsForAI.giorno_preferito && <p className="flex items-center gap-1"><CalendarDays className="h-3 w-3"/> Giorno: {selectedRequestDetailsForAI.giorno_preferito}</p>}
                {selectedRequestDetailsForAI.fascia_oraria && <p className="flex items-center gap-1"><Clock className="h-3 w-3"/> Fascia: {selectedRequestDetailsForAI.fascia_oraria}</p>}
                <Button 
                  variant="outline" 
                  className="text-accent border-accent hover:bg-accent/10 w-full mt-3"
                  onClick={() => router.push("/dashboard/ai/suggestions")} // Modificato per navigare alla pagina corretta
                >
                  Ottieni Suggerimento AI
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {selectedRequestForSheet && (
        <RequestDetailsSheet
          isOpen={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          request={selectedRequestForSheet}
          onUpdateRequestStatus={handleUpdateRequestStatus}
        />
      )}
    </div>
  );
}
    
