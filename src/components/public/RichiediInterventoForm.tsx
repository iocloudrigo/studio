
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, User, Phone, MapPin, CalendarDays, Clock, Wrench, StickyNote } from "lucide-react";

// Firebase imports
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Assicurati che db sia esportato da firebase.ts

export interface RichiediInterventoFormProps {
  id_azienda: string;
  companyDisplayName: string;
}

const RichiediInterventoFormSchema = z.object({
  id_azienda: z.string().min(1, "ID Azienda è richiesto."),
  nome_cliente: z.string().min(3, { message: "Nome e Cognome sono richiesti (min. 3 caratteri)." }),
  telefono_cliente: z.string().min(1, { message: "Il numero di telefono è richiesto." }),
  indirizzo_intervento: z.string().min(5, { message: "L'indirizzo dell'intervento è richiesto (min. 5 caratteri)." }),
  giorno_preferito: z.string().min(1, { message: "Seleziona un giorno preferito." }),
  fascia_oraria: z.string().min(1, { message: "Seleziona una fascia oraria." }),
  tipo_servizio: z.string().min(3, { message: "Il tipo di servizio è richiesto (min. 3 caratteri)." }),
  note_aggiuntive: z.string().optional(),
});

type RichiediInterventoFormValues = z.infer<typeof RichiediInterventoFormSchema>;

const giorniSettimana = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"];
const fasceOrarie = ["Mattina (9-13)", "Pomeriggio (14-18)", "Sera (18-20)"];

export function RichiediInterventoForm({ id_azienda, companyDisplayName }: RichiediInterventoFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RichiediInterventoFormValues>({
    resolver: zodResolver(RichiediInterventoFormSchema),
    defaultValues: {
      id_azienda: id_azienda,
      nome_cliente: "",
      telefono_cliente: "",
      indirizzo_intervento: "",
      giorno_preferito: "",
      fascia_oraria: "",
      tipo_servizio: "",
      note_aggiuntive: "",
    },
  });

  async function onSubmit(data: RichiediInterventoFormValues) {
    setIsLoading(true);
    console.log("Dati del form pronti per l'invio:", data);
    console.log("ID Azienda ricevuto come prop:", id_azienda);
    console.log("ID Azienda nel form data:", data.id_azienda);

    if (!data.id_azienda) {
      toast({
        title: "Errore Invio Richiesta",
        description: "ID dell'azienda mancante. Impossibile inviare la richiesta.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const docData = {
        id_azienda: data.id_azienda,
        nome_cliente: data.nome_cliente,
        telefono_cliente: data.telefono_cliente,
        indirizzo_intervento: data.indirizzo_intervento,
        giorno_preferito: data.giorno_preferito,
        fascia_oraria: data.fascia_oraria,
        tipo_servizio: data.tipo_servizio,
        note_aggiuntive: data.note_aggiuntive || "",
        stato: "in attesa", // Stato iniziale
        created_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "richieste_clienti"), docData);
      console.log("Richiesta inviata con successo. ID Documento:", docRef.id);

      toast({
        title: "Richiesta Inviata!",
        description: "La tua richiesta è stata inviata con successo. Verrai ricontattato al più presto.",
      });
      form.reset(); // Resetta i campi del form
    } catch (error: any) {
      console.error("Errore durante l'invio della richiesta:", error);
      toast({
        title: "Errore Invio Richiesta",
        description: `Si è verificato un errore: ${error.message || "Riprova più tardi."}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl md:text-3xl">Richiedi un Intervento</CardTitle>
        <CardDescription>
          Compila i campi sottostanti per inviare una richiesta {companyDisplayName === "la tua azienda di fiducia" ? "alla tua azienda di fiducia" : `a ${companyDisplayName}`}. Verrai ricontattato al più presto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nome_cliente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome e Cognome</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Es: Mario Rossi" {...field} className="pl-10" disabled={isLoading} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="telefono_cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero di Telefono</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="tel" placeholder="Es: 3331234567" {...field} className="pl-10" disabled={isLoading} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="indirizzo_intervento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo dell'Intervento</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Es: Via Roma 1, Milano" {...field} className="pl-10" disabled={isLoading} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="giorno_preferito"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giorno Preferito</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
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
                    <FormLabel>Fascia Oraria Preferita</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
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
                  <FormLabel>Tipo di Servizio Richiesto</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Wrench className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Es: Riparazione perdita rubinetto, Installazione condizionatore" {...field} className="pl-10" disabled={isLoading} />
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
                  <FormLabel>Note Aggiuntive <span className="text-xs text-muted-foreground">(Opzionale)</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        placeholder="Fornisci dettagli aggiuntivi sulla richiesta, modello dell'apparecchio, urgenza, ecc."
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
            
            <FormField
              control={form.control}
              name="id_azienda"
              render={({ field }) => (
                <FormItem className="hidden"> {/* Campo nascosto per id_azienda */}
                  <FormControl>
                    <Input type="hidden" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                "Invia Richiesta di Intervento"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
