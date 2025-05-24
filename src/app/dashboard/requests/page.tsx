
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, PlusCircle, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RequestDetailsSheet, type RequestSheetData } from "@/components/dashboard/requests/RequestDetailsSheet";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation"; 

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, Timestamp, doc, updateDoc } from "firebase/firestore";
import { format } from 'date-fns';

export interface ClientRequest extends RequestSheetData { // Estende RequestSheetData
  id_azienda: string; // Aggiunto questo campo che era mancante nella definizione ma usato
  // Altri campi sono ereditati da RequestSheetData
}

const ALL_STATUSES = ["in attesa", "assegnata", "programmata", "in corso", "completata", "annullata"];

export default function AllRequestsPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { toast } = useToast();
  const searchParams = useSearchParams(); 

  const [allRequests, setAllRequests] = useState<ClientRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatusFilters, setActiveStatusFilters] = useState<string[]>([]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedRequestForSheet, setSelectedRequestForSheet] = useState<RequestSheetData | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setCompanyId(user.uid);
      } else {
        setCurrentUser(null);
        setCompanyId(null);
        setAllRequests([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const statusFilterFromUrl = searchParams.get('statusFilter');
    if (statusFilterFromUrl) {
      const statuses = statusFilterFromUrl.split(',').map(s => decodeURIComponent(s.trim()));
      const validStatuses = statuses.filter(s => ALL_STATUSES.includes(s));
      if (validStatuses.length > 0) {
        setActiveStatusFilters(validStatuses);
      } else {
        setActiveStatusFilters([]); // Reset se i filtri URL non sono validi
      }
    } else {
        setActiveStatusFilters([]); // Nessun filtro URL, resetta
    }
  }, [searchParams]);


  useEffect(() => {
    if (!companyId) {
      setIsLoading(false);
      setAllRequests([]);
      return;
    }

    const fetchRequests = async () => {
      setIsLoading(true);
      try {
        const requestsQuery = query(
          collection(db, "richieste_clienti"),
          where("id_azienda", "==", companyId),
          orderBy("created_at", "desc")
        );
        const querySnapshot = await getDocs(requestsQuery);
        const fetchedRequests = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            id_azienda: data.id_azienda,
            customer: data.nome_cliente || "N/D", // nome_cliente invece di customer
            service: data.tipo_servizio || "N/D", // tipo_servizio invece di service
            status: data.stato || "N/D", // stato invece di status
            created_at: data.created_at as Timestamp,
            indirizzo_intervento: data.indirizzo_intervento,
            telefono_cliente: data.telefono_cliente,
            email_cliente: data.email_cliente,
            giorno_preferito: data.giorno_preferito,
            fascia_oraria: data.fascia_oraria,
            note_aggiuntive: data.note_aggiuntive,
            completata_da_collaboratore_id: data.completata_da_collaboratore_id,
            completata_da_collaboratore_nome: data.completata_da_collaboratore_nome,
            data_completamento: data.data_completamento as Timestamp | undefined,
          } as ClientRequest;
        });
        setAllRequests(fetchedRequests);
      } catch (error) {
        console.error("Error fetching requests:", error);
        toast({ title: "Errore Caricamento Richieste", description: "Impossibile caricare l'elenco delle richieste.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [companyId, toast]);

  const handleStatusFilterToggle = (status: string) => {
    setActiveStatusFilters(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const filteredRequests = useMemo(() => {
    return allRequests.filter(req => {
      const matchesSearch = searchTerm === "" ||
        req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.customer.toLowerCase().includes(searchTerm.toLowerCase()) || // usa req.customer
        req.service.toLowerCase().includes(searchTerm.toLowerCase()); // usa req.service

      const matchesStatus = activeStatusFilters.length === 0 || activeStatusFilters.includes(req.status); // usa req.status

      return matchesSearch && matchesStatus;
    });
  }, [allRequests, searchTerm, activeStatusFilters]);

  const handleOpenDetailsSheet = (request: ClientRequest) => {
    // request è già del tipo corretto (ClientRequest) che estende RequestSheetData
    setSelectedRequestForSheet(request);
    setIsSheetOpen(true);
  };

  const handleUpdateRequestStatusOnPage = async (requestId: string, newStatus: string, additionalData: Record<string, any> = {}) => {
    if (!companyId) return;
    try {
      const requestDocRef = doc(db, "richieste_clienti", requestId);
      await updateDoc(requestDocRef, { stato: newStatus, ...additionalData });
      toast({ title: "Successo!", description: `Stato della richiesta aggiornato a "${newStatus}".` });

      setAllRequests(prevRequests =>
        prevRequests.map(req =>
          req.id === requestId ? { ...req, status: newStatus, ...additionalData } : req
        )
      );
    } catch (error) {
      console.error("Error updating request status:", error);
      toast({ title: "Errore Aggiornamento", description: "Impossibile aggiornare lo stato della richiesta.", variant: "destructive" });
      throw error;
    }
  };

  const formatDate = (timestamp?: Timestamp | Date) => {
    if (!timestamp) return 'N/D';
    const date = (timestamp instanceof Timestamp) ? timestamp.toDate() : timestamp;
    return format(date, 'dd/MM/yyyy HH:mm');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tutte le Richieste</h1>
          <p className="text-muted-foreground">Visualizza, filtra e gestisci tutte le richieste di intervento.</p>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/dashboard/requests/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Nuova Richiesta Manuale
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca per ID, cliente, servizio..."
                className="pl-10 w-full md:w-auto"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto shrink-0">
                  <Filter className="mr-2 h-4 w-4" /> Filtra per Stato ({activeStatusFilters.length > 0 ? activeStatusFilters.length : 'Tutti'})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Filtra per Stato</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_STATUSES.map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={activeStatusFilters.includes(status)}
                    onCheckedChange={() => handleStatusFilterToggle(status)}
                    className="capitalize"
                  >
                    {status.replace("_", " ")}
                  </DropdownMenuCheckboxItem>
                ))}
                {activeStatusFilters.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm text-destructive hover:text-destructive"
                      onClick={() => setActiveStatusFilters([])}
                    >
                      Rimuovi Filtri
                    </Button>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Caricamento richieste...</div>
          ) : filteredRequests.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-22rem)] lg:h-[calc(100vh-20rem)]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">ID Richiesta</th>
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Cliente</th>
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Servizio</th>
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Stato</th>
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Data Creazione</th>
                      <th className="p-3 text-right text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm font-medium text-primary whitespace-nowrap">{req.id.substring(0, 8)}...</td>
                        <td className="p-3 text-sm whitespace-nowrap">{req.customer}</td>
                        <td className="p-3 text-sm">{req.service}</td>
                        <td className="p-3 text-sm whitespace-nowrap">
                          <Badge variant={
                              req.status === "completata" ? "default" :
                              req.status === "annullata" ? "destructive" :
                              req.status === "in attesa" ? "outline" :
                              "secondary"
                            }
                            className={
                              req.status === "completata" ? "bg-green-100 text-green-700 border-green-200" :
                              req.status === "annullata" ? "bg-red-100 text-red-700 border-red-200" :
                              req.status === "in attesa" ? "bg-orange-100 text-orange-700 border-orange-200" :
                              req.status === "assegnata" ? "bg-blue-100 text-blue-700 border-blue-200" :
                              req.status === "programmata" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                              req.status === "in corso" ? "bg-indigo-100 text-indigo-700 border-indigo-200" :
                              "bg-gray-100 text-gray-700 border-gray-200"
                            }
                          >
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1).replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm whitespace-nowrap">{formatDate(req.created_at)}</td>
                        <td className="p-3 text-right text-sm whitespace-nowrap">
                          <Button variant="outline" size="sm" onClick={() => handleOpenDetailsSheet(req)}>
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
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="mx-auto h-16 w-16 mb-4" />
              <p className="text-lg mb-2">Nessuna richiesta trovata.</p>
              <p className="text-sm">Prova a modificare i filtri o aggiungi una nuova richiesta.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRequestForSheet && (
        <RequestDetailsSheet
          isOpen={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          request={selectedRequestForSheet}
          onUpdateRequestStatus={handleUpdateRequestStatusOnPage}
        />
      )}
    </div>
  );
}

    