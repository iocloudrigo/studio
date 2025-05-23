
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
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Mail, Lock, Loader2, Link as LinkIcon, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const generateSlug = (name: string): string => {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Sostituisce spazi con trattini
    .replace(/[^\w-]+/g, '') // Rimuove caratteri non alfanumerici eccetto trattini
    .replace(/--+/g, '-'); // Sostituisce trattini multipli con uno singolo
};

const RegisterFormSchema = z.object({
  email: z.string().email({ message: "Indirizzo email non valido." }),
  password: z.string().min(6, { message: "La password deve contenere almeno 6 caratteri." }).optional(),
  confirmPassword: z.string().optional(),
  companyName: z.string().min(2, { message: "Il nome dell'azienda deve contenere almeno 2 caratteri." }),
  slug: z.string()
          .min(1, { message: "Lo slug è richiesto." })
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Slug non valido. Usa solo lettere minuscole, numeri e trattini singoli." })
          .refine(s => !s.startsWith('-') && !s.endsWith('-'), {message: "Lo slug non può iniziare o finire con un trattino."}),
}).refine(data => {
  // Password confirmation is only required if password field is present (i.e., not a Google user completing profile)
  if (data.password) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Le password non coincidono.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof RegisterFormSchema>;

interface RegisterFormProps {
  prefilledUser?: FirebaseUser | null;
}

export function RegisterForm({ prefilledUser }: RegisterFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: {
      email: prefilledUser?.email || "",
      password: "",
      confirmPassword: "",
      companyName: "",
      slug: "",
    },
  });

  const companyNameValue = form.watch("companyName");
  const slugValue = form.watch("slug");

  useEffect(() => {
    if (prefilledUser) {
      form.setValue("email", prefilledUser.email || "");
      // If it's a prefilled user (e.g. Google), password fields are not needed
      form.unregister("password");
      form.unregister("confirmPassword");
    }
  }, [prefilledUser, form]);

  useEffect(() => {
    if (!isSlugManuallyEdited && companyNameValue) {
      const newSlug = generateSlug(companyNameValue);
      if (form.getValues("slug") !== newSlug) {
        form.setValue("slug", newSlug, { shouldValidate: true });
      }
    }
  }, [companyNameValue, form, isSlugManuallyEdited]);

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true);

    const finalSlug = generateSlug(data.slug);
    if (finalSlug !== data.slug) {
      form.setValue("slug", finalSlug, { shouldValidate: true });
    }
    
    const slugValidationResult = RegisterFormSchema.shape.slug.safeParse(finalSlug);
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
      
      let slugIsTaken = false;
      if (!querySnapshot.empty) {
        // If prefilledUser exists, it means we are completing a profile (e.g. Google user)
        // The slug check must ensure it's not taken by *another* user.
        // If prefilledUser is null, it's a new email registration, slug must be unique.
        querySnapshot.forEach((docSnap) => {
          if (prefilledUser && docSnap.id === prefilledUser.uid) {
            // This slug belongs to the current user trying to complete profile, which is fine.
          } else if (!prefilledUser) {
            slugIsTaken = true; // New registration, any match is a conflict
          } else if (prefilledUser && docSnap.id !== prefilledUser.uid) {
            slugIsTaken = true; // Google user, but slug taken by someone else
          }
        });
      }

      if (slugIsTaken) {
        form.setError("slug", { type: "manual", message: "Questo slug è già utilizzato. Scegline uno diverso." });
        setIsLoading(false);
        return;
      }

      let userId = prefilledUser?.uid;
      let userEmail = prefilledUser?.email;

      // 1. Create user with Firebase Authentication if not already logged in (i.e., prefilledUser is null)
      if (!prefilledUser) {
        if (!data.password) { // Should be caught by Zod, but defensive check
          toast({ title: "Errore", description: "La password è richiesta.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        userId = userCredential.user.uid;
        userEmail = userCredential.user.email;
      }

      if (!userId || !userEmail) {
        toast({ title: "Errore", description: "Impossibile ottenere i dettagli utente.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // 2. Create company document in Firestore
      const companyDocRef = doc(db, "aziende", userId);
      const companyDataToSave = {
        nome: data.companyName,
        slug: finalSlug,
        email_admin: userEmail,
        uid_admin: userId,
        data_creazione: serverTimestamp(),
      };
      await setDoc(companyDocRef, companyDataToSave);

      toast({
        title: "Registrazione Completata!",
        description: "La tua azienda è stata configurata. Verrai reindirizzato alla dashboard.",
      });
      // AuthRedirectHandler will handle the redirect to /dashboard because auth state is now set and company exists.
      // Forcing a navigation might be good to ensure state update is picked up by AuthRedirectHandler
      router.push('/dashboard'); 


    } catch (error: any) {
      console.error("Errore di registrazione:", error);
      let errorMessage = "Errore durante la registrazione. Riprova.";
      if (error.code) {
        switch (error.code) {
          case "auth/email-already-in-use":
            errorMessage = "L'indirizzo email è già in uso.";
            break;
          case "auth/weak-password":
            errorMessage = "La password è troppo debole. Deve essere di almeno 6 caratteri.";
            break;
          case "auth/invalid-email":
            errorMessage = "L'indirizzo email non è valido.";
            break;
          default:
            errorMessage = `Si è verificato un errore: ${error.message}`;
        }
      }
      toast({
        title: "Errore di Registrazione",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Crea Account e Azienda</CardTitle>
        <CardDescription>
          {prefilledUser 
            ? "Completa i dettagli della tua azienda." 
            : "Registra il tuo account e configura la tua azienda."}
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
                        type="email" 
                        placeholder="admin@azienda.com" 
                        {...field} 
                        className="pl-10" 
                        disabled={isLoading || !!prefilledUser} 
                        readOnly={!!prefilledUser}
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
                    Sarà usato nell'URL pubblico per le richieste clienti: 
                    <code className="font-semibold text-primary text-xs break-all"> /richiedi-intervento?azienda={slugValue || "..."}</code>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (prefilledUser ? "Salva Azienda e Accedi" : "Crea Account e Azienda")}
            </Button>
          </form>
        </Form>
      </CardContent>
      {!prefilledUser && (
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
