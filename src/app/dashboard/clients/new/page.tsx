
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, Phone, Mail, MapPin, StickyNote, PlusCircle } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

const NewClientFormSchema = z.object({
  nome_completo: z.string().min(1, "Nome e Cognome del cliente è obbligatorio."),
  email: z.string().email("Indirizzo email non valido.").min(1, "L'indirizzo email è obbligatorio."), // Modificato: reso obbligatorio
  telefono: z.string().optional(),
  indirizzo: z.string().optional(),
  note_interne: z.string().optional(),
});

type NewClientFormValues = z.infer<typeof NewClientFormSchema>;

export default function NewClientPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setCompanyId(user.uid);
      } else {
        setCurrentUser(null);
        setCompanyId(null);
        router.push("/"); // Se non autenticato, torna al login
      }
    });
    return () => unsubscribe();
  }, [router]);

  const form = useForm<NewClientFormValues>({
    resolver: zodResolver(NewClientFormSchema),
    defaultValues: {
      nome_completo: "",
      email: "", // Rimane stringa vuota come default, ma la validazione lo renderà obbligatorio
      telefono: "",
      indirizzo: "",
      note_interne: "",
    },
  });

  async function onSubmit(data: NewClientFormValues) {
    if (!companyId) {
      toast({
        title: "Errore",
        description: "ID Azienda non trovato. Assicurati di essere autenticato.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const docData = {
        ...data,
        id_azienda: companyId,
        // email sarà sempre presente perché obbligatorio
        telefono: data.telefono || null,
        indirizzo: data.indirizzo || null,
        note_interne: data.note_interne || null,
        data_creazione: serverTimestamp(),
        creato_automaticamente: false,
      };

      await addDoc(collection(db, "clienti"), docData);

      toast({
        title: "Cliente Aggiunto!",
        description: "Il nuovo cliente è stato salvato con successo.",
      });
      form.reset();
      router.push("/dashboard/clients");
    } catch (error) {
      console.error("Errore durante il salvataggio del cliente: ", error);
      toast({
        title: "Errore nel Salvataggio",
        description: "Si è verificato un errore durante il salvataggio del cliente. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!currentUser && !companyId) { 
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Aggiungi Nuovo Cliente</h1>
          <p className="text-muted-foreground">Inserisci i dettagli per un nuovo cliente.</p>
        </div>
      </div>
      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Dettagli Cliente</CardTitle>
          <CardDescription>Compila i campi sottostanti per registrare un nuovo cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="nome_completo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome e Cognome <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Es: Mario Rossi" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email <span className="text-destructive">*</span></FormLabel> {/* Modificato: rimosso (Opzionale) e aggiunto asterisco */}
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input type="email" placeholder="Es: mario.rossi@email.com" {...field} className="pl-10" />
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
                      <FormLabel>Numero di Telefono (Opzionale)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input type="tel" placeholder="Es: 3331234567" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="indirizzo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo Principale (Opzionale)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Es: Via Roma 1, 20100 Milano MI" {...field} className="pl-10" />
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
                    <FormLabel>Note Interne (Opzionale)</FormLabel>
                    <FormControl>
                       <div className="relative">
                        <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          placeholder="Informazioni aggiuntive utili per l'azienda..."
                          className="pl-10 resize-none min-h-[100px]"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                  )}
                  {isLoading ? "Salvataggio in corso..." : "Aggiungi Cliente"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
