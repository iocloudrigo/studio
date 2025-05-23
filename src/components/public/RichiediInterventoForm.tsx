
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, User, Phone, MapPin, CalendarDays, Clock, Wrench, StickyNote } from "lucide-react";

// Firebase imports
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const giorniSettimana = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"] as const;
const fasceOrarie = ["Mattina (9-13)", "Pomeriggio (14-18)", "Sera (dopo le 18)"] as const;

const RichiediInterventoSchema = z.object({
  id_azienda: z.string().min(1), // Campo nascosto, ma obbligatorio
  nomeCognome: z.string().min(1, { message: "Nome e Cognome sono obbligatori." }),
  telefono: z.string().min(1, { message: "Il numero di telefono è obbligatorio." }),
  indirizzo: z.string().min(1, { message: "L'indirizzo dell'intervento è obbligatorio." }),
  giornoPreferito: z.enum(giorniSettimana, { errorMap: () => ({ message: "Seleziona un giorno."}) }),
  fasciaOraria: z.enum(fasceOrarie, { errorMap: () => ({ message: "Seleziona una fascia oraria."}) }),
  tipoServizio: z.string().min(1, { message: "Specifica il tipo di servizio richiesto." }),
  noteAggiuntive: z.string().optional(),
});

type RichiediInterventoValues = z.infer<typeof RichiediInterventoSchema>;

export interface RichiediInterventoFormProps {
  id_azienda: string;
  companyDisplayName: string; // Sarà il nome reale dell'azienda o "la tua azienda di fiducia"
}

export function RichiediInterventoForm({ id_azienda, companyDisplayName }: RichiediInterventoFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<RichiediInterventoValues>({
    resolver: zodResolver(RichiediInterventoSchema),
    defaultValues: {
      id_azienda: id_azienda,
      nomeCognome: "",
      telefono: "",
      indirizzo: "",
      giornoPreferito: undefined,
      fasciaOraria: undefined,
      tipoServizio: "",
      noteAggiuntive: "",
    },
  });

  async function onSubmit(data: RichiediInterventoValues) {
    setIsLoading(true);
    try {
      await addDoc(collection(db, "richieste_clienti"), {
        ...data,
        status: "In attesa", // Stato iniziale della richiesta
        created_at: serverTimestamp(),
      });

      toast({
        title: "Richiesta Inviata!",
        description: "La tua richiesta è stata inviata con successo. Verrai ricontattato al più presto.",
      });
      setIsSubmitted(true); // Mostra il messaggio di conferma
      form.reset(); // Opzionale: svuota il form dopo l'invio
    } catch (error) {
      console.error("Errore durante l'invio della richiesta:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio della richiesta. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-xl animate-in fade-in-50">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold text-primary">Richiesta Inviata Correttamente!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-lg text-muted-foreground">Grazie per averci contattato.</p>
          <p className="text-muted-foreground">Verrai ricontattato al più presto per confermare i dettagli dell'intervento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-semibold text-primary">
          Richiedi un Intervento
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Compila i campi per inviare una richiesta {companyDisplayName === "la tua azienda di fiducia" ? "alla tua azienda di fiducia" : `a ${companyDisplayName}`}.
          Verrai ricontattato al più presto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField name="id_azienda" render={({ field }) => <input type="hidden" {...field} />} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="nomeCognome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome e Cognome</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Mario Rossi" {...field} className="pl-10" disabled={isLoading} />
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
                    <FormLabel>Numero di Telefono</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="tel" placeholder="3331234567" {...field} className="pl-10" disabled={isLoading} />
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
                  <FormLabel>Indirizzo dell'Intervento</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Via Roma 1, 00100 Città" {...field} className="pl-10" disabled={isLoading} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="giornoPreferito"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giorno Preferito</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <div className="relative">
                          <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Seleziona un giorno" />
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
                name="fasciaOraria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fascia Oraria Preferita</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <div className="relative">
                           <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Seleziona una fascia oraria" />
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
              name="tipoServizio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo di Servizio Richiesto</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Wrench className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Es. Riparazione perdita, Installazione caldaia, Manutenzione..." {...field} className="pl-10" disabled={isLoading} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="noteAggiuntive"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note Aggiuntive (Facoltativo)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        placeholder="Fornisci dettagli aggiuntivi utili per l'intervento..."
                        className="pl-10 resize-none"
                        {...field}
                        disabled={isLoading}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                "Invia Richiesta"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
