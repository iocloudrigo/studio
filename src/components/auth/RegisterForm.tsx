"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Mail, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Firebase imports
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const RegisterFormSchema = z.object({
  companyName: z.string().min(2, { message: "Il nome dell'azienda deve contenere almeno 2 caratteri." }),
  email: z.string().email({ message: "Indirizzo email non valido." }),
  password: z.string().min(6, { message: "La password deve contenere almeno 6 caratteri." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Le password non coincidono.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof RegisterFormSchema>;

// Slug generation utility
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars (keeps letters, numbers, underscore, hyphen)
    .replace(/--+/g, '-'); // Replace multiple - with single -
};

export function RegisterForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: {
      companyName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true);
    try {
      // 1. Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        // 2. Create document in Firestore
        const companySlug = generateSlug(data.companyName);
        // Use user.uid as the document ID for the 'aziende' collection
        const companyDocRef = doc(db, "aziende", user.uid); 

        await setDoc(companyDocRef, {
          nome: data.companyName,
          slug: companySlug,
          email_admin: user.email,
          uid_admin: user.uid,
          data_creazione: serverTimestamp(),
        });
        
        toast({
          title: "Registrazione Completata!",
          description: "Account creato con successo. Verrai reindirizzato alla dashboard.",
        });

        // 3. Redirect to dashboard
        router.push('/dashboard');

      } else {
        // This case should ideally not be reached if createUserWithEmailAndPassword succeeds
        throw new Error("Creazione utente fallita inaspettatamente.");
      }

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
    <Card className="w-full shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Registra la tua Azienda</CardTitle>
        <CardDescription>
          Crea un account per iniziare a gestire le richieste di intervento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Azienda</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Nome della tua azienda" {...field} className="pl-10" disabled={isLoading} />
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
                  <FormLabel>Email Amministratore</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="email" placeholder="admin@azienda.com" {...field} className="pl-10" disabled={isLoading} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? "Registrazione in corso..." : "Registrati"}
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
