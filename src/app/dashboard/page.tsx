
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, CalendarDays, PlusCircle, Lightbulb, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton"; 
import { RequestDetailsSheet } from "@/components/dashboard/requests/RequestDetailsSheet";
import { useToast } from "@/hooks/use-toast";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { collection, query, where, getCountFromServer, getDocs, orderBy, limit, Timestamp, doc, updateDoc } from "firebase/firestore";

interface DashboardStats {
  activeRequests: number;
  pendingAppointments: number;
  techniciansAvailable: number;
}

// Export this interface to be used by RequestDetailsSheet
export interface RecentRequest {
  id: string;
  customer: string; // from nome_cliente
  service: string;  // from tipo_servizio
  status: string;   // from stato
  created_at?: Timestamp; 
  note_aggiuntive?: string;
  indirizzo_intervento?: string;
  telefono_cliente?: string;
  giorno_preferito?: string;
  fascia_oraria?: string;
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats>({
    activeRequests: 0,
    pendingAppointments: 0,
    techniciansAvailable: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // State for the RequestDetailsSheet
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RecentRequest | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setCompanyId(user.uid); 
      } else {
        setCurrentUser(null);
        setCompanyId(null);
        // Optionally clear data or redirect if unauthenticated
        setStats({ activeRequests: 0, pendingAppointments: 0, techniciansAvailable: 0 });
        setRecentRequests([]);
        setLoadingStats(false);
        setLoadingRequests(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!companyId) {
      setLoadingStats(false); 
      setLoadingRequests(false);
      setStats({ activeRequests: 0, pendingAppointments: 0, techniciansAvailable: 0 });
      setRecentRequests([]);
      return;
    }

    const fetchDashboardData = async () => {
      setLoadingStats(true);
      setLoadingRequests(true);

      // Fetch Stats
      try {
        // Query for active requests: stato == "In Attesa"
        const activeRequestsQuery = query(
          collection(db, "richieste_clienti"),
          where("id_azienda", "==", companyId),
          where("stato", "==", "In Attesa") // Case-sensitive match
        );
        const activeRequestsSnap = await getCountFromServer(activeRequestsQuery);

        const now = Timestamp.now();
        const pendingAppointmentsQuery = query(
          collection(db, "interventi_confermati"),
          where("id_azienda", "==", companyId),
          where("data_ora", ">", now) 
        );
        const pendingAppointmentsSnap = await getCountFromServer(pendingAppointmentsQuery);

        const techniciansQuery = query(
          collection(db, "tecnici"),
          where("id_azienda", "==", companyId)
        );
        const techniciansSnap = await getCountFromServer(techniciansQuery);

        setStats({
          activeRequests: activeRequestsSnap.data().count,
          pendingAppointments: pendingAppointmentsSnap.data().count,
          techniciansAvailable: techniciansSnap.data().count,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        toast({ title: "Errore Dati Dashboard", description: "Impossibile caricare le statistiche.", variant: "destructive" });
        setStats({ activeRequests: 0, pendingAppointments: 0, techniciansAvailable: 0 }); 
      } finally {
        setLoadingStats(false);
      }

      // Fetch Recent Requests
      try {
        const requestsQuery = query(
          collection(db, "richieste_clienti"),
          where("id_azienda", "==", companyId),
          orderBy("created_at", "desc"), 
          limit(5)
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        const fetchedRequests = requestsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            customer: data.nome_cliente || "N/D", 
            service: data.tipo_servizio || "N/D", 
            status: data.stato || "N/D", // Make sure 'stato' field exists
            created_at: data.created_at as Timestamp | undefined,
            note_aggiuntive: data.note_aggiuntive || "",
            indirizzo_intervento: data.indirizzo_intervento || "",
            telefono_cliente: data.telefono_cliente || "",
            giorno_preferito: data.giorno_preferito || "",
            fascia_oraria: data.fascia_oraria || "",
          };
        }) as RecentRequest[];
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

  const handleUpdateRequestStatus = async (requestId: string, newStatus: string) => {
    if (!companyId) {
      toast({ title: "Errore", description: "ID azienda non trovato.", variant: "destructive" });
      return;
    }
    try {
      const requestDocRef = doc(db, "richieste_clienti", requestId);
      await updateDoc(requestDocRef, { stato: newStatus });
      toast({ title: "Successo!", description: `Stato della richiesta aggiornato a "${newStatus}".` });

      // Optimistically update local state for recent requests
      setRecentRequests(prevRequests =>
        prevRequests.map(req =>
          req.id === requestId ? { ...req, status: newStatus } : req
        )
      );
      
      // Refetch stats to update the "Active Requests" count accurately from server
      const activeRequestsQuery = query(
        collection(db, "richieste_clienti"),
        where("id_azienda", "==", companyId),
        where("stato", "==", "In Attesa") // Consistent with initial fetch
      );
      const activeRequestsSnap = await getCountFromServer(activeRequestsQuery);
      setStats(prevStats => ({...prevStats, activeRequests: activeRequestsSnap.data().count }));

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

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Richieste Attive</CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-7 w-1/4" />
            ) : (
              <div className="text-2xl font-bold">{stats.activeRequests}</div>
            )}
            <p className="text-xs text-muted-foreground">Richieste con stato "In Attesa"</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appuntamenti Futuri</CardTitle> 
            <CalendarDays className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-7 w-1/4" />
            ) : (
              <div className="text-2xl font-bold">{stats.pendingAppointments}</div>
            )}
            <p className="text-xs text-muted-foreground">Interventi programmati</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tecnici Registrati</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-7 w-1/4" />
            ) : (
              <div className="text-2xl font-bold">{stats.techniciansAvailable}</div>
            )}
            <p className="text-xs text-muted-foreground">Tecnici associati all'azienda</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests Table */}
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">ID</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Cliente</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Servizio</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Stato</th>
                    <th className="p-3 text-right text-sm font-semibold text-muted-foreground">Azioni</th>
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
                          req.status === "in attesa" || req.status === "In Attesa" ? "bg-orange-100 text-orange-700" : // Adjusted for "In Attesa"
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-2" />
              <p>Nessuna richiesta recente trovata.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placeholder for other sections */}
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

