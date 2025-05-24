
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
import { Mail, Lock, Loader2, Briefcase, Link as LinkIcon, Building, Phone, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, updateProfile, type User as FirebaseUser } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where, addDoc } from "firebase/firestore";
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

const unifiedRegisterFormSchema = z.object({
  adminName: z.string().min(2, { message: "Il Tuo Nome e Cognome è richiesto." }),
  email: z.string().email({ message: "Indirizzo email non valido." }),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  companyName: z.string().min(2, { message: "Il nome dell'azienda deve contenere almeno 2 caratteri." }),
  slug: z.string()
    .min(1, { message: "Lo slug è richiesto." })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Slug non valido. Usa solo lettere minuscole, numeri e trattini singoli." })
    .refine(s => !s.startsWith('-') && !s.endsWith('-'), { message: "Lo slug non può iniziare o finire con un trattino." }),
  companyPhone: z.string().optional(),
  activitySector: z.string().optional(),
  companyCity: z.string().optional(),
}).refine(data => {
  // Se prefilledUser (currentUser) non è fornito, la password è obbligatoria
  if (!auth.currentUser && (!data.password || data.password.length < 6)) {
    return false;
  }
  // Se la password è fornita (anche con prefilledUser, nel caso volesse cambiarla), deve essere lunga almeno 6 caratteri
  if (data.password && data.password.length < 6) {
    return false;
  }
  return true;
}, {
  message: "La password deve contenere almeno 6 caratteri.",
  path: ["password"],
}).refine(data => {
  if (data.password) return data.password === data.confirmPassword;
  return true;
}, {
  message: "Le password non coincidono.",
  path: ["confirmPassword"],
}).refine(data => {
    if (data.password && !data.confirmPassword) return false;
    return true;
}, {
    message: "Conferma password è richiesta se la password è inserita.",
    path: ["confirmPassword"]
});


type UnifiedRegisterFormValues = z.infer<typeof unifiedRegisterFormSchema>;

const activitySectorOptions = [
  { value: "unspecified", label: "Non specificato" },
  { value: "elettricista", label: "Elettricista" },
  { value: "idraulico", label: "Idraulico" },
  { value: "installatore", label: "Installatore" },
  { value: "multiservizi", label: "Multiservizi" },
  { value: "altro", label: "Altro" },
];

