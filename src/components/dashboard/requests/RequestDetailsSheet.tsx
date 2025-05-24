
"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, type FC } from "react";
import type { RecentRequest } from "@/app/dashboard/page"; 
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface RequestDetailsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  request: RecentRequest | null;
  onUpdateRequestStatus: (requestId: string, newStatus: string) => Promise<void>;
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

  useEffect(() => {
    if (request?.status) {
      setSelectedStatus(request.status);
    }
  }, [request]);

  if (!request) return null;

  const handleSave = async () => {
    if (!selectedStatus || selectedStatus === request.status) return;
    setIsSaving(true);
    try {
      await onUpdateRequestStatus(request.id, selectedStatus);
      // Toast for success is handled by parent
      onOpenChange(false); 
    } catch (error) {
      // Error toast is handled by parent
      console.error("Error updating status from sheet:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateValue: Timestamp | Date | undefined | string) => {
    if (!dateValue) return "N/D";
    if (typeof dateValue === 'string') { // Handle if it's already a string (though Firestore Timestamps are preferred)
        try {
            return format(new Date(dateValue), "dd/MM/yyyy HH:mm");
        } catch (e) {
            return dateValue; // return original string if not parsable
        }
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><p className="font-medium text-muted-foreground">ID Richiesta:</p><p className="break-all">{request.id}</p></div>
            <div><p className="font-medium text-muted-foreground">Stato Attuale:</p><p className="capitalize">{request.status}</p></div>
            <div><p className="font-medium text-muted-foreground">Data Creazione:</p><p>{formatDate(request.created_at)}</p></div>
            <div><p className="font-medium text-muted-foreground">Cliente:</p><p>{request.customer}</p></div>
            <div><p className="font-medium text-muted-foreground">Telefono:</p><p>{request.telefono_cliente || "N/D"}</p></div>
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
