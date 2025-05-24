
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, ClipboardCheck, PlusCircle, Lightbulb, Activity, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestDetailsSheet, type RequestSheetData } from "@/components/dashboard/requests/RequestDetailsSheet";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

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

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats>({
    activeRequests: null,
    assignedRequests: null,
    inProgressRequests: null,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);

  const [loadingStats, setLoadingStats] = useState({
    activeRequests: true,
    assignedRequests: true,
    inProgressRequests: true,
  });
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestSheetData | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setCompanyId(user.uid);
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
  }, []);

  useEffect(() => {
    if (!companyId) {
      setLoadingStats({ activeRequests: false, assignedRequests: false, inProgressRequests: false });
      setLoadingRequests(false);
      setStats({ activeRequests: 0, assignedRequests: 0, inProgressRequests: 0 });
      setRecentRequests([]);
      return;
    }

    const fetchDashboardData = async () => {
      // Fetch Active Requests
      setLoadingStats(prev => ({ ...prev, activeRequests: true }));
      try {
        const activeRequestsQuery = query(
          collection(db, "richieste_clienti"),
          where("id_azienda", "==", companyId),
          where("stato", "not-in", ["completata", "annullata"])
        );
        const activeRequestsSnap = await getCountFromServer(activeRequestsQuery);
        setStats(prev => ({ ...prev, activeRequests: activeRequestsSnap.data().count }));
      } catch (error) {
        console.error("Error fetching active requests stats:", error);
        toast({ title: "Errore Conteggio Richieste Attive", description: "Impossibile caricare il conteggio delle richieste attive.", variant: "destructive" });
        setStats(prev => ({ ...prev, activeRequests: 0 }));
      } finally {
        setLoadingStats(prev => ({ ...prev, activeRequests: false }));
      }

      // Fetch Assigned Requests
      setLoadingStats(prev => ({ ...prev, assignedRequests: true }));
      try {
        const assignedRequestsQuery = query(
          collection(db, "richieste_clienti"),
          where("id_azienda", "==", companyId),
          where("stato", "==", "assegnata")
        );
        const assignedRequestsSnap = await getCountFromServer(assignedRequestsQuery);
        setStats(prev => ({ ...prev, assignedRequests: assignedRequestsSnap.data().count }));
      } catch (error) {
        console.error("Error fetching assigned requests stats:", error);
        toast({ title: "Errore Conteggio Richieste Assegnate", description: "Impossibile caricare il conteggio delle richieste assegnate.", variant: "destructive" });
        setStats(prev => ({ ...prev, assignedRequests: 0 }));
      } finally {
        setLoadingStats(prev => ({ ...prev, assignedRequests: false }));
      }

      // Fetch In Progress Requests
      setLoadingStats(prev => ({ ...prev, inProgressRequests: true }));
      try {
        const inProgressRequestsQuery = query(
          collection(db, "richieste_clienti"),
          where("id_azienda", "==", companyId),
          where("stato", "==", "in corso")
        );
        const inProgressRequestsSnap = await getCountFromServer(inProgressRequestsQuery);
        setStats(prev => ({ ...prev, inProgressRequests: inProgressRequestsSnap.data().count }));
      } catch (error) {
        console.error("Error fetching in-progress requests stats:", error);
        toast({ title: "Errore Conteggio Richieste In Corso", description: "Impossibile caricare il conteggio delle richieste in corso.", variant: "destructive" });
        setStats(prev => ({ ...prev, inProgressRequests: 0 }));
      } finally {
        setLoadingStats(prev => ({ ...prev, inProgressRequests: false }));
      }

      // Fetch Recent Requests (Table)
      setLoadingRequests(true);
      try {
        const requestsQuery = query(
          collection(db, "richieste_clienti"),
          where("id_azienda", "==", companyId),
          orderBy("created_at", "desc"),
          limit(10)
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        const fetchedRequests = requestsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            id_azienda: data.id_azienda, // Aggiunto
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
            assegnato_a_tecnico_id: data.assegnato_a_tecnico_id, // Aggiunto
            assegnato_a_tecnico_nome: data.assegnato_a_tecnico_nome, // Aggiunto
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
    };

    fetchDashboardData();
  }, [companyId, toast]);

  const handleUpdateRequestStatus = async (requestId: string, newStatus: string, additionalData: Record<string, any> = {}) => {
    if (!companyId) {
      toast({ title: "Errore", description: "ID azienda non trovato.", variant: "destructive" });
      return;
    }
    try {
      const requestDocRef = doc(db, "richieste_clienti", requestId);
      await updateDoc(requestDocRef, { stato: newStatus, ...additionalData });
      toast({ title: "Successo!", description: `Stato della richiesta aggiornato a "${newStatus}".` });

      setRecentRequests(prevRequests =>
        prevRequests.map(req =>
          req.id === requestId ? { ...req, status: newStatus, ...additionalData } : req
        )
      );

      if (companyId) {
        setLoadingStats(prev => ({ ...prev, activeRequests: true, assignedRequests: true, inProgressRequests: true }));
        try {
          const activeRequestsQuery = query(
            collection(db, "richieste_clienti"),
            where("id_azienda", "==", companyId),
            where("stato", "not-in", ["completata", "annullata"])
          );
          const activeRequestsSnap = await getCountFromServer(activeRequestsQuery);
          setStats(prev => ({ ...prev, activeRequests: activeRequestsSnap.data().count }));

          const assignedRequestsQuery = query(
            collection(db, "richieste_clienti"),
            where("id_azienda", "==", companyId),
            where("stato", "==", "assegnata")
          );
          const assignedRequestsSnap = await getCountFromServer(assignedRequestsQuery);
          setStats(prev => ({ ...prev, assignedRequests: assignedRequestsSnap.data().count }));

          const inProgressRequestsQuery = query(
            collection(db, "richieste_clienti"),
            where("id_azienda", "==", companyId),
            where("stato", "==", "in corso")
          );
          const inProgressRequestsSnap = await getCountFromServer(inProgressRequestsQuery);
          setStats(prev => ({ ...prev, inProgressRequests: inProgressRequestsSnap.data().count }));

        } catch (error) {
          console.error("Error refetching stats after update:", error);
        } finally {
          setLoadingStats(prev => ({ ...prev, activeRequests: false, assignedRequests: false, inProgressRequests: false }));
        }
      }

    } catch (error) {
      console.error("Error updating request status:", error);
      toast({ title: "Errore Aggiornamento", description: "Impossibile aggiornare lo stato della richiesta.", variant: "destructive" });
      throw error;
    }
  };


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
        <Link href={`/dashboard/requests?statusFilter=${encodeURIComponent("in attesa,assegnata,programmata,in corso")}`}>
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Richieste Attive</CardTitle>
              <FileText className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingStats.activeRequests ? (
                <Skeleton className="h-7 w-1/4" />
              ) : (
                <div className="text-2xl font-bold">{stats.activeRequests ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Richieste non completate o annullate</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/requests?statusFilter=${encodeURIComponent("assegnata")}`}>
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
              <p className="text-xs text-muted-foreground">Richieste con tecnico assegnato</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/requests?statusFilter=${encodeURIComponent("in corso")}`}>
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Richieste In Corso</CardTitle>
              <Activity className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingStats.inProgressRequests ? (
                <Skeleton className="h-7 w-1/4" />
              ) : (
                <div className="text-2xl font-bold">{stats.inProgressRequests ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Richieste attualmente in lavorazione</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ultime Richieste</CardTitle>
          <CardDescription>Visualizza le richieste di intervento più recenti.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : recentRequests.length > 0 ? (
            <ScrollArea className="h-[380px] w-full">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">ID</th>
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Cliente</th>
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Servizio</th>
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Stato</th>
                      <th className="p-3 text-right text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRequests.map((req) => (
                      <tr key={req.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm font-medium text-primary">{req.id.substring(0, 6)}...</td>
                        <td className="p-3 text-sm">{req.customer}</td>
                        <td className="p-3 text-sm">{req.service}</td>
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
                            onClick={() => {
                              setSelectedRequest(req);
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-2" />
              <p>Nessuna richiesta recente trovata.</p>
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
            <Lightbulb className="h-12 w-12 mb-4 text-primary opacity-70" />
            <p className="mb-3 text-center">Richiedi un suggerimento al nostro assistente AI per ottimizzare l'assegnazione dei tecnici.</p>
            <Button variant="outline" asChild className="text-accent border-accent hover:bg-accent/10">
                <Link href="/dashboard/requests/suggestions">Richiedi Suggerimento AI</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      {selectedRequest && (
        <RequestDetailsSheet
          isOpen={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          request={selectedRequest}
          onUpdateRequestStatus={handleUpdateRequestStatus}
        />
      )}
    </div>
  );
}

    