
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
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, User, Mail, Phone, MapPin, StickyNote, Trash2 } from "lucide-react";
import type { Cliente } from "@/app/dashboard/clients/page"; // Assumendo che il tipo sia esportato

const clientFormSchema = z.object({
  nome_completo: z.string().min(1, { message: "Il nome completo è richiesto." }),
  email: z.string().email({ message: "Indirizzo email non valido."}).optional().or(z.literal("")),
  telefono: z.string().optional(),
  indirizzo: z.string().optional(),
  note_interne: z.string().optional(),
});
export type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientDetailsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: Cliente | null;
  onUpdateClient: (id: string, data: ClientFormValues) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
}

export const ClientDetailsSheet: FC<ClientDetailsSheetProps> = ({
  isOpen,
  onOpenChange,
  client,
  onUpdateClient,
  onDeleteClient,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      nome_completo: "",
      email: "",
      telefono: "",
      indirizzo: "",
      note_interne: "",
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        nome_completo: client.nome_completo,
        email: client.email || "",
        telefono: client.telefono || "",
        indirizzo: client.indirizzo || "",
        note_interne: client.note_interne || "",
      });
    }
  }, [client, form]);

  if (!client) return null;

  const handleSaveChanges = async (data: ClientFormValues) => {
    setIsSaving(true);
    try {
      await onUpdateClient(client.id, data);
      onOpenChange(false);
    } catch (error) {
      // L'errore viene già gestito e tostato nella funzione onUpdateClient della pagina genitore
      console.error("Error updating client from sheet:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    setIsDeleting(true);
    try {
      await onDeleteClient(client.id);
      setIsConfirmDeleteDialogOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting client from sheet:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg w-[90vw] overflow-y-auto p-0 flex flex-col">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>Dettaglio Cliente: {client.nome_completo}</SheetTitle>
            <SheetDescription>
              Visualizza, modifica o elimina i dettagli del cliente.
            </SheetDescription>
          </SheetHeader>
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSaveChanges)}
                className="space-y-6"
                id="client-edit-form"
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
                  name="indirizzo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indirizzo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input {...field} className="pl-10" disabled={isSaving} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="note_interne"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note Interne</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Textarea
                            className="pl-10 resize-none min-h-[100px]"
                            {...field}
                            disabled={isSaving}
                          />
                        </div>
                      </FormControl>
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
              Elimina Cliente
            </Button>
            <SheetClose asChild>
              <Button variant="outline" disabled={isSaving || isDeleting}>
                Annulla
              </Button>
            </SheetClose>
            <Button
              type="submit"
              form="client-edit-form"
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
            <AlertDialogTitle>Sei sicuro di voler eliminare questo cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Il cliente{" "}
              <strong>{client.nome_completo}</strong>{" "}
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
