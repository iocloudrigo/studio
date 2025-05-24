
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect, type FC } from "react";
import { Loader2, User, Mail, Phone, Wrench, Briefcase, Trash2, MapPin } from "lucide-react"; // Aggiunto MapPin
import type { Technician } from "@/app/dashboard/technicians/page.tsx";

const technicianFormSchema = z.object({
  nome_completo: z.string().min(1, { message: "Il nome completo è richiesto." }),
  email: z.string().email({ message: "Indirizzo email non valido."}).optional().or(z.literal("")),
  telefono: z.string().optional(),
  citta: z.string().min(1, { message: "La città è obbligatoria."}), // Aggiunto campo città
  competenze: z.string().optional().describe("Competenze separate da virgola"),
  stato: z.string().min(1, { message: "Lo stato è richiesto."}),
});

export type TechnicianFormValues = z.infer<typeof technicianFormSchema>;
const STATI_TECNICO = ["Disponibile", "Occupato", "In Ferie", "Non Disponibile"];

interface TechnicianDetailsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  technician: Technician | null;
  onUpdateTechnician: (id: string, data: TechnicianFormValues) => Promise<void>;
  onDeleteTechnician: (id: string) => Promise<void>;
}

export const TechnicianDetailsSheet: FC<TechnicianDetailsSheetProps> = ({
  isOpen,
  onOpenChange,
  technician,
  onUpdateTechnician,
  onDeleteTechnician,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);

  const form = useForm<TechnicianFormValues>({
    resolver: zodResolver(technicianFormSchema),
    defaultValues: {
      nome_completo: "",
      email: "",
      telefono: "",
      citta: "", // Aggiunto default città
      competenze: "",
      stato: "Disponibile",
    },
  });

  useEffect(() => {
    if (technician) {
      form.reset({
        nome_completo: technician.nome_completo,
        email: technician.email || "",
        telefono: technician.telefono || "",
        citta: technician.citta || "", // Aggiunto città
        competenze: technician.competenze ? technician.competenze.join(", ") : "",
        stato: technician.stato,
      });
    }
  }, [technician, form]);

  if (!technician) return null;

  const handleSaveChanges = async (data: TechnicianFormValues) => {
    setIsSaving(true);
    try {
      await onUpdateTechnician(technician.id, data);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating technician from sheet:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    setIsDeleting(true);
    try {
      await onDeleteTechnician(technician.id);
      setIsConfirmDeleteDialogOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting technician from sheet:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg w-[90vw] overflow-y-auto p-0 flex flex-col">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>Dettaglio Tecnico: {technician.nome_completo}</SheetTitle>
            <SheetDescription>
              Visualizza, modifica o elimina i dettagli del tecnico.
            </SheetDescription>
          </SheetHeader>
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSaveChanges)}
                className="space-y-6"
                id="technician-edit-form"
              >
                <FormField
                  control={form.control}
                  name="nome_completo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input {...field} className="pl-10" disabled={isSaving} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input type="email" {...field} className="pl-10" disabled={isSaving} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input type="tel" {...field} className="pl-10" disabled={isSaving} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="citta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Città <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input {...field} className="pl-10" disabled={isSaving} placeholder="Es: Roma" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="competenze"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Competenze (separate da virgola)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Wrench className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input {...field} className="pl-10" disabled={isSaving} placeholder="Es: Idraulica, Elettricista" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stato <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                        <FormControl>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <SelectTrigger className="pl-10">
                                <SelectValue placeholder="Seleziona uno stato..." />
                            </SelectTrigger>
                          </div>
                        </FormControl>
                        <SelectContent>
                          {STATI_TECNICO.map(statoOption => (
                            <SelectItem key={statoOption} value={statoOption}>{statoOption}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
          <SheetFooter className="p-6 border-t mt-auto">
            <Button
              variant="destructive"
              onClick={() => setIsConfirmDeleteDialogOpen(true)}
              disabled={isSaving || isDeleting}
              className="mr-auto"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Elimina Tecnico
            </Button>
            <SheetClose asChild>
              <Button variant="outline" disabled={isSaving || isDeleting}>
                Annulla
              </Button>
            </SheetClose>
            <Button
              type="submit"
              form="technician-edit-form"
              disabled={isSaving || isDeleting || !form.formState.isDirty}
            >
              {isSaving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSaving ? "Salvataggio..." : "Salva Modifiche"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={isConfirmDeleteDialogOpen}
        onOpenChange={setIsConfirmDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler eliminare questo tecnico?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Il tecnico{" "}
              <strong>{technician.nome_completo}</strong>{" "}
              verrà rimosso definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isDeleting ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

    