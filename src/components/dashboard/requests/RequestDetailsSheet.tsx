
"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, type FC } from "react";

import { Timestamp, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { format } from "date-fns";
import { Loader2, UserCog } from "lucide-react";
import { useActiveCollaborator } from '@/app/dashboard/layout';
import type { User as FirebaseUser } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export interface RequestSheetData {
  id: string;
  customer: string;
  service: string;
  status: string;
  created_at?: Timestamp | Date;
  note_aggiuntive?: string;
  indirizzo_intervento?: string;
  telefono_cliente?: string;
  email_cliente?: string;
  giorno_preferito?: string;
  fascia_oraria?: string;
  completata_da_collaboratore_id?: string;
  completata_da_collaboratore_nome?: string;
  data_completamento?: Timestamp | Date;
  id_azienda: string; 
  assegnato_a_tecnico_id?: string | null;
  assegnato_a_tecnico_nome?: string | null;
}

interface Technician {
  id: string;
  nome_completo: string;
  stato: string;
}

interface RequestDetailsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestSheetData | null;
  onUpdateRequestStatus: (requestId: string, newStatus: string, additionalData?: Record<string, any>) => Promise<void>;
}

const statusOptions = [
  { value: "in attesa", label: "In attesa" },
  { value: "assegnata", label: "Assegnata" },
  { value: "programmata", label: "Programmata" },
  { value: "in corso", label: "In corso" },
  { value: "completata", label: "Completata" },
  { value: "annullata", label: "Annullata" },
];

