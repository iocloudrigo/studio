
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
import { useRouter } from "next/navigation"; // Keep for potential future use if AuthRedirectHandler is removed/changed
import { useState } from "react";

// Firebase imports
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
// Removed: getDoc, doc, db. AuthRedirectHandler handles company check.
import { auth } from "@/lib/firebase";
import { Separator } from "@/components/ui/separator";

const LoginFormSchema = z.object({
  email: z.string().email({ message: "Indirizzo email non valido." }),
  password: z.string().min(1, { message: "La password è richiesta." }),
});

type LoginFormValues = z.infer<typeof LoginFormSchema>;

export function LoginForm() {
  const { toast } = useToast();
  // const router = useRouter(); // Not directly used for redirection now, AuthRedirectHandler does it.
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onEmailSubmit(data: LoginFormValues) {
    setIsEmailLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // Login successful. AuthRedirectHandler will take over for redirection.
      toast({
        title: "Accesso Riuscito!",
        description: "Verrai reindirizzato a breve.",
      });
      // No router.push here, AuthRedirectHandler manages it.
    } catch (error: any) {
      console.error("Errore di login con email:", error);
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

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Login with Google successful. AuthRedirectHandler will take over.
       toast({
        title: "Accesso Riuscito!",
        description: "Accesso effettuato con Google. Verrai reindirizzato a breve.",
      });
      // No router.push here, AuthRedirectHandler manages it.
    } catch (error: any) {
      console.error("Errore di login con Google:", error);
      let errorMessage = "Errore durante l'accesso con Google. Riprova.";
      if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "La finestra di accesso Google è stata chiusa. Riprova.";
      } else if (error.code === "auth/cancelled-popup-request") {
        errorMessage = "Richiesta di accesso Google annullata. Riprova se intendevi accedere.";
      } else if (error.code === "auth/account-exists-with-different-credential") {
        errorMessage = "Un account esiste già con questa email ma con un metodo di accesso diverso. Prova ad accedere con l'altro metodo.";
      }
      toast({
        title: "Errore Accesso Google",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-xl">
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
                      <Input type="email" placeholder="mario.rossi@azienda.com" {...field} className="pl-10" disabled={isEmailLoading || isGoogleLoading} />
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
                      <Input type="password" placeholder="••••••••" {...field} className="pl-10" disabled={isEmailLoading || isGoogleLoading} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isEmailLoading || isGoogleLoading}>
              {isEmailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accedi
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Oppure continua con
            </span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleGoogleLogin}
          disabled={isEmailLoading || isGoogleLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
          )}
          Accedi con Google
        </Button>

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
