
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
import { useState } from "react";
import { Loader2, User, Phone, Mail, MapPin, CalendarDays, Clock, StickyNote, Wrench } from "lucide-react";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

const RichiediInterventoFormSchema = z.object({
  id_azienda: z.string().min(1, "ID Azienda è richiesto."), // Campo nascosto ma necessario
  nome_cliente: z.string().min(1, "Nome e Cognome del cliente è obbligatorio."),
  telefono_cliente: z.string().min(1, "Numero di telefono è obbligatorio."),
  email_cliente: z.string().email("Indirizzo email non valido.").optional().or(z.literal("")),
  indirizzo_intervento: z.string().min(1, "Indirizzo dell'intervento è obbligatorio."),
  giorno_preferito: z.string().min(1, "Giorno preferito è obbligatorio."),
  fascia_oraria: z.string().min(1, "Fascia oraria preferita è obbligatoria."),
  tipo_servizio: z.string().min(1, "Tipo di servizio richiesto è obbligatorio."),
  note_aggiuntive: z.string().optional(),
});

type RichiediInterventoFormValues = z.infer<typeof RichiediInterventoFormSchema>;

export interface RichiediInterventoFormProps {
  id_azienda: string;
  companyDisplayName: string;
}

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
      email_cliente: "",
      indirizzo_intervento: "",
      giorno_preferito: "",
      fascia_oraria: "",
      tipo_servizio: "",
      note_aggiuntive: "",
    },
  });
  
  async function upsertCliente(data: RichiediInterventoFormValues) {
    if (!data.email_cliente) { // Non creare/aggiornare se l'email non è fornita
      console.log("Email cliente non fornita, skip creazione/aggiornamento cliente.");
      return;
    }
    
    try {
      const clientiRef = collection(db, "clienti");
      const q = query(clientiRef, where("id_azienda", "==", data.id_azienda), where("email", "==", data.email_cliente), limit(1));
      const querySnapshot = await getDocs(q);

      const clienteData = {
        id_azienda: data.id_azienda,
        nome_completo: data.nome_cliente,
        email: data.email_cliente,
        telefono: data.telefono_cliente,
        indirizzo: data.indirizzo_intervento, // Potrebbe essere l'indirizzo dell'ultimo intervento
        data_ultima_richiesta: serverTimestamp(),
      };

      if (querySnapshot.empty) {
        // Cliente non trovato, creane uno nuovo
        await addDoc(clientiRef, {
          ...clienteData,
          data_creazione: serverTimestamp(),
        });
        console.log("Nuovo cliente creato automaticamente:", data.email_cliente);
      } else {
        // Cliente trovato, aggiorna data_ultima_richiesta (e altri campi se necessario)
        const clienteDocRef = querySnapshot.docs[0].ref;
        const batch = writeBatch(db);
        batch.update(clienteDocRef, {
            nome_completo: data.nome_cliente, // Aggiorna nome se diverso
            telefono: data.telefono_cliente, // Aggiorna telefono se diverso
            indirizzo: data.indirizzo_intervento, // Aggiorna indirizzo
            data_ultima_richiesta: serverTimestamp()
        });
        await batch.commit();
        console.log("Dati cliente aggiornati per:", data.email_cliente);
      }
    } catch (error) {
      console.error("Errore durante la creazione/aggiornamento automatico del cliente:", error);
      // Non bloccare l'invio della richiesta per questo, ma logga l'errore
      toast({
        title: "Info Cliente",
        description: "Non è stato possibile aggiornare automaticamente l'anagrafica cliente.",
        variant: "default", // Non è un errore bloccante per la richiesta
      });
    }
  }


  async function onSubmit(data: RichiediInterventoFormValues) {
    console.log("Dati del form prima del submit:", data);
    if (!id_azienda) {
      toast({
        title: "Errore Configurazione",
        description: "ID Azienda non trovato nel form. Contattare l'assistenza.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const docData = {
        id_azienda: data.id_azienda,
        nome_cliente: data.nome_cliente,
        telefono_cliente: data.telefono_cliente,
        email_cliente: data.email_cliente || null,
        indirizzo_intervento: data.indirizzo_intervento,
        giorno_preferito: data.giorno_preferito,
        fascia_oraria: data.fascia_oraria,
        tipo_servizio: data.tipo_servizio,
        note_aggiuntive: data.note_aggiuntive || null,
        stato: "in attesa",
        created_at: serverTimestamp(),
      };

      await addDoc(collection(db, "richieste_clienti"), docData);
      
      // Dopo aver salvato la richiesta, prova a creare/aggiornare il cliente
      await upsertCliente(data);

      toast({
        title: "Richiesta Inviata!",
        description: "La tua richiesta di intervento è stata inviata con successo. Verrai ricontattato al più presto.",
      });
      form.reset();
    } catch (error: any) {
      console.error("Errore durante l'invio della richiesta: ", error);
      let errorMessage = "Si è verificato un errore durante l'invio della richiesta. Riprova.";
      if (error.code === 'permission-denied') {
        errorMessage = "Errore di permessi. Impossibile inviare la richiesta in questo momento.";
      }
      toast({
        title: "Errore Invio Richiesta",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-2xl">Richiedi un Intervento</CardTitle>
        <CardDescription className="text-center">
          Compila i campi per inviare una richiesta {companyDisplayName === "la tua azienda di fiducia" ? "alla tua azienda di fiducia" : `a ${companyDisplayName}`}. Verrai ricontattato al più presto.
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
                ) : null}
                {isLoading ? "Invio in corso..." : "Invia Richiesta"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
