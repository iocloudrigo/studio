
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
import { Loader2, User, Phone, Mail, MapPin, CalendarDays, Clock, Wrench, StickyNote } from "lucide-react";

// Firebase imports
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const RichiediInterventoFormSchema = z.object({
  id_azienda: z.string().min(1, "ID Azienda è richiesto."),
  nome_cliente: z.string().min(1, "Nome e Cognome del cliente è obbligatorio."),
  telefono_cliente: z.string().min(1, "Numero di telefono è obbligatorio."),
  email_cliente: z.string().email("Formato email non valido.").min(1, "L'email è obbligatoria."),
  indirizzo_intervento: z.string().min(1, "Indirizzo dell'intervento è obbligatorio."),
  giorno_preferito: z.string().min(1, "Giorno preferito è obbligatorio."),
  fascia_oraria: z.string().min(1, "Fascia oraria preferita è obbligatoria."),
  tipo_servizio: z.string().min(1, "Tipo di servizio richiesto è obbligatorio."),
  note_aggiuntive: z.string().optional(),
});

type RichiediInterventoFormValues = z.infer<typeof RichiediInterventoFormSchema>;

const giorniSettimana = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"];
const fasceOrarie = ["Mattina (9-13)", "Pomeriggio (14-18)", "Sera (18-20)"];

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
      email_cliente: "",
      indirizzo_intervento: "",
      giorno_preferito: "",
      fascia_oraria: "",
      tipo_servizio: "",
      note_aggiuntive: "",
    },
  });

  useEffect(() => {
    // Popola id_azienda quando la prop cambia (es. dopo il caricamento asincrono nella pagina genitore)
    if (id_azienda) {
      form.setValue("id_azienda", id_azienda);
    }
  }, [id_azienda, form]);


  async function onSubmit(data: RichiediInterventoFormValues) {
    console.log("RichiediInterventoForm onSubmit data:", data);
    console.log("ID Azienda nel form al submit:", data.id_azienda);

    if (!data.id_azienda) {
      toast({
        title: "Errore Critico",
        description: "ID Azienda mancante. Impossibile inviare la richiesta. Si prega di ricaricare la pagina o contattare l'assistenza.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      const docData = {
        ...data,
        stato: "in attesa", // Stato iniziale minuscolo
        created_at: serverTimestamp(),
      };
      
      console.log("Dati da salvare in Firestore:", docData);
      await addDoc(collection(db, "richieste_clienti"), docData);

      toast({
        title: "Richiesta Inviata!",
        description: `La tua richiesta a ${companyDisplayName} è stata inviata con successo. Verrai ricontattato al più presto.`,
      });
      form.reset(); // Resetta i campi del form
    } catch (error: any) {
      console.error("Errore durante l'invio della richiesta: ", error);
      toast({
        title: "Errore Invio Richiesta",
        description: `Si è verificato un errore: ${error.message || "Riprova più tardi."}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const formTitle = companyDisplayName === "la tua azienda di fiducia"
    ? "Richiedi un Intervento"
    : `Richiedi un Intervento a ${companyDisplayName}`;

  const formDescription = companyDisplayName === "la tua azienda di fiducia"
    ? "Compila i campi sottostanti per inviare la tua richiesta. Verrai ricontattato al più presto."
    : `Compila i campi sottostanti per inviare una richiesta a ${companyDisplayName}. Verrai ricontattato al più presto.`;


  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-2xl">{formTitle}</CardTitle>
        <CardDescription className="text-center">
          {formDescription}
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
                name="email_cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Cliente <span className="text-destructive">*</span></FormLabel>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                      <Wrench className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  <FormLabel>Note Aggiuntive</FormLabel>
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
                  <Wrench className="mr-2 h-4 w-4" /> // Potresti cambiare icona se preferisci
                )}
                {isLoading ? "Invio in corso..." : "Invia Richiesta"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
