
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
import { Briefcase, Link as LinkIcon, Mail, Loader2, Phone, Building } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const generateSlug = (name: string): string => {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '') 
    .replace(/--+/g, '-');
};

const activitySectorOptions = [
  { value: "", label: "Non specificato" },
  { value: "Elettricista", label: "Elettricista" },
  { value: "Idraulico", label: "Idraulico" },
  { value: "Installatore", label: "Installatore" },
  { value: "Multiservizi", label: "Multiservizi" },
];

const RegistraAziendaFormSchema = z.object({
  companyName: z.string().min(2, { message: "Il nome dell'azienda deve contenere almeno 2 caratteri." }),
  slug: z.string()
          .min(1, { message: "Lo slug è richiesto." })
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Slug non valido. Usa solo lettere minuscole, numeri e trattini singoli, senza trattini all'inizio o alla fine." })
          .refine(s => !s.startsWith('-') && !s.endsWith('-'), {message: "Lo slug non può iniziare o finire con un trattino."}),
  email: z.string().email(), // Readonly, prefilled
  companyPhone: z.string().optional(),
  activitySector: z.string().optional(),
  companyCity: z.string().optional(),
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
      companyPhone: "",
      activitySector: "",
      companyCity: "",
    },
  });

  const companyNameValue = form.watch("companyName");
  const slugValue = form.watch("slug");

  useEffect(() => {
    if (form.formState.dirtyFields.slug) return; // Non sovrascrivere se l'utente ha modificato manualmente lo slug
    form.setValue("slug", generateSlug(companyNameValue), { shouldValidate: true });
  }, [companyNameValue, form]);

  async function onSubmit(data: RegistraAziendaFormValues) {
    setIsLoading(true);

    const finalSlug = generateSlug(data.slug); // Normalizza lo slug prima di usarlo
    if (finalSlug !== data.slug) {
      form.setValue("slug", finalSlug, { shouldValidate: true });
    }
    
    const slugValidationResult = RegistraAziendaFormSchema.shape.slug.safeParse(finalSlug);
    if (!slugValidationResult.success) {
        form.setError("slug", { type: "manual", message: slugValidationResult.error.errors[0]?.message || "Slug non valido dopo la normalizzazione." });
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
          if (docSnap.id !== user.uid) {
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
      
      const dataToSave: any = {
        nome: data.companyName,
        slug: finalSlug,
        email_admin: user.email,
        uid_admin: user.uid,
        data_creazione: serverTimestamp(),
        metodo_registrazione: "form_completion_post_auth", // o specifico se da Google
      };

      if (data.companyPhone && data.companyPhone.trim() !== '') {
        dataToSave.telefono_contatto = data.companyPhone.trim();
      }
      if (data.activitySector && data.activitySector.trim() !== '') {
        dataToSave.settore_attivita = data.activitySector;
      }
      if (data.companyCity && data.companyCity.trim() !== '') {
        dataToSave.sede_citta = data.companyCity.trim();
      }

      await setDoc(companyDocRef, dataToSave);
      
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
                  <FormLabel>Email Amministratore</FormLabel>
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
                      <Input placeholder="es: idraulica-rossi" {...field} className="pl-10" disabled={isLoading} 
                        onChange={(e) => {
                          form.setValue('slug', e.target.value, {shouldValidate: true});
                          form.clearErrors('slug'); // Clear previous validation errors on manual edit
                          if (!form.formState.dirtyFields.slug) {
                            form.control.set आमच्या('slug', true); // Mark as dirty manually if it's the first manual change
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Sarà usato nell'URL pubblico per le richieste clienti.
                  </FormDescription>
                   <p className="text-xs text-muted-foreground mt-1">Il tuo link: <code className="font-semibold text-primary text-xs break-all">/richiedi-intervento?azienda={slugValue || "..."}</code></p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono Contatto Aziendale <span className="text-xs text-muted-foreground">(Opzionale)</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="tel" placeholder="Es: 02 1234567" {...field} className="pl-10" disabled={isLoading} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activitySector"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Settore Attività <span className="text-xs text-muted-foreground">(Opzionale)</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <div className="relative">
                         <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Seleziona un settore..." />
                        </SelectTrigger>
                      </div>
                    </FormControl>
                    <SelectContent>
                      {activitySectorOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="companyCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sede (Città) <span className="text-xs text-muted-foreground">(Opzionale)</span></FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Es: Milano" {...field} className="pl-10" disabled={isLoading} />
                    </div>
                  </FormControl>
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


    