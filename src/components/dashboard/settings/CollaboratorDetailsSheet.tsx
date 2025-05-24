
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
import { Loader2, UserCircle, Mail, BriefcaseIcon, Trash2 } from "lucide-react";
import type { Collaborator } from "@/app/dashboard/settings/page"; // Assuming Collaborator type is exported from settings page

const RUOLI_COLLABORATORI = ["Amministratore", "Operatore", "Responsabile"];

const collaboratorEditSchema = z.object({
  nome_completo: z.string().min(2, { message: "Il nome completo è richiesto." }),
  ruolo: z.string().min(1, { message: "Il ruolo è richiesto." }),
});
type CollaboratorEditFormValues = z.infer<typeof collaboratorEditSchema>;

interface CollaboratorDetailsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  collaborator: Collaborator | null;
  onUpdateCollaborator: (id: string, data: CollaboratorEditFormValues) => Promise<void>;
  onDeleteCollaborator: (id: string) => Promise<void>;
}

export const CollaboratorDetailsSheet: FC<CollaboratorDetailsSheetProps> = ({
  isOpen,
  onOpenChange,
  collaborator,
  onUpdateCollaborator,
  onDeleteCollaborator,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);

  const form = useForm<CollaboratorEditFormValues>({
    resolver: zodResolver(collaboratorEditSchema),
    defaultValues: {
      nome_completo: "",
      ruolo: "",
    },
  });

  useEffect(() => {
    if (collaborator) {
      form.reset({
        nome_completo: collaborator.nome_completo,
        ruolo: collaborator.ruolo,
      });
    }
  }, [collaborator, form]);

  if (!collaborator) return null;

  const handleSaveChanges = async (data: CollaboratorEditFormValues) => {
    setIsSaving(true);
    try {
      await onUpdateCollaborator(collaborator.id, data);
      onOpenChange(false); // Close sheet on success
    } catch (error) {
      console.error("Error updating collaborator from sheet:", error);
      // Toast for error is handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    setIsDeleting(true);
    try {
      await onDeleteCollaborator(collaborator.id);
      setIsConfirmDeleteDialogOpen(false);
      onOpenChange(false); // Close sheet on success
    } catch (error) {
      console.error("Error deleting collaborator from sheet:", error);
      // Toast for error is handled by parent
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg w-[90vw] overflow-y-auto p-0 flex flex-col">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>Dettaglio Collaboratore</SheetTitle>
            <SheetDescription>
              Visualizza, modifica o elimina i dettagli del collaboratore.
            </SheetDescription>
          </SheetHeader>
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSaveChanges)}
                className="space-y-6"
                id="collaborator-edit-form"
              >
                <FormField
                  control={form.control}
                  name="nome_completo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Mario Rossi"
                            {...field}
                            className="pl-10"
                            disabled={isSaving}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      value={collaborator.email}
                      readOnly
                      disabled
                      className="pl-10 bg-muted/50"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
                <FormField
                  control={form.control}
                  name="ruolo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ruolo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSaving}
                      >
                        <FormControl>
                          <div className="relative">
                            <BriefcaseIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <SelectTrigger className="pl-10">
                              <SelectValue placeholder="Seleziona un ruolo..." />
                            </SelectTrigger>
                          </div>
                        </FormControl>
                        <SelectContent>
                          {RUOLI_COLLABORATORI.map((ruoloOption) => (
                            <SelectItem key={ruoloOption} value={ruoloOption}>
                              {ruoloOption}
                            </SelectItem>
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
              Elimina Collaboratore
            </Button>
            <SheetClose asChild>
              <Button variant="outline" disabled={isSaving || isDeleting}>
                Annulla
              </Button>
            </SheetClose>
            <Button
              type="submit"
              form="collaborator-edit-form"
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
            <AlertDialogTitle>Sei sicuro di voler eliminare questo collaboratore?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Il collaboratore{" "}
              <strong>{collaborator.nome_completo} ({collaborator.email})</strong>{" "}
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
