
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
import { Loader2, User, Phone, MapPin, CalendarDays, Clock, StickyNote, Wrench } from "lucide-react"; // Removed Tool, kept Wrench as potential replacement

// Firebase imports
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const giorniSettimana = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"] as const;
const fasceOrarie = ["Mattina (9:00-13:00)", "Pomeriggio (14:00-18:00)", "Sera (18:00-20:00)"] as const;

const RichiediInterventoFormSchema = z.object({
  id_azienda: z.string().min(1, "ID Azienda è obbligatorio."),
  nomeCognome: z.string().min(2, { message: "Nome e Cognome sono obbligatori." }),
  telefono: z.string().min(5, { message: "Numero di telefono è obbligatorio." }), // Basic validation
  indirizzo: z.string().min(5, { message: "Indirizzo è obbligatorio." }),
  giornoPreferito: z.enum(giorniSettimana, { errorMap: () => ({ message: "Seleziona un giorno."}) }),
  fasciaOraria: z.enum(fasceOrarie, { errorMap: () => ({ message: "Seleziona una fascia oraria."}) }),
  tipoServizio: z.string().min(3, { message: "Il tipo di servizio è obbligatorio." }),
  noteAggiuntive: z.string().optional(),
});

type RichiediInterventoFormValues = z.infer<typeof RichiediInterventoFormSchema>;

interface RichiediInterventoFormProps {
  id_azienda: string;
  companyDisplayName: string;
}

export function RichiediInterventoForm({ id_azienda, companyDisplayName }: RichiediInterventoFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<RichiediInterventoFormValues>({
    resolver: zodResolver(RichiediInterventoFormSchema),
    defaultValues: {
      id_azienda: id_azienda,
      nomeCognome: "",
      telefono: "",
      indirizzo: "",
      tipoServizio: "",
      noteAggiuntive: "",
    },
  });

  async function onSubmit(data: RichiediInterventoFormValues) {
    setIsLoading(true);
    try {
      await addDoc(collection(db, "richieste_clienti"), {
        ...data,
        stato: "In attesa", // Default status
        created_at: serverTimestamp(),
      });
      
      toast({
        title: "Richiesta Inviata!",
        description: "La tua richiesta è stata inviata con successo. Verrai ricontattato al più presto.",
      });
      setIsSubmitted(true); // Set submitted state to true to show confirmation message
      // form.reset(); // Optionally reset form
    } catch (error) {
      console.error("Errore nell'invio della richiesta:", error);
      toast({
        title: "Errore Invio Richiesta",
        description: "Si è verificato un errore durante l'invio della tua richiesta. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl text-primary">Richiesta Inviata con Successo!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            Grazie per averci contattato. La tua richiesta è stata ricevuta e verrai ricontattato al più presto.
          </p>
          <CalendarDays className="mx-auto h-16 w-16 text-primary opacity-70 mb-4" />
           <Button onClick={() => {
             setIsSubmitted(false);
             form.reset({ id_azienda: id_azienda, nomeCognome: "", telefono: "", indirizzo: "", tipoServizio: "", noteAggiuntive: "" });
            }}
            variant="outline"
            >
            Invia un'altra richiesta
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Richiedi un Intervento a {companyDisplayName}</CardTitle>
        <CardDescription>
          Compila i campi sottostanti per inviare la tua richiesta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <input type="hidden" {...form.register("id_azienda")} />
            
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
                      <Input placeholder="3331234567" {...field} className="pl-10" disabled={isLoading} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                                <SelectValue placeholder="Seleziona una fascia" />
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
                      <Input placeholder="Es. Riparazione perdita, Installazione caldaia" {...field} className="pl-10" disabled={isLoading} />
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
                        placeholder="Descrivi qui eventuali dettagli aggiuntivi..."
                        className="resize-none pl-10"
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

    