
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
import { Mail, Lock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const LoginFormSchema = z.object({
  email: z.string().email({ message: "Indirizzo email non valido." }),
  password: z.string().min(1, { message: "La password è richiesta." }),
});

type LoginFormValues = z.infer<typeof LoginFormSchema>;

async function checkCompanyExists(userId: string): Promise<boolean> {
  console.log("LoginForm: checkCompanyExists called for userId:", userId);
  if (!userId) {
    console.error("LoginForm: checkCompanyExists - userId is undefined or null");
    return false;
  }
  try {
    const companyDocRef = doc(db, "aziende", userId);
    const companyDocSnap = await getDoc(companyDocRef);
    const exists = companyDocSnap.exists();
    console.log(`LoginForm: Company for ${userId} exists: ${exists}`);
    return exists;
  } catch (error) {
    console.error("LoginForm: Error in checkCompanyExists for userId", userId, error);
    return false; 
  }
}

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onEmailSubmit(data: LoginFormValues) {
    console.log("onEmailSubmit called with data:", data.email);
    setIsEmailLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      console.log("onEmailSubmit: Email sign-in successful. User:", user.uid);
      toast({
        title: "Accesso Riuscito!",
        description: "Verifica dati account in corso...",
      });

      const companyExists = await checkCompanyExists(user.uid);
      if (companyExists) {
        console.log("onEmailSubmit: Company exists. Redirecting to /dashboard.");
        router.push('/dashboard');
      } else {
        console.log("onEmailSubmit: Company DOES NOT exist. Redirecting to /register.");
        // This case should ideally not happen if registration flow ensures company creation.
        // But as a fallback, redirect to register to complete company profile.
        router.push('/register'); 
      }
    } catch (error: any) {
      console.error("onEmailSubmit: Errore di login con email:", error);
      let errorMessage = "Credenziali non valide o utente non trovato. Riprova.";
       if (error.code) {
        switch (error.code) {
          case "auth/user-not-found":
          case "auth/wrong-password":
          case "auth/invalid-credential":
            errorMessage = "Email o password errati. Controlla e riprova.";
            break;
          case "auth/invalid-email":
            errorMessage = "L'indirizzo email non è formattato correttamente.";
            break;
          case "auth/too-many-requests":
            errorMessage = "Accesso temporaneamente bloccato a causa di troppi tentativi falliti. Riprova più tardi.";
            break;
          default:
            errorMessage = `Si è verificato un errore: ${error.message}`;
        }
      }
      toast({
        title: "Errore di Accesso",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsEmailLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Accedi</CardTitle>
        <CardDescription>
          Inserisci le tue credenziali per accedere alla dashboard aziendale.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onEmailSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="email" placeholder="mario.rossi@azienda.com" {...field} className="pl-10" disabled={isEmailLoading} />
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
                      <Input type="password" placeholder="••••••••" {...field} className="pl-10" disabled={isEmailLoading} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isEmailLoading}>
              {isEmailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accedi
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Non hai un account?{' '}
            <Button variant="link" asChild className="text-accent p-0 h-auto">
              <Link href="/register">
                Registrati
              </Link>
            </Button>
          </p>
      </CardFooter>
    </Card>
  );
}
