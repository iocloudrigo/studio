
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, Mail, Phone, Wrench, Briefcase, PlusCircle } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

const NewTechnicianFormSchema = z.object({
  nome_completo: z.string().min(1, "Il nome del tecnico è obbligatorio."),
  email: z.string().email("Indirizzo email non valido.").optional().or(z.literal("")),
  telefono: z.string().optional(),
  competenze: z.string().optional().describe("Inserisci competenze separate da virgola, es: Idraulica, Elettricità"),
  stato: z.string().min(1, "Lo stato è obbligatorio."),
});

type NewTechnicianFormValues = z.infer<typeof NewTechnicianFormSchema>;

const STATI_TECNICO = ["Disponibile", "Occupato", "In Ferie", "Non Disponibile"];

export default function NewTechnicianPage() {
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
        router.push("/"); 
      }
    });
    return () => unsubscribe();
  }, [router]);

  const form = useForm<NewTechnicianFormValues>({
    resolver: zodResolver(NewTechnicianFormSchema),
    defaultValues: {
      nome_completo: "",
      email: "",
      telefono: "",
      competenze: "",
      stato: "Disponibile",
    },
  });

  async function onSubmit(data: NewTechnicianFormValues) {
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
      const competenzeArray = data.competenze ? data.competenze.split(',').map(c => c.trim()).filter(c => c) : [];
      
      const docData = {
        id_azienda: companyId,
        nome_completo: data.nome_completo,
        email: data.email || null,
        telefono: data.telefono || null,
        competenze: competenzeArray,
        stato: data.stato,
        data_creazione: serverTimestamp(),
      };

      await addDoc(collection(db, "tecnici"), docData);

      toast({
        title: "Tecnico Aggiunto!",
        description: "Il nuovo tecnico è stato salvato con successo.",
      });
      form.reset();
      router.push("/dashboard/technicians");
    } catch (error) {
      console.error("Errore durante il salvataggio del tecnico: ", error);
      toast({
        title: "Errore nel Salvataggio",
        description: "Si è verificato un errore durante il salvataggio del tecnico. Riprova.",
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Aggiungi Nuovo Tecnico</h1>
          <p className="text-muted-foreground">Inserisci i dettagli per un nuovo tecnico.</p>
        </div>
      </div>
      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Dettagli Tecnico</CardTitle>
          <CardDescription>Compila i campi sottostanti per registrare un nuovo tecnico.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="nome_completo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo <span className="text-destructive">*</span></FormLabel>
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
                      <FormLabel>Email (Opzionale)</FormLabel>
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
                name="competenze"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competenze (separate da virgola)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Wrench className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Es: Idraulica, Elettricità, Caldaie" {...field} className="pl-10" />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <SelectTrigger className="pl-10">
                                <SelectValue placeholder="Seleziona uno stato..." />
                            </SelectTrigger>
                        </div>
                      </FormControl>
                      <SelectContent>
                        {STATI_TECNICO.map(stato => (
                          <SelectItem key={stato} value={stato}>{stato}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  {isLoading ? "Salvataggio in corso..." : "Aggiungi Tecnico"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

    