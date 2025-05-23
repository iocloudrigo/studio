
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Mail, Loader2, Link as LinkIcon, Building, Phone, User, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase"; // auth is not directly needed here, user comes via prop

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
  email: z.string().email(), // Will be prefilled, readonly
  companyName: z.string().min(2, { message: "Il nome dell'azienda deve contenere almeno 2 caratteri." }),
  slug: z.string()
    .min(1, { message: "Lo slug è richiesto." })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Slug non valido. Usa solo lettere minuscole, numeri e trattini singoli." })
    .refine(s => !s.startsWith('-') && !s.endsWith('-'), { message: "Lo slug non può iniziare o finire con un trattino." }),
  companyPhone: z.string().optional(),
  activitySector: z.string().optional(),
  companyCity: z.string().optional(),
});

type RegistraAziendaFormValues = z.infer<typeof RegistraAziendaFormSchema>;

interface RegistraAziendaFormProps {
  currentUser: FirebaseUser;
}

const activitySectorOptions = [
  { value: "", label: "Non specificato" },
  { value: "elettricista", label: "Elettricista" },
  { value: "idraulico", label: "Idraulico" },
  { value: "installatore", label: "Installatore" },
  { value: "multiservizi", label: "Multiservizi" },
  { value: "altro", label: "Altro" },
];


export function RegistraAziendaForm({ currentUser }: RegistraAziendaFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const form = useForm<RegistraAziendaFormValues>({
    resolver: zodResolver(RegistraAziendaFormSchema),
    defaultValues: {
      email: currentUser?.email || "",
      companyName: "",
      slug: "",
      companyPhone: "",
      activitySector: "",
      companyCity: "",
    },
  });

  const companyNameValue = form.watch("companyName");
  const slugValue = form.watch("slug");

  useEffect(() => {
    if (!isSlugManuallyEdited && companyNameValue) {
      const newSlug = generateSlug(companyNameValue);
      if (form.getValues("slug") !== newSlug) {
        form.setValue("slug", newSlug, { shouldValidate: true });
      }
    }
  }, [companyNameValue, form, isSlugManuallyEdited]);


  const onSubmit = async (data: RegistraAziendaFormValues) => {
    setIsLoading(true);
    if (!currentUser) {
      toast({ title: "Errore", description: "Utente non autenticato.", variant: "destructive" });
      setIsLoading(false);
      router.push('/'); // Should not happen if page guards work
      return;
    }

    const finalSlug = generateSlug(data.slug); // Ensure slug is always normalized
    if (finalSlug !== data.slug) { // If normalization changed it, update form for UX
        form.setValue("slug", finalSlug, { shouldValidate: true });
    }
    
    // Validate normalized slug format again (even if regex in Zod handles most cases)
    const slugValidationResult = RegistraAziendaFormSchema.shape.slug.safeParse(finalSlug);
    if (!slugValidationResult.success) {
        form.setError("slug", { type: "manual", message: slugValidationResult.error.errors[0]?.message || "Slug non valido dopo la normalizzazione." });
        setIsLoading(false);
        return;
    }


    try {
      // Check slug uniqueness
      const aziendeRef = collection(db, "aziende");
      const q = query(aziendeRef, where("slug", "==", finalSlug));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Check if the slug is taken by another company. 
        // If it's taken by the current user (somehow, e.g. re-submission), it would be an update, not a new registration.
        // But this form is for new company registration, so any existing slug is a conflict.
        let slugTakenByOther = false;
        querySnapshot.forEach(docSnap => {
            if (docSnap.id !== currentUser.uid) { // If a doc with this slug exists and it's NOT for the current user
                slugTakenByOther = true;
            }
        });

        if (slugTakenByOther) {
            form.setError("slug", { type: "manual", message: "Questo slug è già utilizzato. Scegline uno diverso." });
            setIsLoading(false);
            return;
        }
        // If the slug is taken by the current user's company doc, it means the company is already registered.
        // This scenario should ideally be caught by the page loader for /registra-azienda.
        // If we reach here and the slug matches currentUser.uid's company, it's more of an update scenario (not covered by this form).
        // For safety, if the slug is taken by the current user's company, we can inform them.
        const currentUserCompanyDoc = querySnapshot.docs.find(doc => doc.id === currentUser.uid);
        if (currentUserCompanyDoc) {
             toast({ title: "Informazione", description: "Sembra che tu abbia già un'azienda registrata con uno slug simile.", variant: "default" });
             router.push('/dashboard');
             setIsLoading(false);
             return;
        }
      }


      // Create company document in Firestore
      const companyDocRef = doc(db, "aziende", currentUser.uid); // Use user's UID as document ID
      const companyDataToSave = {
        uid_admin: currentUser.uid,
        email_admin: currentUser.email, // Already in data.email from form
        nome: data.companyName,
        slug: finalSlug,
        telefono_contatto: data.companyPhone || null,
        settore_attivita: data.activitySector || null,
        sede_citta: data.companyCity || null,
        data_creazione: serverTimestamp(),
        // Add any other fields from 'data' object that are relevant for 'aziende' collection
      };

      await setDoc(companyDocRef, companyDataToSave);

      toast({
        title: "Azienda Registrata!",
        description: "La tua azienda è stata configurata. Verrai reindirizzato alla dashboard.",
      });
      router.push('/dashboard');

    } catch (error: any) {
      console.error("Errore registrazione azienda:", error);
      toast({
        title: "Errore Registrazione Azienda",
        description: error.message || "Si è verificato un errore imprevisto.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return <p>Caricamento dati utente...</p>; // Should be handled by page loader
  }

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Registra la Tua Azienda</CardTitle>
        <CardDescription>
          Completa i dettagli qui sotto per configurare la tua azienda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Amministratore</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input {...field} className="pl-10" readOnly disabled />
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
                      <Input
                        placeholder="es: idraulica-rossi"
                        {...field}
                        className="pl-10"
                        disabled={isLoading}
                        onChange={(e) => {
                          const manualSlug = e.target.value;
                          field.onChange(manualSlug); // Update RHF's state
                          setIsSlugManuallyEdited(true); // Mark as manually edited
                          form.clearErrors('slug'); // Clear previous validation errors
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Il link per le richieste clienti sarà: 
                    <code className="font-semibold text-primary text-xs break-all"> /richiedi-intervento?azienda={slugValue || "..."}</code>
                  </FormDescription>
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
                      <Input type="tel" placeholder="Es: 021234567" {...field} className="pl-10" disabled={isLoading} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={isLoading}>
                    <FormControl>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <SelectTrigger className="pl-10">
                                <SelectValue placeholder="Seleziona un settore..." />
                            </SelectTrigger>
                        </div>
                    </FormControl>
                    <SelectContent>
                      {activitySectorOptions.map(option => (
                        <SelectItem key={option.value} value={option.value === "" ? " " : option.value}> 
                          {/* Using " " for empty string value to avoid Radix error, will be saved as null/empty string */}
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
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salva Azienda e Vai alla Dashboard"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
