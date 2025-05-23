
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
import { Briefcase, Mail, Lock, Loader2 } from "lucide-react"; // Added Loader2
import { useRouter } from "next/navigation";
import { useState } from "react";

// Firebase imports
import { createUserWithEmailAndPassword } from "firebase/auth";
// Removed Firestore imports (doc, setDoc, serverTimestamp, db) as company creation is moved
import { auth } from "@/lib/firebase"; 

const RegisterFormSchema = z.object({
  // Removed companyName from here as it's part of /registra-azienda
  email: z.string().email({ message: "Indirizzo email non valido." }),
  password: z.string().min(6, { message: "La password deve contenere almeno 6 caratteri." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Le password non coincidono.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof RegisterFormSchema>;

export function RegisterForm() {
  const { toast } = useToast();
  const router = useRouter(); // Router might still be needed for other purposes or future enhancements
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true);
    try {
      // 1. Create user with Firebase Authentication
      await createUserWithEmailAndPassword(auth, data.email, data.password);
      
      // User is created. AuthRedirectHandler will now take over.
      // No need to create company document here.
      // No need to manually redirect here.
      
      toast({
        title: "Registrazione Iniziale Completata!",
        description: "Verrai reindirizzato per completare i dettagli della tua azienda.",
      });

      // AuthRedirectHandler is expected to pick up the new auth state
      // and redirect to /registra-azienda if company profile is missing.

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
        <CardTitle className="text-2xl">Crea il tuo Account</CardTitle>
        <CardDescription>
          Registrati per accedere e poi configura la tua azienda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Removed companyName field from this form */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
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
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Crea Account"}
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