export const RequestDetailsSheet: FC<RequestDetailsSheetProps> = ({ isOpen, onOpenChange, request, onUpdateRequestStatus }) => {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const { activeCollaborator } = useActiveCollaborator();
  const { toast } = useToast();

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoadingTechnicians, setIsLoadingTechnicians] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (request) {
      setSelectedStatus(request.status);
      setSelectedTechnicianId(request.assegnato_a_tecnico_id || null);
      console.log("[RequestDetailsSheet] Initializing sheet: request.status =", request.status, "request.assegnato_a_tecnico_id =", request.assegnato_a_tecnico_id);
      console.log("[RequestDetailsSheet] Initializing sheet: selectedStatus =", request.status, "selectedTechnicianId =", request.assegnato_a_tecnico_id || null);
    } else {
      setSelectedStatus("");
      setSelectedTechnicianId(null);
    }
  }, [request]);

  useEffect(() => {
    if (isOpen && currentUser && request?.id_azienda) {
      const fetchTechs = async () => {
        setIsLoadingTechnicians(true);
        try {
          const techsQuery = query(
            collection(db, "tecnici"),
            where("id_azienda", "==", request.id_azienda),
            where("stato", "in", ["Disponibile", "Occupato"]) 
          );
          const querySnapshot = await getDocs(techsQuery);
          const fetchedTechnicians = querySnapshot.docs.map(doc => ({
            id: doc.id,
            nome_completo: doc.data().nome_completo,
            stato: doc.data().stato,
          } as Technician));
          setTechnicians(fetchedTechnicians);
        } catch (error) {
          console.error("Error fetching technicians:", error);
          setTechnicians([]);
          toast({ title: "Errore Caricamento Tecnici", description: "Impossibile caricare l'elenco dei tecnici.", variant: "destructive" });
        } finally {
          setIsLoadingTechnicians(false);
        }
      };
      fetchTechs();
    }
  }, [isOpen, currentUser, request?.id_azienda, toast]);


  if (!request) return null;

  const handleSave = async () => {
    setIsSaving(true);
    let finalStatus = selectedStatus || request.status;
    
    console.log("[RequestDetailsSheet] handleSave: initial finalStatus =", finalStatus, "initial selectedTechnicianId =", selectedTechnicianId, "type:", typeof selectedTechnicianId);

    // Controllo per lo stato "completata"
    if (finalStatus === "completata" && selectedTechnicianId === null) {
      console.error("[RequestDetailsSheet] VALIDATION FAILED: Cannot complete request without an assigned technician.");
      toast({
        title: "Assegnazione Tecnico Mancante",
        description: "Per completare la richiesta, è necessario prima assegnare un tecnico.",
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }
    console.log("[RequestDetailsSheet] VALIDATION PASSED (or not applicable for completion): Proceeding with save.");


    let additionalData: Record<string, any> = {};
    
    if (selectedTechnicianId !== (request.assegnato_a_tecnico_id || null)) {
      additionalData.assegnato_a_tecnico_id = selectedTechnicianId; // Può essere null se "NONE" è selezionato
      const selectedTech = technicians.find(t => t.id === selectedTechnicianId);
      additionalData.assegnato_a_tecnico_nome = selectedTech ? selectedTech.nome_completo : null;
      
      if (selectedTechnicianId && finalStatus === "in attesa") {
        finalStatus = "assegnata";
      }
      else if (selectedTechnicianId === null && finalStatus === "assegnata") {
        finalStatus = "in attesa";
      }
    } else {
        additionalData.assegnato_a_tecnico_id = request.assegnato_a_tecnico_id;
        additionalData.assegnato_a_tecnico_nome = request.assegnato_a_tecnico_nome;
    }
    
    console.log("[RequestDetailsSheet] handleSave: finalStatus after technician logic =", finalStatus);
    console.log("[RequestDetailsSheet] handleSave: additionalData for technician =", { 
        id: additionalData.assegnato_a_tecnico_id, 
        nome: additionalData.assegnato_a_tecnico_nome 
    });


    if (finalStatus === "completata" && request.status !== "completata") {
      if (activeCollaborator) {
        additionalData.completata_da_collaboratore_id = activeCollaborator.id;
        additionalData.completata_da_collaboratore_nome = activeCollaborator.nome_completo;
      }
      additionalData.data_completamento = serverTimestamp();
      console.log("[RequestDetailsSheet] handleSave: Request marked as completed by", activeCollaborator);
    } else if (finalStatus !== "completata" && request.status === "completata") {
      additionalData.completata_da_collaboratore_id = null;
      additionalData.completata_da_collaboratore_nome = null;
      additionalData.data_completamento = null;
      console.log("[RequestDetailsSheet] handleSave: Request completion details cleared.");
    }
    
    // Sovrascrive selectedStatus se finalStatus è stato modificato dalla logica di assegnazione tecnico
    if (finalStatus !== selectedStatus) {
        setSelectedStatus(finalStatus);
    }

    console.log("[RequestDetailsSheet] handleSave: Calling onUpdateRequestStatus with finalStatus =", finalStatus, "and additionalData:", additionalData);
    try {
      await onUpdateRequestStatus(request.id, finalStatus, additionalData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating status from sheet:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateValue?: Timestamp | Date | string) => {
    if (!dateValue) return "N/D";
    if (typeof dateValue === 'string') {
        try { return format(new Date(dateValue), "dd/MM/yyyy HH:mm"); }
        catch (e) { return dateValue; }
    }
    try {
      const date = (dateValue instanceof Timestamp) ? dateValue.toDate() : dateValue;
      return format(date, "dd/MM/yyyy HH:mm");
    } catch (e) {
      console.error("Invalid date for formatting:", dateValue, e);
      return "Data non valida";
    }
  };
  
  const currentlyAssignedTechnicianName = request.assegnato_a_tecnico_nome || "Nessun tecnico assegnato";

  const isSaveDisabled = isSaving || (
    (selectedStatus === request.status) &&
    (selectedTechnicianId === (request.assegnato_a_tecnico_id || null))
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-[90vw] overflow-y-auto p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle>Dettaglio Richiesta: {request.id.substring(0, 8)}...</SheetTitle>
          <SheetDescription>Visualizza i dettagli e aggiorna lo stato della richiesta.</SheetDescription>
        </SheetHeader>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div><p className="font-medium text-muted-foreground">ID Richiesta:</p><p className="break-all">{request.id}</p></div>
            <div><p className="font-medium text-muted-foreground">Stato Attuale:</p><p className="capitalize">{request.status.replace("_", " ")}</p></div>
            <div><p className="font-medium text-muted-foreground">Data Creazione:</p><p>{formatDate(request.created_at)}</p></div>
            <div><p className="font-medium text-muted-foreground">Cliente:</p><p>{request.customer}</p></div>
            <div><p className="font-medium text-muted-foreground">Telefono:</p><p>{request.telefono_cliente || "N/D"}</p></div>
            <div><p className="font-medium text-muted-foreground">Email:</p><p>{request.email_cliente || "N/D"}</p></div>
            <div><p className="font-medium text-muted-foreground">Indirizzo Intervento:</p><p>{request.indirizzo_intervento || "N/D"}</p></div>
            <div><p className="font-medium text-muted-foreground">Servizio Richiesto:</p><p>{request.service}</p></div>
            <div><p className="font-medium text-muted-foreground">Giorno Preferito:</p><p>{request.giorno_preferito || "N/D"}</p></div>
            <div><p className="font-medium text-muted-foreground">Fascia Oraria:</p><p>{request.fascia_oraria || "N/D"}</p></div>
          </div>
          
          {request.note_aggiuntive && (
            <div className="space-y-1">
              <p className="font-medium text-muted-foreground">Note Aggiuntive Cliente:</p>
              <Textarea
                value={request.note_aggiuntive}
                readOnly
                className="min-h-[80px] bg-muted/30 resize-none"
              />
            </div>
          )}

           {request.status === "completata" && request.completata_da_collaboratore_nome && (
            <div className="pt-4 border-t mt-4 text-sm">
              <p className="font-medium text-muted-foreground">Dettagli Completamento:</p>
              <p>Completata da: {request.completata_da_collaboratore_nome}</p>
              {request.data_completamento && <p>Data: {formatDate(request.data_completamento)}</p>}
            </div>
          )}

          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="status-select" className="text-base font-semibold">Modifica Stato Richiesta</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus} disabled={isSaving}>
              <SelectTrigger id="status-select" className="w-full">
                <SelectValue placeholder="Seleziona nuovo stato" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="capitalize">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="technician-select" className="text-base font-semibold">Assegna Tecnico</Label>
            {isLoadingTechnicians ? (
                <div className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Caricamento tecnici...
                </div>
            ) : (
                <>
                <Select
                    value={selectedTechnicianId || ""} // Se null, il value diventa "" per il Select
                    onValueChange={(value) => {
                      console.log("[RequestDetailsSheet] Technician Select onValueChange:", value);
                      setSelectedTechnicianId(value === "NONE" ? null : value);
                    }}
                    disabled={isSaving}
                >
                    <SelectTrigger id="technician-select" className="w-full">
                    <SelectValue placeholder="Seleziona un tecnico..." />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="NONE">Nessun tecnico / Rimuovi assegnazione</SelectItem>
                    {technicians.map(tech => (
                        <SelectItem key={tech.id} value={tech.id}>
                        {tech.nome_completo} ({tech.stato})
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                    Attualmente assegnato a: {currentlyAssignedTechnicianName}
                </p>
                </>
            )}
          </div>
        </div>
        <SheetFooter className="p-6 border-t mt-auto">
          <SheetClose asChild>
            <Button variant="outline" disabled={isSaving}>Annulla</Button>
          </SheetClose>
          <Button 
            onClick={handleSave} 
            disabled={isSaveDisabled}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Salvataggio..." : "Salva Modifiche"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

    