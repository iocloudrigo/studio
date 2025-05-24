
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
import { useState, useEffect } from "react";
import { Loader2, User, Phone, MapPin, CalendarDays, Clock, Wrench, StickyNote } from "lucide-react";

// Firebase imports
import { collection, addDoc, serverTimestamp, doc, runTransaction, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Assicurati che db sia esportato da firebase.ts

const RichiediInterventoFormSchema = z.object({
  id_azienda: z.string().min(1, "ID Azienda è richiesto."),
  nome_cliente: z.string().min(1, "Nome e Cognome è obbligatorio."),
  telefono_cliente: z.string().min(1, "Numero di telefono è obbligatorio."),
  indirizzo_intervento: z.string().min(1, "Indirizzo dell'intervento è obbligatorio."),
  giorno_preferito: z.string().min(1, "Giorno preferito è obbligatorio."),
  fascia_oraria: z.string().min(1, "Fascia oraria è obbligatoria."),
  tipo_servizio: z.string().min(1, "Tipo di servizio è obbligatorio."),
  note_aggiuntive: z.string().optional(),
});

export type RichiediInterventoFormValues = z.infer<typeof RichiediInterventoFormSchema>;

export interface RichiediInterventoFormProps {
  id_azienda: string | null; // Può essere null se l'azienda non è trovata
  companyDisplayName: string;
}

export function RichiediInterventoForm({ id_azienda, companyDisplayName }: RichiediInterventoFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<RichiediInterventoFormValues>({
    resolver: zodResolver(RichiediInterventoFormSchema),
    defaultValues: {
      id_azienda: id_azienda || "",
      nome_cliente: "",
      telefono_cliente: "",
      indirizzo_intervento: "",
      giorno_preferito: "",
      fascia_oraria: "",
      tipo_servizio: "",
      note_aggiuntive: "",
    },
  });
  
  useEffect(() => {
    if (id_azienda) {
      form.setValue("id_azienda", id_azienda);
    }
  }, [id_azienda, form]);


  async function onSubmit(data: RichiediInterventoFormValues) {
    setIsSubmitting(true);
    console.log("Dati del form inviati:", data);

    if (!data.id_azienda) {
      toast({
        title: "Errore Invio Richiesta",
        description: "ID azienda mancante. Impossibile inviare la richiesta.",
        variant: "destructive",
      });
      setIsSubmitting(false);
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
        note_aggiuntive: data.note_aggiuntive || null, // Salva null se vuoto
        stato: "in attesa", // Stato iniziale
        created_at: serverTimestamp(),
      };
      console.log("Documento da salvare in richieste_clienti:", docData);

      await addDoc(collection(db, "richieste_clienti"), docData);

      console.log("Richiesta inviata con successo a Firestore.");
      toast({
        title: "Richiesta Inviata!",
        description: "La tua richiesta è stata inviata con successo. Verrai ricontattato al più presto.",
      });
      setIsSubmitted(true); // Imposta lo stato a inviato con successo
      form.reset(); // Resetta il form

    } catch (error: any) {
      console.error("Errore durante l'invio della richiesta:", error);
      let errorMessage = "Si è verificato un errore durante l'invio della richiesta. Riprova più tardi.";
      if (error.code === 'permission-denied') {
        errorMessage = "Errore di permessi. Controlla le regole di sicurezza di Firestore.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({
        title: "Errore Invio Richiesta",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-primary">Richiesta Inviata con Successo!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-lg">Grazie per averci contattato.</p>
          <p className="text-muted-foreground">Verrai ricontattato al più presto da {companyDisplayName}.</p>
          <Button onClick={() => setIsSubmitted(false)} className="mt-6">Invia un'altra richiesta</Button>
        </CardContent>
      </Card>
    );
  }
  
  if (!id_azienda) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-destructive">Errore Configurazione</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Impossibile inviare la richiesta: l'identificativo dell'azienda non è disponibile.
            Verifica che il link fornito sia corretto o contatta l'assistenza.
          </p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Richiedi un Intervento</CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Compila i campi sottostanti per inviare una richiesta {companyDisplayName === "la tua azienda di fiducia" ? "alla tua azienda di fiducia" : `a ${companyDisplayName}`}.
          Verrai ricontattato al più presto. I campi contrassegnati con <span className="text-destructive">*</span> sono obbligatori.
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
                    <FormLabel>Nome e Cognome <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Mario Rossi" {...field} className="pl-10" disabled={isSubmitting} />
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
                        <Input type="tel" placeholder="3331234567" {...field} className="pl-10" disabled={isSubmitting} />
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
                      <Input placeholder="Via Roma 1, 20121 Milano MI" {...field} className="pl-10" disabled={isSubmitting} />
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <div className="relative">
                          <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Seleziona un giorno..." />
                          </SelectTrigger>
                        </div>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Lunedi">Lunedì</SelectItem>
                        <SelectItem value="Martedi">Martedì</SelectItem>
                        <SelectItem value="Mercoledi">Mercoledì</SelectItem>
                        <SelectItem value="Giovedi">Giovedì</SelectItem>
                        <SelectItem value="Venerdi">Venerdì</SelectItem>
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Seleziona una fascia..." />
                          </SelectTrigger>
                        </div>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Mattina">Mattina (9-13)</SelectItem>
                        <SelectItem value="Pomeriggio">Pomeriggio (14-18)</SelectItem>
                        <SelectItem value="Sera">Sera (dopo le 18)</SelectItem>
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
                      <Wrench className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Es: Riparazione perdita rubinetto, Installazione condizionatore..." {...field} className="pl-10" disabled={isSubmitting} />
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
                  <FormLabel>Note Aggiuntive</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <StickyNote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        placeholder="Fornisci dettagli aggiuntivi utili per l'intervento (es. modello dispositivo, accessibilità, urgenza...)"
                        className="resize-y min-h-[100px] pl-10"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
              {isSubmitting ? (
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

    