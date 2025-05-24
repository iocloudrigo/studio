
"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, type FC } from "react";

import { Timestamp, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useActiveCollaborator } from '@/app/dashboard/layout'; // Importa il custom hook

// Interfaccia per i dati della richiesta nel pannello
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
  const { activeCollaborator } = useActiveCollaborator(); // Usa il context

  useEffect(() => {
    if (request?.status) {
      setSelectedStatus(request.status);
    }
  }, [request]);

  if (!request) return null;

  const handleSave = async () => {
    if (!selectedStatus || selectedStatus === request.status) return;
    setIsSaving(true);
    let additionalData: Record<string, any> = {};

    if (selectedStatus === "completata") {
      if (activeCollaborator) { // Leggi dal context
        additionalData.completata_da_collaboratore_id = activeCollaborator.id;
        additionalData.completata_da_collaboratore_nome = activeCollaborator.nome_completo;
        additionalData.data_completamento = serverTimestamp();
      } else {
        console.warn("Nessun collaboratore attivo trovato per marcare la richiesta come completata.");
        // Potresti voler mostrare un toast all'utente qui o gestire diversamente
      }
    } else {
        if (request.status === "completata") {
            additionalData.completata_da_collaboratore_id = null; 
            additionalData.completata_da_collaboratore_nome = null;
            additionalData.data_completamento = null;
        }
    }

    try {
      await onUpdateRequestStatus(request.id, selectedStatus, additionalData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating status from sheet:", error);
      // Considera di mostrare un toast di errore qui
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

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-[90vw] overflow-y-auto p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle>Dettaglio Richiesta: {request.id.substring(0, 8)}</SheetTitle>
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
        </div>
        <SheetFooter className="p-6 border-t mt-auto">
          <SheetClose asChild>
            <Button variant="outline" disabled={isSaving}>Annulla</Button>
          </SheetClose>
          <Button onClick={handleSave} disabled={isSaving || !selectedStatus || selectedStatus === request.status}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Salvataggio..." : "Salva Modifiche"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
