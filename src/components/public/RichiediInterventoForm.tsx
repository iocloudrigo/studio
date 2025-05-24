
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
import { Loader2, User, Phone, Mail, MapPin, CalendarDays, Clock, StickyNote, Wrench } from "lucide-react";

// Firebase imports
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, runTransaction, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface RichiediInterventoFormProps {
  id_azienda: string;
  companyDisplayName: string;
}

const RichiediInterventoFormSchema = z.object({
  id_azienda: z.string().min(1, "ID Azienda è richiesto."),
  nome_cliente: z.string().min(1, "Nome e Cognome del cliente è obbligatorio."),
  telefono_cliente: z.string().min(1, "Numero di telefono è obbligatorio."),
  email_cliente: z.string().email("Indirizzo email non valido.").min(1, "L'indirizzo email è obbligatorio."),
  indirizzo_intervento: z.string().min(1, "Indirizzo dell'intervento è obbligatorio."),
  giorno_preferito: z.string().min(1, "Giorno preferito è obbligatorio."),
  fascia_oraria: z.string().min(1, "Fascia oraria preferita è obbligatoria."),
  tipo_servizio: z.string().min(1, "Tipo di servizio richiesto è obbligatorio."),
  note_aggiuntive: z.string().optional(),
});

type RichiediInterventoFormValues = z.infer<typeof RichiediInterventoFormSchema>;

const giorniSettimana = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"];
const fasceOrarie = ["Mattina (9-13)", "Pomeriggio (14-18)", "Indifferente"];


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
    // Aggiorna il valore di default di id_azienda se la prop cambia
    form.reset({ ...form.getValues(), id_azienda: id_azienda });
  }, [id_azienda, form]);


  async function onSubmit(data: RichiediInterventoFormValues) {
    setIsLoading(true);
    console.log("[RichiediInterventoForm] Form data submitted:", JSON.stringify(data, null, 2));

    if (!data.id_azienda) {
        console.error("[RichiediInterventoForm] ID Azienda mancante nei dati del form.");
        toast({
          title: "Errore Invio Richiesta",
          description: "ID Azienda non specificato. Impossibile inviare la richiesta.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
    }
    
    try {
      const richiesteClientiRef = collection(db, "richieste_clienti");
      const docData = {
        ...data,
        stato: "in attesa",
        created_at: serverTimestamp(),
      };

      await addDoc(richiesteClientiRef, docData);

      toast({
        title: "Richiesta Inviata!",
        description: "La tua richiesta di intervento è stata inviata con successo. Verrai ricontattato al più presto.",
      });
      form.reset();

      // Logica per creare/aggiornare il cliente automaticamente
      if (data.email_cliente && data.email_cliente.trim() !== "") {
        console.log("[RichiediInterventoForm] Attempting auto client creation for email:", data.email_cliente, "and company ID:", data.id_azienda);
        const clientiRef = collection(db, "clienti");
        const q = query(clientiRef, where("id_azienda", "==", data.id_azienda), where("email", "==", data.email_cliente));
        
        try {
          const clienteSnapshot = await getDocs(q);
          console.log("[RichiediInterventoForm] Existing client query snapshot empty:", clienteSnapshot.empty);

          if (clienteSnapshot.empty) { // Cliente non trovato, crealo
            const newClientData = {
              id_azienda: data.id_azienda,
              nome_completo: data.nome_cliente,
              email: data.email_cliente,
              telefono: data.telefono_cliente,
              indirizzo: data.indirizzo_intervento, 
              data_creazione: serverTimestamp(),
              note_interne: `Cliente creato automaticamente dalla richiesta inviata il ${new Date().toLocaleDateString()} per il servizio: ${data.tipo_servizio}.`,
              creato_automaticamente: true, // NUOVO CAMPO
            };
            console.log("[RichiediInterventoForm] Creating new client with data:", JSON.stringify(newClientData, null, 2));
            await addDoc(clientiRef, newClientData);
            console.log("[RichiediInterventoForm] New client created automatically:", data.email_cliente);
          } else {
            console.log("[RichiediInterventoForm] Client already exists:", data.email_cliente, "Doc ID:", clienteSnapshot.docs[0].id);
            // Potresti voler aggiornare data_ultima_richiesta qui se esiste il cliente
          }
        } catch (clientError: any) {
          console.error("[RichiediInterventoForm] Error during automatic client creation/check:", clientError);
          if (clientError instanceof Error && 'code' in clientError) {
            console.error("Firestore Error Code:", (clientError as any).code);
          }
        }
      } else {
        console.log("[RichiediInterventoForm] Skipping auto client creation: email not provided or empty.");
      }

    } catch (error) {
      console.error("Errore durante l'invio della richiesta: ", error);
      toast({
        title: "Errore Invio Richiesta",
        description: "Si è verificato un errore durante l'invio della richiesta. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }


  const formTitle = "Richiedi un Intervento";
  const formDescription = `Compila i campi per inviare una richiesta ${companyDisplayName === "la tua azienda di fiducia" ? "alla tua azienda di fiducia" : `a ${companyDisplayName}`}. Verrai ricontattato al più presto.`;

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold text-primary">{formTitle}</CardTitle>
        <CardDescription className="text-center text-muted-foreground">{formDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
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
