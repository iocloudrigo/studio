
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, User, Phone, MapPin, CalendarDays, Clock, StickyNote, Edit3, PlusCircle } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

const NewRequestFormSchema = z.object({
  nome_cliente: z.string().min(1, "Nome e Cognome del cliente è obbligatorio."),
  telefono_cliente: z.string().min(1, "Numero di telefono è obbligatorio."),
  indirizzo_intervento: z.string().min(1, "Indirizzo dell'intervento è obbligatorio."),
  giorno_preferito: z.string().min(1, "Giorno preferito è obbligatorio."),
  fascia_oraria: z.string().min(1, "Fascia oraria preferita è obbligatoria."),
  tipo_servizio: z.string().min(1, "Tipo di servizio richiesto è obbligatorio."),
  note_aggiuntive: z.string().optional(),
});

type NewRequestFormValues = z.infer<typeof NewRequestFormSchema>;

const giorniSettimana = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"];
const fasceOrarie = ["Mattina (9-13)", "Pomeriggio (14-18)", "Sera (18-20)"];

export default function NewRequestPage() {
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

  const form = useForm<NewRequestFormValues>({
    resolver: zodResolver(NewRequestFormSchema),
    defaultValues: {
      nome_cliente: "",
      telefono_cliente: "",
      indirizzo_intervento: "",
      giorno_preferito: "",
      fascia_oraria: "",
      tipo_servizio: "",
      note_aggiuntive: "",
    },
  });

  async function onSubmit(data: NewRequestFormValues) {
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
        stato: "in attesa", // Stato iniziale
        created_at: serverTimestamp(),
      };

      await addDoc(collection(db, "richieste_clienti"), docData);

      toast({
        title: "Richiesta Aggiunta!",
        description: "La nuova richiesta di intervento è stata salvata con successo.",
      });
      form.reset(); // Resetta i campi del form
      router.push("/dashboard/requests"); // Reindirizza alla lista delle richieste
    } catch (error) {
      console.error("Errore durante il salvataggio della richiesta: ", error);
      toast({
        title: "Errore nel Salvataggio",
        description: "Si è verificato un errore durante il salvataggio della richiesta. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (!currentUser) {
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Nuova Richiesta Manuale</h1>
          <p className="text-muted-foreground">Inserisci i dettagli per una nuova richiesta di intervento.</p>
        </div>
      </div>
      <Card className="shadow-lg max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Dettagli Richiesta Intervento</CardTitle>
          <CardDescription>Compila i campi sottostanti per registrare un nuovo intervento.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="nome_cliente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome e Cognome Cliente <span className="text-destructive">*</span></FormLabel>
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
                <FormField
                  control={form.control}
                  name="telefono_cliente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero di Telefono <span className="text-destructive">*</span></FormLabel>
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
                name="indirizzo_intervento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo dell'Intervento <span className="text-destructive">*</span></FormLabel>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="giorno_preferito"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giorno Preferito <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} >
                        <FormControl>
                           <div className="relative">
                            <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <SelectTrigger className="pl-10">
                                <SelectValue placeholder="Seleziona un giorno..." />
                            </SelectTrigger>
                          </div>
                        </FormControl>
                        <SelectContent>
                          {giorniSettimana.map(giorno => (
                            <SelectItem key={giorno} value={giorno}>{giorno}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fascia_oraria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fascia Oraria Preferita <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} >
                        <FormControl>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <SelectTrigger className="pl-10">
                                <SelectValue placeholder="Seleziona una fascia oraria..." />
                            </SelectTrigger>
                          </div>
                        </FormControl>
                        <SelectContent>
                          {fasceOrarie.map(fascia => (
                            <SelectItem key={fascia} value={fascia}>{fascia}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tipo_servizio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo di Servizio Richiesto <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Edit3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Es: Riparazione perdita, Sostituzione caldaia" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note_aggiuntive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note Aggiuntive (Opzionale)</FormLabel>
                    <FormControl>
                       <div className="relative">
                        <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          placeholder="Fornisci dettagli aggiuntivi utili per l'intervento..."
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
                  {isLoading ? "Salvataggio in corso..." : "Aggiungi Richiesta"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

    