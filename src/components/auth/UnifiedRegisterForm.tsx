
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
import { createUserWithEmailAndPassword, type User as FirebaseUser } from "firebase/auth";
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
  adminName: z.string().min(2, { message: "Il nome dell'amministratore è richiesto." }), // Nome per il profilo utente
  email: z.string().email({ message: "Indirizzo email non valido." }),
  password: z.string().min(6, { message: "La password deve contenere almeno 6 caratteri." }),
  confirmPassword: z.string(),
  companyName: z.string().min(2, { message: "Il nome dell'azienda deve contenere almeno 2 caratteri." }),
  slug: z.string()
    .min(1, { message: "Lo slug è richiesto." })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Slug non valido. Usa solo lettere minuscole, numeri e trattini singoli." })
    .refine(s => !s.startsWith('-') && !s.endsWith('-'), { message: "Lo slug non può iniziare o finire con un trattino." }),
  companyPhone: z.string().optional(),
  activitySector: z.string().optional(),
  companyCity: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Le password non coincidono.",
  path: ["confirmPassword"],
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
      activitySector: "unspecified",
      companyCity: "",
    },
  });

  useEffect(() => {
    if (prefilledUser) {
      form.reset({
        adminName: prefilledUser.displayName || "",
        email: prefilledUser.email || "",
        password: "",
        confirmPassword: "",
        companyName: "",
        slug: "",
        companyPhone: "",
        activitySector: "unspecified",
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


    try {
      if (!prefilledUser) { // Solo se stiamo creando un nuovo utente email/password
        console.log("Attempting new user registration with email:", data.email);
        if (!data.password) {
          form.setError("password", {type: "manual", message: "La password è richiesta."});
          setIsLoading(false);
          console.error("Password field is empty for new user registration.");
          toast({ title: "Errore Registrazione", description: "La password è richiesta.", variant: "destructive" });
          return;
        }
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          userIdToUse = userCredential.user.uid;
          userEmailToUse = userCredential.user.email!; // Firebase Auth user email is non-null
          userDisplayNameToUse = data.adminName; // Use adminName from form for new users

          // Update Firebase Auth Profile for new user
          await auth.currentUser?.updateProfile({ displayName: userDisplayNameToUse });

          console.log("New user created successfully with Firebase Auth:", userIdToUse);
        } catch (authError: any) {
          console.error("Errore creazione utente Firebase Auth:", authError);
          let errorMessage = "Errore durante la creazione dell'utente. Riprova.";
          if (authError.code === "auth/email-already-in-use") errorMessage = "L'indirizzo email è già in uso.";
          else if (authError.code === "auth/weak-password") errorMessage = "La password è troppo debole.";
          else if (authError.code === "auth/invalid-email") errorMessage = "L'indirizzo email non è valido.";
          else errorMessage = `Errore Auth: ${authError.message}`;
          toast({ title: "Errore Registrazione Utente", description: errorMessage, variant: "destructive" });
          setIsLoading(false);
          return;
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
      console.log("Normalized slug for processing:", finalSlug);
      if (finalSlug !== data.slug) {
          form.setValue("slug", finalSlug, { shouldValidate: true });
      }

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
          if (docSnap.id !== userIdToUse) { // Check if slug is taken by a *different* company
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

      // Add admin as a collaborator
      const adminCollaboratorData = {
        id_azienda: userIdToUse,
        nome_completo: userDisplayNameToUse, // Use the name from the form or prefilled user
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
    <Card className="w-full max-w-lg shadow-xl">
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
                control={form.control}
                name="adminName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Il Tuo Nome e Cognome</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                          placeholder="Mario Rossi" 
                          {...field} 
                          className="pl-10" 
                          disabled={isLoading || !!prefilledUser?.displayName} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Amministratore (Login)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        placeholder="admin@azienda.com" 
                        {...field} 
                        className="pl-10" 
                        disabled={isLoading || !!prefilledUser?.email} 
                        readOnly={!!prefilledUser?.email}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!prefilledUser && (
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
                        onBlur={(e) => { 
                            const manualSlug = generateSlug(e.target.value);
                            if (e.target.value.trim() === "" && companyNameValue) { 
                                field.onChange(generateSlug(companyNameValue));
                                form.trigger("slug");
                            } else if (e.target.value.trim() !== "" && e.target.value !== manualSlug) {
                                field.onChange(manualSlug); 
                                form.trigger("slug"); 
                            }
                            setIsSlugManuallyEdited(true); 
                            field.onBlur(); 
                        }}
                        onChange={(e) => {
                            field.onChange(e.target.value); 
                            if (!isSlugManuallyEdited && e.target.value !== generateSlug(companyNameValue) ) {
                                setIsSlugManuallyEdited(true);
                            }
                             form.clearErrors('slug');
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

    