
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
import { Mail, Lock, Loader2, Briefcase, Link as LinkIcon, Building, Phone } from "lucide-react";
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
    .replace(/\s+/g, '-') 
    .replace(/[^\w-]+/g, '') 
    .replace(/--+/g, '-'); 
};

// Base schema for company details, used by both schemas below
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

// Schema for new user registration (email, password + company details)
const UnifiedRegisterFormSchemaNewUser = z.object({
  email: z.string().email({ message: "Indirizzo email non valido." }),
  password: z.string().min(6, { message: "La password deve contenere almeno 6 caratteri." }),
  confirmPassword: z.string(),
  ...unifiedRegisterFormSchemaBase,
}).refine(data => data.password === data.confirmPassword, {
  message: "Le password non coincidono.",
  path: ["confirmPassword"],
});

// Schema for existing user completing company profile (e.g., after Google sign-in)
const UnifiedRegisterFormSchemaExistingUser = z.object({
  email: z.string().email(), // Will be prefilled and readonly
  ...unifiedRegisterFormSchemaBase,
});


type UnifiedRegisterFormValues = z.infer<typeof UnifiedRegisterFormSchemaNewUser>; // Use the more comprehensive type

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
    resolver: zodResolver(currentUser ? UnifiedRegisterFormSchemaExistingUser : UnifiedRegisterFormSchemaNewUser),
    defaultValues: {
      email: currentUser?.email || "",
      password: "",
      confirmPassword: "",
      companyName: "",
      slug: "",
      companyPhone: "",
      activitySector: "unspecified",
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
    if (!isSlugManuallyEdited && companyNameValue && !form.formState.dirtyFields.slug) {
      const newSlug = generateSlug(companyNameValue);
      if (form.getValues("slug") !== newSlug) {
        form.setValue("slug", newSlug, { shouldValidate: true });
      }
    }
  }, [companyNameValue, form, isSlugManuallyEdited]);

  const onSubmit = async (data: UnifiedRegisterFormValues) => {
    console.log("UnifiedRegisterForm onSubmit triggered. Data:", data);
    setIsLoading(true);

    let userIdToUse: string;
    let userEmailToUse: string;

    if (currentUser) {
      console.log("Completing profile for existing user:", currentUser.uid);
      userIdToUse = currentUser.uid;
      userEmailToUse = currentUser.email || data.email; // Fallback, though email should be from currentUser
    } else {
      // New user registration with email/password
      console.log("Attempting new user registration with email:", data.email);
      if (!data.password) { // Should be caught by Zod, but defensive check
        form.setError("password", {type: "manual", message: "La password è richiesta."});
        setIsLoading(false);
        console.error("Password field is empty for new user registration.");
        return;
      }
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        userIdToUse = userCredential.user.uid;
        userEmailToUse = userCredential.user.email!; // Email from created user is most reliable
        console.log("New user created successfully:", userIdToUse);
      } catch (error: any) {
        console.error("Errore creazione utente Firebase Auth:", error);
        let errorMessage = "Errore durante la creazione dell'utente. Riprova.";
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
    
    console.log("User ID for Firestore:", userIdToUse, "User Email:", userEmailToUse);

    const finalSlug = generateSlug(data.slug); // Normalize the slug from form input
    console.log("Normalized slug for processing:", finalSlug);
    if (finalSlug !== data.slug) {
        form.setValue("slug", finalSlug, { shouldValidate: true }); // Update form if different
    }

    // Validate the normalized slug again with the schema
    const currentSchema = currentUser ? UnifiedRegisterFormSchemaExistingUser : UnifiedRegisterFormSchemaNewUser;
    const slugValidationResult = currentSchema.shape.slug.safeParse(finalSlug);

    if (!slugValidationResult.success) {
        console.error("Slug validation failed after normalization:", slugValidationResult.error.toString());
        form.setError("slug", { type: "manual", message: slugValidationResult.error.errors[0]?.message || "Slug non valido dopo la normalizzazione." });
        setIsLoading(false);
        return;
    }
    console.log("Slug format validated successfully after normalization.");

    try {
      // Check slug uniqueness
      const aziendeRef = collection(db, "aziende");
      const q = query(aziendeRef, where("slug", "==", finalSlug));
      console.log("Querying Firestore for slug uniqueness:", finalSlug);
      const querySnapshot = await getDocs(q);
      
      let isSlugTaken = false;
      if (!querySnapshot.empty) {
        querySnapshot.forEach((docSnap) => {
          // A slug is taken if it exists AND the document ID is NOT the current user's ID.
          // This handles cases where a user might be re-attempting registration after partial failure
          // or if there's a unique constraint on slug across all companies.
          // For a brand new company for this userIdToUse, any existing slug is a conflict.
          if (docSnap.id !== userIdToUse) { // If slug exists under a DIFFERENT company
            isSlugTaken = true;
          }
        });
      }
      
      // If we are creating a new company profile for userIdToUse,
      // and the slug is found in the querySnapshot, and it's NOT under this userIdToUse, then it's taken.
      // If querySnapshot is not empty AND the found doc's ID is NOT userIdToUse, it's a conflict.
      // If querySnapshot is not empty AND the found doc's ID IS userIdToUse, it means this user *already has this company registered*
      // in which case AuthRedirectHandler should have prevented them from reaching this form in this state.
      // So, for a clean registration, if querySnapshot is not empty, it's a problem.
      
      if (!querySnapshot.empty) {
          // Check if the slug belongs to a DIFFERENT user.
          const conflictingDoc = querySnapshot.docs.find(doc => doc.id !== userIdToUse);
          if (conflictingDoc) {
            isSlugTaken = true;
            console.warn("Slug is taken by another company. Firestore doc ID:", conflictingDoc.id);
          } else {
             // Slug belongs to the current user, this implies company already exists.
             // AuthRedirectHandler should ideally prevent this state.
             // For robustness, one might redirect or show error.
             // For now, we treat it as if the slug is effectively "taken" for this new registration flow.
             console.warn("Slug found, but it seems to belong to the current user. This state should ideally be handled by AuthRedirectHandler.");
             // Let's assume for this specific form, any existing slug is an issue unless it's an update flow (which this isn't)
             isSlugTaken = true; 
          }
      }


      if (isSlugTaken) {
        form.setError("slug", { type: "manual", message: "Questo slug è già utilizzato da un'altra azienda. Scegline uno diverso." });
        setIsLoading(false);
        console.error("Slug conflict detected.");
        return;
      }
      console.log("Slug is unique.");

      // Create company document in Firestore
      const companyDocRef = doc(db, "aziende", userIdToUse); // Use user's UID as company document ID
      const companyDataToSave = {
        uid_admin: userIdToUse,
        email_admin: userEmailToUse,
        nome: data.companyName,
        slug: finalSlug,
        telefono_contatto: data.companyPhone || null,
        settore_attivita: data.activitySector === "unspecified" || !data.activitySector ? null : data.activitySector,
        sede_citta: data.companyCity || null,
        data_creazione: serverTimestamp(),
      };

      console.log("Attempting to save company data to Firestore:", companyDataToSave);
      await setDoc(companyDocRef, companyDataToSave);
      console.log("Company data saved successfully to Firestore for document ID:", userIdToUse);

      toast({
        title: "Registrazione Completata!",
        description: "La tua azienda è stata configurata. Verrai reindirizzato alla dashboard.",
      });
      router.push('/dashboard');
      console.log("Redirecting to /dashboard.");

    } catch (error: any) {
      console.error("Errore durante la verifica dello slug o salvataggio dati azienda in Firestore:", error);
      toast({
        title: "Errore Registrazione Azienda",
        description: `Si è verificato un errore: ${error.message || "Controlla i permessi di Firestore o i dati inseriti."}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log("onSubmit finished. isLoading set to false.");
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
                      <Input 
                        placeholder="admin@azienda.com" 
                        {...field} 
                        className="pl-10" 
                        readOnly={!!currentUser} 
                        disabled={isLoading || !!currentUser} 
                      />
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
                        onBlur={(e) => { // Normalize on blur if manually edited
                            const manualSlug = generateSlug(e.target.value);
                            if (e.target.value !== manualSlug) {
                                field.onChange(manualSlug);
                            }
                            setIsSlugManuallyEdited(true); // Mark as edited once user interacts
                            field.onBlur(); // Call original onBlur
                        }}
                        onChange={(e) => {
                            field.onChange(e.target.value); // Allow typing freely
                            // Consider setting isSlugManuallyEdited to true on first change if not auto-generated
                            if (!isSlugManuallyEdited && e.target.value !== generateSlug(companyNameValue) ) {
                                setIsSlugManuallyEdited(true);
                            }
                             form.clearErrors('slug'); // Clear errors on change
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    L'URL pubblico per ricevere richieste clienti sarà:
                    <code className="font-semibold text-primary text-xs break-all ml-1">
                      /richiedi-intervento?azienda={generateSlug(slugValue) || "..."}
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
                      <Input type="tel" placeholder="Es: 021234567" {...field} className="pl-10" disabled={isLoading} value={field.value || ""} />
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
                    value={field.value || "unspecified"} 
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
                      <Input placeholder="Es: Milano" {...field} className="pl-10" disabled={isLoading} value={field.value || ""} />
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

    