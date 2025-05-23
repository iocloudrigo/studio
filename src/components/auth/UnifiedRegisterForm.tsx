
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Loader2, Briefcase, Link as LinkIcon, Building, Phone, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { type User as FirebaseUser, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const generateSlug = (name: string): string => {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars except -
    .replace(/--+/g, '-'); // Replace multiple - with single -
};

const unifiedRegisterFormSchemaBase = {
  companyName: z.string().min(2, { message: "Il nome dell'azienda deve contenere almeno 2 caratteri." }),
  slug: z.string()
    .min(1, { message: "Lo slug è richiesto." })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Slug non valido. Usa solo lettere minuscole, numeri e trattini singoli." })
    .refine(s => !s.startsWith('-') && !s.endsWith('-'), { message: "Lo slug non può iniziare o finire con un trattino." }),
  companyPhone: z.string().optional(),
  activitySector: z.string().optional(),
  companyCity: z.string().optional(),
};

const UnifiedRegisterFormSchema = z.object({
  email: z.string().email({ message: "Indirizzo email non valido." }),
  password: z.string().min(6, { message: "La password deve contenere almeno 6 caratteri." }).optional(),
  confirmPassword: z.string().optional(),
  ...unifiedRegisterFormSchemaBase,
}).refine(data => {
  // Password confirmation is only required if password is provided (i.e., not completing profile for an existing user)
  if (data.password) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Le password non coincidono.",
  path: ["confirmPassword"],
});

const UnifiedRegisterFormSchemaExistingUser = z.object({
  email: z.string().email(), // Will be prefilled
  ...unifiedRegisterFormSchemaBase,
});


type UnifiedRegisterFormValues = z.infer<typeof UnifiedRegisterFormSchema>;

interface UnifiedRegisterFormProps {
  currentUser: FirebaseUser | null;
}

const activitySectorOptions = [
  { value: "unspecified", label: "Non specificato" },
  { value: "elettricista", label: "Elettricista" },
  { value: "idraulico", label: "Idraulico" },
  { value: "installatore", label: "Installatore" },
  { value: "multiservizi", label: "Multiservizi" },
  { value: "altro", label: "Altro" },
];

export function UnifiedRegisterForm({ currentUser }: UnifiedRegisterFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const form = useForm<UnifiedRegisterFormValues>({
    resolver: zodResolver(currentUser ? UnifiedRegisterFormSchemaExistingUser : UnifiedRegisterFormSchema),
    defaultValues: {
      email: currentUser?.email || "",
      password: "",
      confirmPassword: "",
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
    if (currentUser) {
      form.setValue("email", currentUser.email || "");
    }
  }, [currentUser, form]);

  useEffect(() => {
    if (!isSlugManuallyEdited && companyNameValue) {
      const newSlug = generateSlug(companyNameValue);
      if (form.getValues("slug") !== newSlug) {
        form.setValue("slug", newSlug, { shouldValidate: true });
      }
    }
  }, [companyNameValue, form, isSlugManuallyEdited]);

  const onSubmit = async (data: UnifiedRegisterFormValues) => {
    setIsLoading(true);

    let userIdToUse: string;
    let userEmailToUse: string;

    if (currentUser) { // Completing profile for an existing (e.g. Google) user
      userIdToUse = currentUser.uid;
      userEmailToUse = currentUser.email || data.email; // Fallback just in case
    } else { // New email/password registration
      if (!data.password) {
        form.setError("password", {type: "manual", message: "La password è richiesta."});
        setIsLoading(false);
        return;
      }
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        userIdToUse = userCredential.user.uid;
        userEmailToUse = userCredential.user.email!;
      } catch (error: any) {
        console.error("Errore creazione utente:", error);
        let errorMessage = "Errore durante la registrazione. Riprova.";
        if (error.code === "auth/email-already-in-use") {
          errorMessage = "L'indirizzo email è già in uso.";
        } else if (error.code === "auth/weak-password") {
          errorMessage = "La password è troppo debole.";
        } else if (error.code === "auth/invalid-email") {
          errorMessage = "L'indirizzo email non è valido.";
        }
        toast({ title: "Errore Registrazione Utente", description: errorMessage, variant: "destructive" });
        setIsLoading(false);
        return;
      }
    }

    // Proceed with company registration
    const finalSlug = generateSlug(data.slug);
     if (finalSlug !== data.slug) {
        form.setValue("slug", finalSlug, { shouldValidate: true });
    }
    const slugValidationResult = (currentUser ? UnifiedRegisterFormSchemaExistingUser : UnifiedRegisterFormSchema).shape.slug.safeParse(finalSlug);
    if (!slugValidationResult.success) {
        form.setError("slug", { type: "manual", message: slugValidationResult.error.errors[0]?.message || "Slug non valido dopo la normalizzazione." });
        setIsLoading(false);
        return;
    }

    try {
      const aziendeRef = collection(db, "aziende");
      const q = query(aziendeRef, where("slug", "==", finalSlug));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        let slugTakenByOther = false;
        querySnapshot.forEach(docSnap => {
            if (docSnap.id !== userIdToUse) {
                slugTakenByOther = true;
            }
        });
        if (slugTakenByOther) {
            form.setError("slug", { type: "manual", message: "Questo slug è già utilizzato. Scegline uno diverso." });
            setIsLoading(false);
            return;
        }
      }

      const companyDocRef = doc(db, "aziende", userIdToUse);
      const companyDataToSave = {
        uid_admin: userIdToUse,
        email_admin: userEmailToUse,
        nome: data.companyName,
        slug: finalSlug,
        telefono_contatto: data.companyPhone || null,
        settore_attivita: data.activitySector === "unspecified" ? null : data.activitySector || null,
        sede_citta: data.companyCity || null,
        data_creazione: serverTimestamp(),
      };

      await setDoc(companyDocRef, companyDataToSave);

      toast({
        title: "Registrazione Completata!",
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

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">
          {currentUser ? "Completa la Registrazione della Tua Azienda" : "Crea il Tuo Account e Registra l'Azienda"}
        </CardTitle>
        <CardDescription>
          {currentUser ? "Inserisci i dettagli della tua azienda." : "Compila i campi per iniziare."}
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="admin@azienda.com" {...field} className="pl-10" readOnly={!!currentUser} disabled={isLoading || !!currentUser} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!currentUser && (
              <>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input type="password" placeholder="••••••••" {...field} className="pl-10" disabled={isLoading} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conferma Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input type="password" placeholder="••••••••" {...field} className="pl-10" disabled={isLoading} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

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
                          field.onChange(manualSlug);
                          setIsSlugManuallyEdited(true);
                          form.clearErrors('slug');
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    L'URL pubblico per ricevere richieste clienti sarà:
                    <code className="font-semibold text-primary text-xs break-all ml-1">
                      /richiedi-intervento?azienda={slugValue || "..."}
                    </code>
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
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ""} // Ensure value is controlled and handles undefined
                    disabled={isLoading}
                  >
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
                  <FormLabel>Sede Operativa (Città) <span className="text-xs text-muted-foreground">(Opzionale)</span></FormLabel>
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
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (currentUser ? "Salva Azienda e Vai alla Dashboard" : "Registrati e Vai alla Dashboard")}
            </Button>
          </form>
        </Form>
      </CardContent>
      {!currentUser && (
        <CardFooter className="flex flex-col items-center space-y-2">
            <p className="text-sm text-muted-foreground">
                Hai già un account?{' '}
                <Button variant="link" asChild className="text-accent p-0 h-auto">
                <Link href="/">
                    Accedi
                </Link>
                </Button>
            </p>
        </CardFooter>
      )}
    </Card>
  );
}
