
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, PlusCircle, Search, ExternalLink, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RequestDetailsSheet, type RequestSheetData } from "@/components/dashboard/requests/RequestDetailsSheet"; // Importa RequestSheetData
import { useToast } from "@/hooks/use-toast";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, Timestamp, doc, updateDoc } from "firebase/firestore";
import { format } from 'date-fns';

// Interfaccia per gli appuntamenti, assicurati che includa tutti i campi per RequestSheetData
export interface ScheduledAppointment {
  id: string;
  id_azienda: string;
  nome_cliente: string;
  tipo_servizio: string;
  stato: string; 
  created_at: Timestamp; 
  indirizzo_intervento?: string;
  telefono_cliente?: string;
  email_cliente?: string; // Aggiunto
  giorno_preferito?: string;
  fascia_oraria?: string;
  note_aggiuntive?: string;
}

export default function AppointmentsPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { toast } = useToast();

  const [scheduledAppointments, setScheduledAppointments] = useState<ScheduledAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedAppointmentForSheet, setSelectedAppointmentForSheet] = useState<RequestSheetData | null>(null); // Usa RequestSheetData

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setCompanyId(user.uid);
      } else {
        setCurrentUser(null);
        setCompanyId(null);
        setScheduledAppointments([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!companyId) {
      setIsLoading(false);
      setScheduledAppointments([]);
      return;
    }

    const fetchScheduledAppointments = async () => {
      setIsLoading(true);
      try {
        const appointmentsQuery = query(
          collection(db, "richieste_clienti"),
          where("id_azienda", "==", companyId),
          where("stato", "==", "programmata"), 
          orderBy("created_at", "desc") 
        );
        const querySnapshot = await getDocs(appointmentsQuery);
        const fetchedAppointments = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            id_azienda: data.id_azienda,
            nome_cliente: data.nome_cliente || "N/D",
            tipo_servizio: data.tipo_servizio || "N/D",
            stato: data.stato || "N/D",
            created_at: data.created_at as Timestamp,
            indirizzo_intervento: data.indirizzo_intervento,
            telefono_cliente: data.telefono_cliente,
            email_cliente: data.email_cliente, // Aggiunto
            giorno_preferito: data.giorno_preferito,
            fascia_oraria: data.fascia_oraria,
            note_aggiuntive: data.note_aggiuntive,
          } as ScheduledAppointment;
        });
        setScheduledAppointments(fetchedAppointments);
      } catch (error) {
        console.error("Error fetching scheduled appointments:", error);
        toast({ title: "Errore Caricamento Appuntamenti", description: "Impossibile caricare gli appuntamenti programmati.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchScheduledAppointments();
  }, [companyId, toast]);

  const filteredAppointments = useMemo(() => {
    return scheduledAppointments.filter(app => {
      const matchesSearch = searchTerm === "" ||
        app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.tipo_servizio.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [scheduledAppointments, searchTerm]);

  const handleOpenDetailsSheet = (appointment: ScheduledAppointment) => {
    // Mappa ScheduledAppointment a RequestSheetData
    const sheetData: RequestSheetData = {
        id: appointment.id,
        customer: appointment.nome_cliente,
        service: appointment.tipo_servizio,
        status: appointment.stato,
        created_at: appointment.created_at,
        indirizzo_intervento: appointment.indirizzo_intervento,
        telefono_cliente: appointment.telefono_cliente,
        email_cliente: appointment.email_cliente, // Aggiunto
        giorno_preferito: appointment.giorno_preferito,
        fascia_oraria: appointment.fascia_oraria,
        note_aggiuntive: appointment.note_aggiuntive,
    };
    setSelectedAppointmentForSheet(sheetData);
    setIsSheetOpen(true);
  };
  
  const handleUpdateRequestStatusOnPage = async (requestId: string, newStatus: string) => {
    if (!companyId) return;
    try {
      const requestDocRef = doc(db, "richieste_clienti", requestId);
      await updateDoc(requestDocRef, { stato: newStatus });
      toast({ title: "Successo!", description: `Stato dell'appuntamento aggiornato a "${newStatus}".` });
      
      setScheduledAppointments(prevApps =>
        prevApps.map(app =>
          app.id === requestId ? { ...app, stato: newStatus } : app
        ).filter(app => newStatus === "programmata" ? true : app.id !== requestId) 
      );
    } catch (error) {
      console.error("Error updating appointment status:", error);
      toast({ title: "Errore Aggiornamento", description: "Impossibile aggiornare lo stato dell'appuntamento.", variant: "destructive" });
      throw error;
    }
  };

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return 'N/D';
    return format(timestamp.toDate(), 'dd/MM/yyyy HH:mm');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Appuntamenti Programmati</h1>
          <p className="text-muted-foreground">Visualizza e gestisci gli appuntamenti fissati.</p>
        </div>
        <div className="flex gap-2">
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/dashboard/requests/new"> {/* Modificato per puntare alla pagina di creazione richiesta generica */}
                <PlusCircle className="mr-2 h-4 w-4" /> Nuova Richiesta
            </Link>
            </Button>
        </div>
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Caricamento appuntamenti...</div>
          ) : filteredAppointments.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-22rem)] lg:h-[calc(100vh-20rem)]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">ID Richiesta</th>
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Cliente</th>
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Servizio</th>
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Data Creazione</th>
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Stato</th>
                      <th className="p-3 text-right text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map((app) => (
                      <tr key={app.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm font-medium text-primary whitespace-nowrap">{app.id.substring(0, 8)}...</td>
                        <td className="p-3 text-sm whitespace-nowrap">{app.nome_cliente}</td>
                        <td className="p-3 text-sm">{app.tipo_servizio}</td>
                        <td className="p-3 text-sm whitespace-nowrap">{formatDate(app.created_at)}</td>
                        <td className="p-3 text-sm whitespace-nowrap">
                          <Badge 
                            className="bg-yellow-100 text-yellow-700 border-yellow-200 capitalize"
                          >
                            {app.stato.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="p-3 text-right text-sm whitespace-nowrap">
                          <Button variant="outline" size="sm" onClick={() => handleOpenDetailsSheet(app)}>
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
              <CalendarDays className="mx-auto h-16 w-16 mb-4" />
              <p className="text-lg mb-2">Nessun appuntamento programmato trovato.</p>
              <p className="text-sm">Crea una nuova richiesta o modifica lo stato di una esistente in "Programmata".</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedAppointmentForSheet && (
        <RequestDetailsSheet
          isOpen={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          request={selectedAppointmentForSheet} // selectedAppointmentForSheet è già di tipo RequestSheetData
          onUpdateRequestStatus={handleUpdateRequestStatusOnPage}
        />
      )}
    </div>
  );
}
