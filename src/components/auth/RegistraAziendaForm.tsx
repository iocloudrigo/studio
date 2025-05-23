
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Link as LinkIcon, Mail, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const generateSlug = (name: string): string => {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '') 
    .replace(/--+/g, '-');
};

const RegistraAziendaFormSchema = z.object({
  companyName: z.string().min(2, { message: "Il nome dell'azienda deve contenere almeno 2 caratteri." }),
  slug: z.string()
          .min(1, { message: "Lo slug è richiesto." })
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Slug non valido. Usa solo lettere minuscole, numeri e trattini singoli, senza trattini all'inizio o alla fine." })
          .refine(s => !s.startsWith('-') && !s.endsWith('-'), {message: "Lo slug non può iniziare o finire con un trattino."}),
  email: z.string().email(),
});

type RegistraAziendaFormValues = z.infer<typeof RegistraAziendaFormSchema>;

interface RegistraAziendaFormProps {
  user: FirebaseUser;
}

export function RegistraAziendaForm({ user }: RegistraAziendaFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegistraAziendaFormValues>({
    resolver: zodResolver(RegistraAziendaFormSchema),
    defaultValues: {
      companyName: "",
      slug: "",
      email: user.email || "",
    },
  });

  const companyNameValue = form.watch("companyName");

  useEffect(() => {
    form.setValue("slug", generateSlug(companyNameValue), { shouldValidate: true });
  }, [companyNameValue, form]);

  async function onSubmit(data: RegistraAziendaFormValues) {
    setIsLoading(true);

    // Ri-genera lo slug dal campo slug per assicurare la formattazione finale corretta
    const finalSlug = generateSlug(data.slug);
    if (finalSlug !== data.slug) { // Se lo slug generato è diverso da quello nel form (es. l'utente ha messo maiuscole)
      form.setValue("slug", finalSlug, { shouldValidate: true }); // Aggiorna il campo e rivalida
    }
    
    // Ricontrolla la validità dello slug dopo la normalizzazione finale
    const validationResult = RegistraAziendaFormSchema.shape.slug.safeParse(finalSlug);
    if (!validationResult.success) {
        form.setError("slug", { type: "manual", message: validationResult.error.errors[0]?.message || "Slug non valido dopo la normalizzazione." });
        setIsLoading(false);
        return;
    }


    try {
      const aziendeRef = collection(db, "aziende");
      const q = query(aziendeRef, where("slug", "==", finalSlug));
      const querySnapshot = await getDocs(q);

      let slugIsTakenByAnotherUser = false;
      if (!querySnapshot.empty) {
        querySnapshot.forEach((docSnap) => {
          if (docSnap.id !== user.uid) { // Lo slug esiste ed appartiene ad un altro utente
            slugIsTakenByAnotherUser = true;
          }
        });
      }

      if (slugIsTakenByAnotherUser) {
        form.setError("slug", { type: "manual", message: "Questo slug è già utilizzato da un'altra azienda. Scegline uno diverso." });
        setIsLoading(false);
        return;
      }

      const companyDocRef = doc(db, "aziende", user.uid);
      await setDoc(companyDocRef, {
        nome: data.companyName,
        slug: finalSlug,
        email_admin: user.email,
        uid_admin: user.uid,
        data_creazione: serverTimestamp(),
        metodo_registrazione: "google_plus_form_completion",
      });
      
      toast({
        title: "Azienda Registrata Correttamente!",
        description: "La tua azienda è stata configurata con successo. Verrai reindirizzato alla dashboard.",
      });
      router.push('/dashboard');

    } catch (error: any) {
      console.error("Errore durante la registrazione dell'azienda:", error);
      toast({
        title: "Errore di Registrazione",
        description: "Si è verificato un errore imprevisto durante il salvataggio dei dati della tua azienda. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Completa la Registrazione della Tua Azienda</CardTitle>
        <CardDescription>
          Quasi fatto! Inserisci i dettagli mancanti per la tua azienda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Amministratore (Account Google)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input {...field} className="pl-10 bg-muted/50" readOnly disabled />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Azienda</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Es: Idraulica Rossi S.R.L." {...field} className="pl-10" disabled={isLoading} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug Pubblico Azienda</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="es: idraulica-rossi" {...field} className="pl-10" disabled={isLoading} />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Verrà usato nell'URL pubblico per le richieste. Esempio: .../richiedi-intervento?azienda=<strong>{field.value || "tuo-slug"}</strong>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salva e Accedi alla Dashboard"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
