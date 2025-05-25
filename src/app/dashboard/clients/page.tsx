
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Contact, PlusCircle, Search, Edit, Trash2, Loader2, Check, Sparkles, Briefcase } from "lucide-react"; 
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, Timestamp, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, getCountFromServer } from "firebase/firestore";
import { ClientDetailsSheet, type ClientFormValues as ClientSheetFormValues } from "@/components/dashboard/clients/ClientDetailsSheet";

export interface Cliente {
  id: string;
  id_azienda: string;
  nome_completo: string;
  email?: string;
  telefono?: string;
  indirizzo?: string;
  note_interne?: string;
  data_creazione: Timestamp;
  creato_automaticamente?: boolean;
  richiesteAttive?: number;
}

export default function ClientsPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { toast } = useToast();

  const [clients, setClients] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedClientForSheet, setSelectedClientForSheet] = useState<Cliente | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setCompanyId(user.uid);
      } else {
        setCurrentUser(null);
        setCompanyId(null);
        setClients([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchClients = useCallback(async (currentCompanyId: string) => {
    if (!currentCompanyId) {
      setIsLoading(false);
      setClients([]);
      return;
    }
    setIsLoading(true);
    try {
      const clientsQuery = query(
        collection(db, "clienti"),
        where("id_azienda", "==", currentCompanyId),
        orderBy("data_creazione", "desc") // Manteniamo un ordinamento di fallback
      );
      const querySnapshot = await getDocs(clientsQuery);
      
      const fetchedClientsPromises = querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const clienteBase: Cliente = {
          id: docSnap.id,
          id_azienda: data.id_azienda,
          nome_completo: data.nome_completo || "N/D",
          email: data.email,
          telefono: data.telefono,
          indirizzo: data.indirizzo,
          note_interne: data.note_interne,
          data_creazione: data.data_creazione as Timestamp,
          creato_automaticamente: data.creato_automaticamente === true,
          richiesteAttive: 0, 
        };

        if (clienteBase.email) { 
          const activeRequestsQuery = query(
            collection(db, "richieste_clienti"),
            where("id_azienda", "==", currentCompanyId),
            where("email_cliente", "==", clienteBase.email),
            where("stato", "not-in", ["completata", "annullata"])
          );
          const countSnapshot = await getCountFromServer(activeRequestsQuery);
          clienteBase.richiesteAttive = countSnapshot.data().count;
        }
        return clienteBase;
      });

      let fetchedClients = await Promise.all(fetchedClientsPromises);

      // Ordina i clienti per richiesteAttive (decrescente), poi per nome_completo (crescente)
      fetchedClients.sort((a, b) => {
        const aRequests = a.richiesteAttive ?? 0;
        const bRequests = b.richiesteAttive ?? 0;
        if (bRequests !== aRequests) {
          return bRequests - aRequests; // Ordine decrescente per richiesteAttive
        }
        return a.nome_completo.localeCompare(b.nome_completo); // Ordine crescente per nome
      });

      setClients(fetchedClients);

    } catch (error) {
      console.error("Error fetching clients or their active requests:", error);
      toast({ title: "Errore Caricamento Clienti", description: "Impossibile caricare l'elenco dei clienti o le loro richieste attive.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (companyId) {
      fetchClients(companyId);
    }
  }, [companyId, fetchClients]);

  const filteredClients = useMemo(() => {
    // Il filtraggio per searchTerm avviene sull'array già ordinato
    return clients.filter(client => {
      const searchTermLower = searchTerm.toLowerCase();
      return client.nome_completo.toLowerCase().includes(searchTermLower) ||
             (client.email && client.email.toLowerCase().includes(searchTermLower)) ||
             (client.telefono && client.telefono.toLowerCase().includes(searchTermLower));
    });
  }, [clients, searchTerm]);

  const handleOpenDetailsSheet = (client: Cliente) => {
    setSelectedClientForSheet(client);
    setIsSheetOpen(true);
  };

  const handleUpdateClient = async (clientId: string, data: ClientSheetFormValues) => {
    if (!companyId) return;
    try {
      const clientDocRef = doc(db, "clienti", clientId);
      await updateDoc(clientDocRef, {
        ...data,
        email: data.email || null,
        telefono: data.telefono || null,
        indirizzo: data.indirizzo || null,
        note_interne: data.note_interne || null,
      });
      toast({ title: "Successo!", description: "Cliente aggiornato con successo." });
      if (companyId) fetchClients(companyId); // Ricarica i clienti per aggiornare l'ordinamento e i dati
    } catch (error) {
      console.error("Error updating client:", error);
      toast({ title: "Errore Aggiornamento", description: "Impossibile aggiornare il cliente.", variant: "destructive" });
      throw error;
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!companyId) return;
    try {
      const clientDocRef = doc(db, "clienti", clientId);
      await deleteDoc(clientDocRef);
      toast({ title: "Successo!", description: "Cliente eliminato con successo." });
      if (companyId) fetchClients(companyId); // Ricarica i clienti
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({ title: "Errore Eliminazione", description: "Impossibile eliminare il cliente.", variant: "destructive" });
      throw error;
    }
  };

  const activeStatusesQueryParam = encodeURIComponent("in attesa,assegnata,programmata,in corso");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Clienti</h1>
          <p className="text-muted-foreground">Visualizza, aggiungi e gestisci i clienti della tua azienda.</p>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/dashboard/clients/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Nuovo Cliente
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, email, telefono..."
                className="pl-10 w-full md:w-auto"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Caricamento clienti...</p>
            </div>
          ) : filteredClients.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-22rem)] lg:h-[calc(100vh-20rem)]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Nome Completo</th>
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Email</th>
                      <th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Telefono</th>
                      <th className="p-3 text-center text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Note</th>
                      <th className="p-3 text-center text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Auto</th>
                      <th className="p-3 text-center text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Rich. Attive</th> 
                      <th className="p-3 text-right text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm font-medium text-primary whitespace-nowrap">{client.nome_completo}</td>
                        <td className="p-3 text-sm whitespace-nowrap">{client.email || "N/D"}</td>
                        <td className="p-3 text-sm whitespace-nowrap">{client.telefono || "N/D"}</td>
                        <td className="p-3 text-sm whitespace-nowrap text-center">
                          {client.note_interne && client.note_interne.trim() !== "" ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" title="Note presenti"/>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm whitespace-nowrap text-center">
                          {client.creato_automaticamente ? (
                            <Sparkles className="h-5 w-5 text-accent mx-auto" title="Creato automaticamente"/>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm whitespace-nowrap text-center">
                          {client.richiesteAttive && client.richiesteAttive > 0 && client.email ? (
                            <Link href={`/dashboard/requests?statusFilter=${activeStatusesQueryParam}&searchTerm=${encodeURIComponent(client.email)}`} 
                                  className="flex items-center justify-center gap-1 text-primary hover:underline"
                                  title="Visualizza richieste attive">
                              <Briefcase className="h-4 w-4" />
                              <span className="font-semibold">{client.richiesteAttive}</span>
                            </Link>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                                <Briefcase className={`h-4 w-4 text-muted-foreground`} />
                                <span className="text-muted-foreground">{client.richiesteAttive ?? 0}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right text-sm whitespace-nowrap">
                          <Button variant="outline" size="sm" onClick={() => handleOpenDetailsSheet(client)}>
                            <Edit className="mr-1 h-3 w-3"/> Dettagli
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
              <Contact className="mx-auto h-16 w-16 mb-4" />
              <p className="text-lg mb-2">Nessun cliente trovato.</p>
              <p className="text-sm">Inizia aggiungendo manualmente un nuovo cliente o attendi che vengano creati dalle richieste.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClientForSheet && (
        <ClientDetailsSheet
          isOpen={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          client={selectedClientForSheet}
          onUpdateClient={handleUpdateClient}
          onDeleteClient={handleDeleteClient}
        />
      )}
    </div>
  );
}


    