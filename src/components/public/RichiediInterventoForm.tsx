
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
import { Loader2, User, Phone, MapPin, CalendarDays, Clock, StickyNote, Wrench } from "lucide-react";

// Firebase imports
import { collection, addDoc, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Assicurati che db sia esportato da firebase.ts

const RichiediInterventoFormSchema = z.object({
  nome_cliente: z.string().min(2, { message: "Nome e Cognome sono obbligatori." }),
  telefono_cliente: z.string().min(1, { message: "Il numero di telefono è obbligatorio." }),
  indirizzo_intervento: z.string().min(1, { message: "L'indirizzo dell'intervento è obbligatorio." }),
  giorno_preferito: z.string().min(1, { message: "Seleziona un giorno preferito." }),
  fascia_oraria: z.string().min(1, { message: "Seleziona una fascia oraria." }),
  tipo_servizio: z.string().min(1, { message: "Descrivi il tipo di servizio richiesto." }),
  note_aggiuntive: z.string().optional(),
  id_azienda: z.string().min(1, "ID Azienda è richiesto."), // Campo nascosto ma necessario
});

type RichiediInterventoFormValues = z.infer<typeof RichiediInterventoFormSchema>;

export interface RichiediInterventoFormProps {
  id_azienda: string;
  companyDisplayName: string;
}

const giorniSettimana = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"];
const fasceOrarie = ["Mattina (9-13)", "Pomeriggio (14-18)", "Sera (dopo le 18)"];

function generaCodiceRichiesta(numero: number): string {
  const numerica = (numero % 10000).toString().padStart(4, '0');
  const blocco10kIndex = Math.floor(numero / 10000);
  const suffix1 = String.fromCharCode(65 + (blocco10kIndex % 26)); // Cambia ogni 10k (AA, AB, AC...)
  const suffix2 = String.fromCharCode(65 + Math.floor(blocco10kIndex / 26) % 26); // Cambia ogni 260k (BA, BB, BC...)
  return `#${numerica}${suffix2}${suffix1}`;
}

export function RichiediInterventoForm({ id_azienda, companyDisplayName }: RichiediInterventoFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RichiediInterventoFormValues>({
    resolver: zodResolver(RichiediInterventoFormSchema),
    defaultValues: {
      nome_cliente: "",
      telefono_cliente: "",
      indirizzo_intervento: "",
      giorno_preferito: "",
      fascia_oraria: "",
      tipo_servizio: "",
      note_aggiuntive: "",
      id_azienda: id_azienda, // Imposta l'ID azienda ricevuto come prop
    },
  });

  async function onSubmit(data: RichiediInterventoFormValues) {
    setIsLoading(true);
    console.log("Dati del form inviati:", data);
    console.log("ID Azienda per la richiesta:", data.id_azienda);

    if (!data.id_azienda) {
      toast({
        title: "Errore Invio Richiesta",
        description: "ID Azienda mancante. Impossibile inviare la richiesta.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const companyDocRef = doc(db, "aziende", data.id_azienda);
        const companySnap = await transaction.get(companyDocRef);

        if (!companySnap.exists()) {
          throw new Error("Azienda non trovata. Impossibile procedere.");
        }

        const numeroPerCodice = companySnap.data()?.contatore_richieste || 0;
        const codiceRichiesta = generaCodiceRichiesta(numeroPerCodice);

        const docData = {
          ...data,
          codice_richiesta: codiceRichiesta,
          stato: "in attesa",
          created_at: serverTimestamp(),
        };
        
        // Non serve aggiungere id_azienda qui perché è già in 'data'
        // delete docData.id_azienda; // Se id_azienda non deve essere nel documento richiesta, ma solo usato per lookup

        const newRequestRef = doc(collection(db, "richieste_clienti")); // Genera un ID automatico per la nuova richiesta
        transaction.set(newRequestRef, docData);
        transaction.update(companyDocRef, { contatore_richieste: numeroPerCodice + 1 });
      });

      toast({
        title: "Richiesta Inviata!",
        description: "La tua richiesta è stata inviata con successo. Verrai ricontattato al più presto.",
      });
      form.reset(); // Resetta il form dopo l'invio
    } catch (error: any) {
      console.error("Errore durante l'invio della richiesta:", error);
      toast({
        title: "Errore Invio Richiesta",
        description: error.message || "Si è verificato un errore. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl">Richiedi un Intervento</CardTitle>
        <CardDescription>
          Compila i campi sottostanti per inviare la tua richiesta{' '}
          {companyDisplayName === "la tua azienda di fiducia" ? "alla tua azienda di fiducia" : `a ${companyDisplayName}`}.
          Verrai ricontattato al più presto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="nome_cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome e Cognome</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Es: Mario Rossi" {...field} className="pl-10" disabled={isLoading}/>
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
                    <FormLabel>Numero di Telefono</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="tel" placeholder="Es: 3331234567" {...field} className="pl-10" disabled={isLoading}/>
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
                  <FormLabel>Indirizzo dell'Intervento</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Es: Via Roma 1, 00100 Città" {...field} className="pl-10" disabled={isLoading}/>
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
                        {giorniSettimana.map((giorno) => (
                          <SelectItem key={giorno} value={giorno}>
                            {giorno}
                          </SelectItem>
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
                        {fasceOrarie.map((fascia) => (
                          <SelectItem key={fascia} value={fascia}>
                            {fascia}
                          </SelectItem>
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
                        <Input placeholder="Es: Riparazione perdita rubinetto, Installazione condizionatore" {...field} className="pl-10" disabled={isLoading}/>
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

            {/* Campo nascosto per id_azienda. React Hook Form lo gestirà */}
            <FormField
              control={form.control}
              name="id_azienda"
              render={({ field }) => ( <FormItem><FormControl><Input type="hidden" {...field} /></FormControl></FormItem>)}
            />


            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Invia Richiesta
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
