
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, Loader2, UserCheck, FileText, CalendarDays, Clock, Info, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc, getCountFromServer, Timestamp } from "firebase/firestore";
import { suggestTechnician, type SuggestTechnicianInput, type SuggestTechnicianOutput, type Technician as AiTechnicianInput } from "@/ai/flows/suggest-technician";
import type { Technician } from "@/app/dashboard/technicians/page";

interface ClientRequest {
  id: string;
  id_azienda: string;
  nome_cliente: string;
  tipo_servizio: string;
  note_aggiuntive?: string;
  giorno_preferito?: string;
  fascia_oraria?: string;
  stato: string;
  created_at: Timestamp;
  assegnato_a_tecnico_id?: string;
  assegnato_a_tecnico_nome?: string;
}

interface AiSuggestionState {
  suggestion: SuggestTechnicianOutput | null;
  isLoading: boolean;
  error: string | null;
}

export default function AiSuggestionsPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { toast } = useToast();

  const [pendingRequests, setPendingRequests] = useState<ClientRequest[]>([]);
  const [techniciansWithLoad, setTechniciansWithLoad] = useState<AiTechnicianInput[]>([]);
  
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AiSuggestionState>>({});
  const [expandedSuggestions, setExpandedSuggestions] = useState<Record<string, boolean>>({});

  const fetchPageData = useCallback(async (currentCompanyId: string) => {
    setIsLoadingPageData(true);
    try {
      const requestsQuery = query(
        collection(db, "richieste_clienti"),
        where("id_azienda", "==", currentCompanyId),
        where("stato", "==", "in attesa")
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const fetchedRequests = requestsSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as ClientRequest));
      setPendingRequests(fetchedRequests);

      const techniciansQuery = query(
        collection(db, "tecnici"),
        where("id_azienda", "==", currentCompanyId)
      );
      const techniciansSnapshot = await getDocs(techniciansQuery);
      const fetchedTechnicians = techniciansSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as Technician));

      const techsWithLoadPromises = fetchedTechnicians.map(async (tech) => {
        const loadQuery = query(
          collection(db, "richieste_clienti"),
          where("id_azienda", "==", currentCompanyId),
          where("assegnato_a_tecnico_id", "==", tech.id),
          where("stato", "in", ["assegnata", "programmata", "in corso"])
        );
        const loadSnapshot = await getCountFromServer(loadQuery);
        return {
          id: tech.id,
          nome_completo: tech.nome_completo,
          competenze: tech.competenze || [],
          stato: tech.stato as AiTechnicianInput['stato'],
          currentLoad: loadSnapshot.data().count,
        };
      });
      const techsWithLoad = await Promise.all(techsWithLoadPromises);
      setTechniciansWithLoad(techsWithLoad);

    } catch (error) {
      console.error("Error fetching page data:", error);
      toast({ title: "Errore Caricamento Dati", description: "Impossibile caricare richieste o tecnici.", variant: "destructive" });
    } finally {
      setIsLoadingPageData(false);
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setCompanyId(user.uid);
        fetchPageData(user.uid);
      } else {
        setCurrentUser(null);
        setCompanyId(null);
        setPendingRequests([]);
        setTechniciansWithLoad([]);
        setIsLoadingPageData(false);
      }
    });
    return () => unsubscribe();
  }, [fetchPageData]);

  const handleGetOrToggleAiSuggestion = async (request: ClientRequest) => {
    const existingSuggestionState = aiSuggestions[request.id];

    if (existingSuggestionState?.suggestion || existingSuggestionState?.error) {
      // Se esiste un suggerimento (o errore), facciamo il toggle della visibilità
      setExpandedSuggestions(prev => ({
        ...prev,
        [request.id]: !prev[request.id],
      }));
    } else {
      // Altrimenti, carichiamo il suggerimento
      if (!companyId || techniciansWithLoad.length === 0) {
        toast({ title: "Dati Mancanti", description: "Nessun tecnico disponibile per generare suggerimenti.", variant: "destructive" });
        return;
      }

      setAiSuggestions(prev => ({
        ...prev,
        [request.id]: { suggestion: null, isLoading: true, error: null },
      }));
      setExpandedSuggestions(prev => ({ ...prev, [request.id]: true })); // Mostra mentre carica

      try {
        const input: SuggestTechnicianInput = {
          requestId: request.id,
          requestDescription: `${request.tipo_servizio}. ${request.note_aggiuntive || ''}`.trim(),
          clientPreferredDay: request.giorno_preferito,
          clientPreferredTimeSlot: request.fascia_oraria,
          technicianList: techniciansWithLoad,
        };
        const suggestionOutput = await suggestTechnician(input);
        setAiSuggestions(prev => ({
          ...prev,
          [request.id]: { suggestion: suggestionOutput, isLoading: false, error: null },
        }));
      } catch (error: any) {
        console.error("Error getting AI suggestion:", error);
        toast({ title: "Errore Suggerimento AI", description: error.message || "Impossibile ottenere un suggerimento.", variant: "destructive" });
        setAiSuggestions(prev => ({
          ...prev,
          [request.id]: { suggestion: null, isLoading: false, error: error.message || "Errore sconosciuto" },
        }));
      }
    }
  };
  
  const handleForceRefreshSuggestion = async (request: ClientRequest) => {
    if (!companyId || techniciansWithLoad.length === 0) {
        toast({ title: "Dati Mancanti", description: "Nessun tecnico disponibile per generare suggerimenti.", variant: "destructive" });
        return;
      }

      setAiSuggestions(prev => ({
        ...prev,
        [request.id]: { suggestion: null, isLoading: true, error: null },
      }));
      setExpandedSuggestions(prev => ({ ...prev, [request.id]: true })); 

      try {
        const input: SuggestTechnicianInput = {
          requestId: request.id,
          requestDescription: `${request.tipo_servizio}. ${request.note_aggiuntive || ''}`.trim(),
          clientPreferredDay: request.giorno_preferito,
          clientPreferredTimeSlot: request.fascia_oraria,
          technicianList: techniciansWithLoad,
        };
        const suggestionOutput = await suggestTechnician(input);
        setAiSuggestions(prev => ({
          ...prev,
          [request.id]: { suggestion: suggestionOutput, isLoading: false, error: null },
        }));
      } catch (error: any) {
        console.error("Error getting AI suggestion:", error);
        toast({ title: "Errore Suggerimento AI", description: error.message || "Impossibile ottenere un suggerimento.", variant: "destructive" });
        setAiSuggestions(prev => ({
          ...prev,
          [request.id]: { suggestion: null, isLoading: false, error: error.message || "Errore sconosciuto" },
        }));
      }
  };


  const handleAssignTechnician = async (requestId: string, technician: NonNullable<SuggestTechnicianOutput['suggestedTechnician']>) => {
    if (!companyId) return;
    try {
      const requestDocRef = doc(db, "richieste_clienti", requestId);
      await updateDoc(requestDocRef, {
        stato: "assegnata",
        assegnato_a_tecnico_id: technician.id,
        assegnato_a_tecnico_nome: technician.nome_completo,
      });
      toast({ title: "Tecnico Assegnato!", description: `${technician.nome_completo} è stato assegnato alla richiesta.` });
      
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      setAiSuggestions(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
      setExpandedSuggestions(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
      
      if (companyId) fetchPageData(companyId);

    } catch (error) {
      console.error("Error assigning technician:", error);
      toast({ title: "Errore Assegnazione", description: "Impossibile assegnare il tecnico.", variant: "destructive" });
    }
  };

  if (isLoadingPageData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Caricamento dati per suggerimenti AI...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Assegnazione AI dei Tecnici</h1>
          <p className="text-muted-foreground">
            Ottieni suggerimenti dall'AI per assegnare le richieste "in attesa" al tecnico più adatto.
          </p>
        </div>
      </div>

      {pendingRequests.length === 0 && !isLoadingPageData && (
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <Info className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg mb-2">Nessuna richiesta "in attesa" trovata.</p>
              <p className="text-sm">Non ci sono richieste che necessitano di un suggerimento AI al momento.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 items-start">
        {pendingRequests.map((req) => {
          const currentSuggestionState = aiSuggestions[req.id];
          const isExpanded = expandedSuggestions[req.id] || false;
          const hasLoadedSuggestionOrError = !!currentSuggestionState?.suggestion || !!currentSuggestionState?.error;

          let buttonText = "Ottieni Suggerimento";
          let buttonIcon = <Lightbulb className="mr-2 h-4 w-4" />;
          if (currentSuggestionState?.isLoading) {
            buttonText = "Attendere...";
            buttonIcon = <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
          } else if (hasLoadedSuggestionOrError) {
            buttonText = isExpanded ? "Nascondi Suggerimento" : "Mostra Suggerimento";
            buttonIcon = isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />;
          }

          return (
            <Card key={req.id} className="shadow-lg flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">Richiesta: {req.id.substring(0, 8)}...</CardTitle>
                <CardDescription>Cliente: {req.nome_cliente}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 flex-grow">
                <div className="text-sm">
                  <p><strong className="text-muted-foreground">Servizio:</strong> {req.tipo_servizio}</p>
                  {req.note_aggiuntive && <p><strong className="text-muted-foreground">Note:</strong> {req.note_aggiuntive}</p>}
                </div>
                <div className="text-xs bg-muted p-2 rounded-md">
                  {req.giorno_preferito && <p className="flex items-center gap-1"><CalendarDays className="h-3 w-3"/> Giorno: {req.giorno_preferito}</p>}
                  {req.fascia_oraria && <p className="flex items-center gap-1"><Clock className="h-3 w-3"/> Fascia: {req.fascia_oraria}</p>}
                  {!req.giorno_preferito && !req.fascia_oraria && <p>Nessuna preferenza oraria specificata.</p>}
                </div>

                {isExpanded && hasLoadedSuggestionOrError && (
                  <>
                    {currentSuggestionState?.suggestion && (
                      <Alert variant={currentSuggestionState.suggestion.suggestedTechnician ? "default" : "destructive"} className="mt-4">
                        <Lightbulb className="h-4 w-4" />
                        <AlertTitle>
                          {currentSuggestionState.suggestion.suggestedTechnician 
                            ? `Suggerimento AI: ${currentSuggestionState.suggestion.suggestedTechnician.nome_completo}`
                            : "Nessun Tecnico Suggerito"}
                        </AlertTitle>
                        <AlertDescription className="text-xs space-y-1">
                          <p>{currentSuggestionState.suggestion.reasoning}</p>
                          {currentSuggestionState.suggestion.suggestedTimeNotes && <p><strong>Note Programmazione:</strong> {currentSuggestionState.suggestion.suggestedTimeNotes}</p>}
                        </AlertDescription>
                      </Alert>
                    )}
                    {currentSuggestionState?.error && (
                      <Alert variant="destructive" className="mt-4">
                        <Lightbulb className="h-4 w-4" />
                        <AlertTitle>Errore Suggerimento</AlertTitle>
                        <AlertDescription className="text-xs">{currentSuggestionState.error}</AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </CardContent>
              <div className="p-4 border-t mt-auto flex flex-wrap gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleGetOrToggleAiSuggestion(req)}
                  disabled={currentSuggestionState?.isLoading || techniciansWithLoad.length === 0}
                  size="sm"
                >
                  {buttonIcon}
                  {buttonText}
                </Button>
                {hasLoadedSuggestionOrError && (
                   <Button
                    variant="outline"
                    onClick={() => handleForceRefreshSuggestion(req)}
                    disabled={currentSuggestionState?.isLoading || techniciansWithLoad.length === 0}
                    size="sm"
                    title="Aggiorna Suggerimento"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                {isExpanded && currentSuggestionState?.suggestion?.suggestedTechnician && (
                  <Button
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={() => handleAssignTechnician(req.id, currentSuggestionState.suggestion!.suggestedTechnician!)}
                    size="sm"
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    Assegna a {currentSuggestionState.suggestion.suggestedTechnician.nome_completo.split(" ")[0]}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

    