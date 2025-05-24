
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2, User, Phone, MapPin, CalendarDays, Clock, Wrench, StickyNote } from "lucide-react";

// Firebase imports
import { collection, addDoc, serverTimestamp, doc, runTransaction, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const RichiediInterventoFormSchema = z.object({
  id_azienda: z.string().min(1, "ID Azienda è richiesto."),
  nome_cliente: z.string().min(1, "Nome e Cognome è richiesto."),
  telefono_cliente: z.string().min(1, "Numero di telefono è richiesto."),
  indirizzo_intervento: z.string().min(1, "Indirizzo dell'intervento è richiesto."),
  giorno_preferito: z.string().min(1, "Giorno preferito è richiesto."),
  fascia_oraria: z.string().min(1, "Fascia oraria è richiesta."),
  tipo_servizio: z.string().min(1, "Tipo di servizio è richiesto."),
  note_aggiuntive: z.string().optional(),
});

type RichiediInterventoFormValues = z.infer<typeof RichiediInterventoFormSchema>;

export interface RichiediInterventoFormProps {
  id_azienda: string | null; // Può essere null se non trovato
  companyDisplayName: string;
}

export function RichiediInterventoForm({ id_azienda, companyDisplayName }: RichiediInterventoFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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

  async function onSubmit(data: RichiediInterventoFormValues) {
    setIsLoading(true);
    console.log("RichiediInterventoForm onSubmit data:", data);

    if (!id_azienda) {
        toast({
            title: "Errore Invio Richiesta",
            description: "ID Azienda non disponibile. Impossibile inviare la richiesta.",
            variant: "destructive",
        });
        setIsLoading(false);
        return;
    }
    
    try {
        const docData = {
            ...data,
            id_azienda: id_azienda, // Assicura che l'id_azienda corretto (dalle props) sia usato
            stato: "in attesa", // tutto minuscolo come da standard
            created_at: serverTimestamp(),
        };
        console.log("Dati da salvare in Firestore:", docData);

        await addDoc(collection(db, "richieste_clienti"), docData);

        toast({
            title: "Richiesta Inviata!",
            description: "La tua richiesta è stata inviata con successo. Verrai ricontattato al più presto.",
        });
        form.reset();
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
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-3xl font-bold text-primary">Richiedi un Intervento</CardTitle>
        <CardDescription className="text-center text-muted-foreground">
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
                  <FormLabel>Nome e Cognome <span className="text-destructive">*</span></FormLabel>
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

            <div className="grid md:grid-cols-2 gap-x-6 gap-y-6">
              <FormField
                control={form.control}
                name="telefono_cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero di Telefono <span className="text-destructive">*</span></FormLabel>
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
              <FormField
                control={form.control}
                name="indirizzo_intervento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo dell'Intervento <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Es: Via Roma 1, Milano" {...field} className="pl-10" disabled={isLoading}/>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-x-6 gap-y-6">
              <FormField
                control={form.control}
                name="giorno_preferito"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giorno Preferito <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={isLoading}>
                      <FormControl>
                        <div className="relative">
                            <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <SelectTrigger className="pl-10">
                                <SelectValue placeholder="Seleziona un giorno..." />
                            </SelectTrigger>
                        </div>
                      </FormControl>
                      <SelectContent>
                        {["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"].map(day => (
                          <SelectItem key={day} value={day.toLowerCase()}>{day}</SelectItem>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={isLoading}>
                      <FormControl>
                         <div className="relative">
                            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <SelectTrigger className="pl-10">
                                <SelectValue placeholder="Seleziona una fascia oraria..." />
                            </SelectTrigger>
                        </div>
                      </FormControl>
                      <SelectContent>
                        {["Mattina (9-13)", "Pomeriggio (14-18)", "Sera (dopo le 18)"].map(slot => (
                           <SelectItem key={slot} value={slot.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '')}>{slot}</SelectItem>
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
                        placeholder="Fornisci dettagli aggiuntivi sulla richiesta, modello dell'apparecchio, urgenza, ecc."
                        className="resize-none pl-10 pt-2"
                        {...field}
                        disabled={isLoading}
                        />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Invia Richiesta di Intervento"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
