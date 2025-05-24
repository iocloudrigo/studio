
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, User, Phone, MapPin, CalendarDays, Clock, Wrench, StickyNote } from "lucide-react";

// Firebase imports
import { collection, addDoc, serverTimestamp, doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Assicurati che db sia esportato da firebase.ts

// Funzione per generare il codice richiesta
function generaCodiceRichiesta(numero: number): string {
  const parteNumerica = String(numero).padStart(4, '0');
  
  // Calcolo per le lettere AA, AB, ..., AZ, BA, BB, ... ZZ
  const gruppoPrincipale = Math.floor(numero / (26 * 10000)); // Ogni 260.000 richieste cambia la prima lettera del suffisso di secondo livello
  const suffissoNumero = numero % (26 * 10000); // Numero all'interno del gruppo principale

  const letter2Index = Math.floor(suffissoNumero / 10000); // Indice per la seconda lettera (0-25)
  const letter1Index = gruppoPrincipale % 26; // Indice per la prima lettera (0-25)

  const letter1 = String.fromCharCode(65 + letter1Index);
  const letter2 = String.fromCharCode(65 + letter2Index);
  
  return `#${parteNumerica}${letter1}${letter2}`;
}


const RichiediInterventoFormSchema = z.object({
  id_azienda: z.string().min(1, "ID Azienda è richiesto."),
  nome_cliente: z.string().min(3, { message: "Nome e cognome sono richiesti (min. 3 caratteri)." }),
  telefono_cliente: z.string().min(1, { message: "Il numero di telefono è richiesto." }),
  indirizzo_intervento: z.string().min(5, { message: "L'indirizzo dell'intervento è richiesto (min. 5 caratteri)." }),
  giorno_preferito: z.string({ required_error: "Seleziona un giorno."}).min(1, "Seleziona un giorno."),
  fascia_oraria: z.string({ required_error: "Seleziona una fascia oraria."}).min(1, "Seleziona una fascia oraria."),
  tipo_servizio: z.string().min(3, { message: "Descrivi il tipo di servizio richiesto (min. 3 caratteri)." }),
  note_aggiuntive: z.string().optional(),
});

type RichiediInterventoFormValues = z.infer<typeof RichiediInterventoFormSchema>;

export interface RichiediInterventoFormProps {
  id_azienda: string;
  companyDisplayName: string;
}

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

  const onSubmit = async (data: RichiediInterventoFormValues) => {
    setIsLoading(true);
    console.log("RichiediInterventoForm onSubmit, data:", data);
    console.log("id_azienda from form data:", data.id_azienda); // Log per id_azienda

    if (!data.id_azienda) {
      console.error("ID Azienda mancante nel form prima della transazione.");
      toast({
        title: "Errore Invio Richiesta",
        description: "ID Azienda non trovato. Impossibile inviare la richiesta. Contatta l'assistenza.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const newRequestCode = await runTransaction(db, async (transaction) => {
        const aziendaDocRef = doc(db, "aziende", data.id_azienda);
        const aziendaDoc = await transaction.get(aziendaDocRef);

        if (!aziendaDoc.exists()) {
          throw new Error("Azienda non trovata. Impossibile elaborare la richiesta.");
        }

        const aziendaData = aziendaDoc.data();
        const currentCounter = aziendaData.contatore_richieste || 0;
        const nuovoCodice = generaCodiceRichiesta(currentCounter);
        
        console.log(`Contatore attuale: ${currentCounter}, Nuovo codice generato: ${nuovoCodice}`);

        const richiestaRef = doc(collection(db, "richieste_clienti")); // Crea un riferimento con ID auto-generato
        
        const docData = {
          ...data, // Contiene già id_azienda grazie a defaultValues e form state
          codice_richiesta: nuovoCodice,
          stato: "in attesa",
          created_at: serverTimestamp(),
        };
        
        transaction.set(richiestaRef, docData);
        transaction.update(aziendaDocRef, { contatore_richieste: currentCounter + 1 });
        
        return nuovoCodice; // Restituisce il codice per il messaggio di successo
      });

      toast({
        title: "Richiesta Inviata!",
        description: `La tua richiesta con codice ${newRequestCode} è stata inviata con successo a ${companyDisplayName}. Verrai ricontattato al più presto.`,
      });
      form.reset();
    } catch (error: any) {
      console.error("Errore durante l'invio della richiesta:", error);
      toast({
        title: "Errore Invio Richiesta",
        description: error.message || "Si è verificato un problema durante l'invio della tua richiesta. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const formDescriptionText = companyDisplayName === "la tua azienda di fiducia" 
    ? "alla tua azienda di fiducia" 
    : `a ${companyDisplayName}`;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl md:text-3xl">Richiedi un Intervento</CardTitle>
        <CardDescription>
          Compila i campi per inviare una richiesta {formDescriptionText}. Verrai ricontattato al più presto.
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
                      <Input placeholder="Mario Rossi" {...field} className="pl-10" disabled={isLoading} />
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
                      <Input type="tel" placeholder="3331234567" {...field} className="pl-10" disabled={isLoading} />
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
                      <Input placeholder="Via Roma 1, 20100 Milano (MI)" {...field} className="pl-10" disabled={isLoading} />
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
                        <SelectItem value="lunedi">Lunedì</SelectItem>
                        <SelectItem value="martedi">Martedì</SelectItem>
                        <SelectItem value="mercoledi">Mercoledì</SelectItem>
                        <SelectItem value="giovedi">Giovedì</SelectItem>
                        <SelectItem value="venerdi">Venerdì</SelectItem>
                        <SelectItem value="qualsiasi">Qualsiasi Giorno</SelectItem>
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
                              <SelectValue placeholder="Seleziona una fascia..." />
                            </SelectTrigger>
                        </div>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mattina">Mattina (9-13)</SelectItem>
                        <SelectItem value="pomeriggio">Pomeriggio (14-18)</SelectItem>
                        <SelectItem value="sera">Sera (dopo le 18)</SelectItem>
                        <SelectItem value="qualsiasi">Qualsiasi Orario</SelectItem>
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
                      <Input placeholder="Es: Riparazione perdita rubinetto cucina, Installazione condizionatore" {...field} className="pl-10" disabled={isLoading} />
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
                          placeholder="Descrivi qui eventuali dettagli aggiuntivi utili per l'intervento..."
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
            
            {/* Campo id_azienda nascosto, ma il suo valore è gestito in defaultValues e nello stato del form */}
            <FormField control={form.control} name="id_azienda" render={({ field }) => <FormItem><FormControl><Input type="hidden" {...field} /></FormControl></FormItem>} />


            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Invia Richiesta"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    