export function UnifiedRegisterForm({ prefilledUser }: { prefilledUser?: FirebaseUser | null }) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const form = useForm<UnifiedRegisterFormValues>({
    resolver: zodResolver(unifiedRegisterFormSchema),
    defaultValues: {
      adminName: prefilledUser?.displayName || "",
      email: prefilledUser?.email || "",
      password: "",
      confirmPassword: "",
      companyName: "",
      slug: "",
      companyPhone: "",
      activitySector: "", // Inizializza vuoto per far funzionare il placeholder del Select
      companyCity: "",
    },
  });

  useEffect(() => {
    if (prefilledUser) {
      form.reset({
        adminName: prefilledUser.displayName || "",
        email: prefilledUser.email || "",
        password: "", // Password non precompilata per sicurezza
        confirmPassword: "",
        companyName: "",
        slug: "",
        companyPhone: "",
        activitySector: "",
        companyCity: "",
      });
    }
  }, [prefilledUser, form]);


  const companyNameValue = form.watch("companyName");
  const slugValue = form.watch("slug");

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

    let userIdToUse: string | undefined = prefilledUser?.uid;
    let userEmailToUse: string | undefined = prefilledUser?.email || undefined;
    let userDisplayNameToUse: string | undefined = prefilledUser?.displayName || data.adminName;

    // Se prefilledUser non è fornito, significa che stiamo creando un nuovo utente con email/password
    if (!prefilledUser) {
      if (!data.password || data.password.length < 6) {
        form.setError("password", {type: "manual", message: "La password deve contenere almeno 6 caratteri."});
        setIsLoading(false);
        toast({ title: "Errore Registrazione", description: "La password deve contenere almeno 6 caratteri.", variant: "destructive" });
        console.error("Errore: Password troppo corta.");
        return;
      }
      if (data.password !== data.confirmPassword) {
        form.setError("confirmPassword", {type: "manual", message: "Le password non coincidono."});
        setIsLoading(false);
        toast({ title: "Errore Registrazione", description: "Le password non coincidono.", variant: "destructive" });
        console.error("Errore: Le password non coincidono.");
        return;
      }
    }


    try {
      if (!prefilledUser) {
        console.log("Attempting new user registration with email:", data.email);
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password!);
          userIdToUse = userCredential.user.uid;
          userEmailToUse = userCredential.user.email!;
          userDisplayNameToUse = data.adminName; // Nome dall'input

          await updateProfile(userCredential.user, { displayName: userDisplayNameToUse });
          console.log("New user created successfully with Firebase Auth:", userIdToUse);
        } catch (authError: any) {
          console.error("Errore creazione utente Firebase Auth:", authError);
          let errorMessage = "Errore durante la creazione dell'utente. Riprova.";
          if (authError.code === "auth/email-already-in-use") errorMessage = "L'indirizzo email è già in uso.";
          else if (authError.code === "auth/weak-password") errorMessage = "La password è troppo debole.";
          else if (authError.code === "auth/invalid-email") errorMessage = "L'indirizzo email non è valido.";
          else errorMessage = `Errore Auth: ${authError.message || "Errore sconosciuto"}`;
          toast({ title: "Errore Registrazione Utente", description: errorMessage, variant: "destructive" });
          setIsLoading(false);
          return;
        }
      } else {
         // Se prefilledUser (es. da Google), aggiorniamo il displayName se è stato modificato nel form
        if (data.adminName !== prefilledUser.displayName && prefilledUser.uid) {
           try {
            await updateProfile(auth.currentUser!, { displayName: data.adminName });
            userDisplayNameToUse = data.adminName;
            console.log("DisplayName aggiornato per utente pre-autenticato:", data.adminName);
           } catch (updateError) {
            console.error("Errore aggiornamento displayName per utente pre-autenticato:", updateError);
            // Non blocchiamo la registrazione dell'azienda per questo, ma logghiamo l'errore
           }
        }
      }


      if (!userIdToUse || !userEmailToUse) {
        console.error("User ID or Email is undefined after auth step.");
        toast({ title: "Errore Interno", description: "Impossibile ottenere i dati utente.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      console.log("User ID for Firestore:", userIdToUse, "User Email:", userEmailToUse, "User Display Name:", userDisplayNameToUse);

      const finalSlug = generateSlug(data.slug);
      // Aggiorna il valore nel form se è stato normalizzato, per coerenza
      if (finalSlug !== data.slug) {
          form.setValue("slug", finalSlug, { shouldValidate: true });
      }

      // Rivalida i dati con lo slug normalizzato
      const validationResult = unifiedRegisterFormSchema.safeParse({...data, slug: finalSlug});
      if (!validationResult.success) {
          console.error("Form validation failed after slug normalization:", validationResult.error.flatten().fieldErrors);
          const fieldErrors = validationResult.error.flatten().fieldErrors;
          (Object.keys(fieldErrors) as Array<keyof typeof fieldErrors>).forEach((key) => {
            const messages = fieldErrors[key];
            if (messages && messages.length > 0) {
              form.setError(key as any, { type: "manual", message: messages.join(", ") });
            }
          });
          toast({ title: "Errore di Validazione", description: "Controlla i campi evidenziati.", variant: "destructive" });
          setIsLoading(false);
          return;
      }
      console.log("Form data validated successfully after slug normalization.");

      console.log("Querying Firestore for slug uniqueness:", finalSlug);
      const aziendeRef = collection(db, "aziende");
      const qSlug = query(aziendeRef, where("slug", "==", finalSlug));
      const slugQuerySnapshot = await getDocs(qSlug);

      let slugTakenByOther = false;
      if (!slugQuerySnapshot.empty) {
        slugQuerySnapshot.forEach(docSnap => {
          if (docSnap.id !== userIdToUse) { // Lo slug è usato da un'ALTRA azienda
            slugTakenByOther = true;
          }
        });
      }

      if (slugTakenByOther) {
        console.warn("Slug conflict detected. Slug:", finalSlug, "is taken by another company.");
        form.setError("slug", { type: "manual", message: "Questo slug è già utilizzato da un'altra azienda. Scegline uno diverso." });
        toast({ title: "Errore Registrazione", description: "Lo slug scelto è già in uso.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      console.log("Slug is unique or belongs to the current user's potential company.");

      const companyDataToSave = {
        uid_admin: userIdToUse,
        email_admin: userEmailToUse,
        nome: data.companyName,
        slug: finalSlug,
        telefono_contatto: data.companyPhone || null,
        settore_attivita: data.activitySector === "unspecified" || !data.activitySector ? null : data.activitySector,
        sede_citta: data.companyCity || null,
        contatore_richieste: 0,
        data_creazione: serverTimestamp(),
      };

      console.log("Attempting to save company data to Firestore:", companyDataToSave);
      const companyDocRef = doc(db, "aziende", userIdToUse);
      await setDoc(companyDocRef, companyDataToSave);
      console.log("Company data saved successfully to Firestore for document ID:", userIdToUse);

      // Aggiungi l'amministratore come primo collaboratore
      const adminCollaboratorData = {
        id_azienda: userIdToUse,
        nome_completo: userDisplayNameToUse,
        email: userEmailToUse,
        ruolo: "Amministratore",
        data_creazione: serverTimestamp(),
      };
      await addDoc(collection(db, "collaboratori_azienda"), adminCollaboratorData);
      console.log("Admin collaborator entry created for:", userEmailToUse);


      toast({
        title: "Registrazione Completata!",
        description: "La tua azienda è stata configurata. Verrai reindirizzato alla dashboard.",
      });
      router.push('/dashboard');
      console.log("Redirecting to /dashboard.");

    } catch (error: any) {
      console.error("Errore generico in onSubmit:", error);
      toast({
        title: "Errore Registrazione Azienda",
        description: `Si è verificato un errore imprevisto: ${error.message || "Riprova più tardi."}`,
        variant: "destructive",
      });
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">
          Crea il Tuo Account e Registra l'Azienda
        </CardTitle>
        <CardDescription>
          Compila i campi per iniziare. L'email e la password saranno le tue credenziali di accesso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Sezione Dettagli Utente */}
            <div className={`grid grid-cols-1 ${!prefilledUser ? "md:grid-cols-2" : ""} gap-x-6 gap-y-4`}>
              <FormField
                  control={form.control}
                  name="adminName"
                  render={({ field }) => (
                    <FormItem className={`${prefilledUser?.displayName ? "md:col-span-2" : ""}`}>
                      <FormLabel>Il Tuo Nome e Cognome <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Mario Rossi"
                            {...field}
                            className="pl-10"
                            disabled={isLoading || (!!prefilledUser && !!prefilledUser.displayName)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              {!prefilledUser && (
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Amministratore (Login) <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="admin@azienda.com"
                            {...field}
                            className="pl-10"
                            disabled={isLoading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {prefilledUser && (
                 <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Email Amministratore (Login) <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="email"
                              {...field}
                              className="pl-10"
                              disabled={true} // Sempre disabilitato se prefilledUser esiste
                              readOnly={true}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              )}
            </div>

            {!prefilledUser && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password <span className="text-destructive">*</span></FormLabel>
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
                      <FormLabel>Conferma Password <span className="text-destructive">*</span></FormLabel>
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
              </div>
            )}

            {/* Sezione Dettagli Azienda */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nome Azienda <span className="text-destructive">*</span></FormLabel>
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
                    <FormLabel>Slug Pubblico Azienda <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                        <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="es: idraulica-rossi"
                            {...field}
                            className="pl-10"
                            disabled={isLoading}
                            onBlur={(e) => { // Normalizza lo slug quando il campo perde il focus
                                const manualSlug = generateSlug(e.target.value);
                                // Se l'utente cancella tutto, rigenera dallo companyName (se presente)
                                if (e.target.value.trim() === "" && companyNameValue) { 
                                    field.onChange(generateSlug(companyNameValue));
                                    form.trigger("slug"); // Forza ri-validazione se necessario
                                } else if (e.target.value.trim() !== "" && e.target.value !== manualSlug) {
                                    // Se l'utente ha scritto qualcosa ma non è uno slug valido, normalizzalo
                                    field.onChange(manualSlug);
                                    form.trigger("slug");
                                }
                                setIsSlugManuallyEdited(true); // Una volta modificato, consideralo manuale
                                field.onBlur(); // Chiama l'onBlur originale di react-hook-form
                            }}
                            onChange={(e) => {
                                field.onChange(e.target.value); // Aggiorna il valore del form
                                // Se lo slug viene modificato e non corrisponde più a quello generato, consideralo manuale
                                if (!isSlugManuallyEdited && e.target.value !== generateSlug(companyNameValue) ) {
                                    setIsSlugManuallyEdited(true);
                                }
                                 form.clearErrors('slug'); // Pulisce errori precedenti mentre l'utente scrive
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
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
                      value={field.value || ""} // Usa stringa vuota per il placeholder
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
                  <FormItem className="md:col-span-2">
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
            </div>

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Registra e Vai alla Dashboard"}
            </Button>
          </form>
        </Form>
      </CardContent>
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
    </Card>
  );
}
