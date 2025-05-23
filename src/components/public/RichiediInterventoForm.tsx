
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
import { Loader2, Send } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const giorniSettimana = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"] as const;
const fasceOrarie = ["Mattina (9-13)", "Pomeriggio (14-18)", "Sera (18-21)"] as const;


const RichiediInterventoFormSchema = z.object({
  nomeCognome: z.string().min(3, { message: "Nome e Cognome sono obbligatori (min. 3 caratteri)." }),
  telefono: z.string().min(9, { message: "Il numero di telefono è obbligatorio (min. 9 cifre)." }),
  indirizzo: z.string().min(5, { message: "L'indirizzo dell'intervento è obbligatorio (min. 5 caratteri)." }),
  giornoPreferito: z.enum(giorniSettimana, {
    required_error: "Seleziona un giorno preferito.",
  }),
  fasciaOraria: z.enum(fasceOrarie, {
    required_error: "Seleziona una fascia oraria.",
  }),
  tipoServizio: z.string().min(3, { message: "Il tipo di servizio è obbligatorio (min. 3 caratteri)." }),
  noteAggiuntive: z.string().optional(),
  id_azienda: z.string().min(1, { message: "ID Azienda non valido." }), // Hidden, but should be present
});

type RichiediInterventoFormValues = z.infer<typeof RichiediInterventoFormSchema>;

interface RichiediInterventoFormProps {
  id_azienda: string;
  companyDisplayName: string;
}

export function RichiediInterventoForm({ id_azienda, companyDisplayName }: RichiediInterventoFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RichiediInterventoFormValues>({
    resolver: zodResolver(RichiediInterventoFormSchema),
    defaultValues: {
      nomeCognome: "",
      telefono: "",
      indirizzo: "",
      tipoServizio: "",
      noteAggiuntive: "",
      id_azienda: id_azienda, // Pre-fill hidden field
      giornoPreferito: undefined,
      fasciaOraria: undefined,
    },
  });
  
  // Update default id_azienda if prop changes
  if (form.getValues("id_azienda") !== id_azienda) {
    form.reset({ ...form.getValues(), id_azienda: id_azienda });
  }


  async function onSubmit(data: RichiediInterventoFormValues) {
    setIsLoading(true);
    try {
      await addDoc(collection(db, "richieste_clienti"), {
        nome_cliente: data.nomeCognome,
        telefono_cliente: data.telefono,
        indirizzo_intervento: data.indirizzo,
        giorno_preferito: data.giornoPreferito,
        fascia_oraria_preferita: data.fasciaOraria,
        tipo_servizio_richiesto: data.tipoServizio,
        note_aggiuntive: data.noteAggiuntive || "",
        id_azienda: data.id_azienda,
        stato: "in attesa", // "in attesa" as per requirements
        created_at: serverTimestamp(),
        company_slug_at_request: companyDisplayName, // Store for reference
      });

      toast({
        title: "Richiesta Inviata!",
        description: "La tua richiesta di intervento è stata inviata con successo. Verrai ricontattato al più presto.",
      });
      form.reset();
      // Reset select fields explicitly if needed, or ensure defaultValues clears them.
      // For react-hook-form with ShadCN Select, sometimes a manual reset or key change is cleaner.
      form.reset({
        nomeCognome: "",
        telefono: "",
        indirizzo: "",
        tipoServizio: "",
        noteAggiuntive: "",
        id_azienda: id_azienda, 
        giornoPreferito: undefined,
        fasciaOraria: undefined,
      });

    } catch (error) {
      console.error("Errore nell'invio della richiesta:", error);
      toast({
        title: "Errore Invio Richiesta",
        description: "Si è verificato un errore durante l'invio della tua richiesta. Riprova più tardi o contatta l'assistenza.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl border-primary/20">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl md:text-3xl text-primary">Modulo Richiesta Intervento</CardTitle>
        <CardDescription className="text-md">
          Compila i campi sottostanti per inviare la tua richiesta a <span className="font-semibold text-accent">{companyDisplayName}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="id_azienda"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="hidden" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="nomeCognome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome e Cognome</FormLabel>
                    <FormControl>
                      <Input placeholder="Es. Mario Rossi" {...field} disabled={isLoading} />
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
                      <Input type="tel" placeholder="Es. 3331234567" {...field} disabled={isLoading} />
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
                    <Input placeholder="Es. Via Roma 1, 20121 Milano MI" {...field} disabled={isLoading} />
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
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un giorno" />
                        </SelectTrigger>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona una fascia oraria" />
                        </SelectTrigger>
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
                    <Input placeholder="Es. Riparazione perdita, Installazione caldaia, ecc." {...field} disabled={isLoading} />
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
                    <Textarea
                      placeholder="Fornisci dettagli aggiuntivi utili per l'intervento."
                      className="resize-none"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Send className="mr-2 h-5 w-5" />
              )}
              Invia Richiesta
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
