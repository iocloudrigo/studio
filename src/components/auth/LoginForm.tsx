
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
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithRedirect, getRedirectResult, type User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { Separator } from "@/components/ui/separator";
import { doc, getDoc } from "firebase/firestore";

const LoginFormSchema = z.object({
  email: z.string().email({ message: "Indirizzo email non valido." }),
  password: z.string().min(1, { message: "La password è richiesta." }),
});

type LoginFormValues = z.infer<typeof LoginFormSchema>;

async function checkCompanyExists(userId: string): Promise<boolean> {
  const companyDocRef = doc(db, "aziende", userId);
  const companyDocSnap = await getDoc(companyDocRef);
  return companyDocSnap.exists();
}

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Effect to handle Google redirect result
  useEffect(() => {
    const handleAsyncRedirect = async () => {
      // Only attempt to get redirect result if not already processing email login
      // and if not explicitly in google loading state from button click (though page reloads)
      if (isEmailLoading) return;

      try {
        // Check if we are in the process of a Google redirect.
        // isGoogleLoading might be false on page load after redirect.
        // getRedirectResult itself will determine if a redirect operation was pending.
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          setIsGoogleLoading(true); // Set loading true as we process the user
          toast({
            title: "Accesso Riuscito!",
            description: "Accesso effettuato con Google. Verrai reindirizzato a breve.",
          });
          const companyExists = await checkCompanyExists(result.user.uid);
          if (companyExists) {
            router.push('/dashboard');
          } else {
            router.push('/register'); // To the unified registration form
          }
        }
        // If result is null, no redirect was pending or it was already consumed.
      } catch (error: any) {
        console.error("Errore durante getRedirectResult:", error);
        let errorMessage = "Errore durante l'accesso con Google. Riprova.";
        if (error.code === "auth/account-exists-with-different-credential") {
          errorMessage = "Un account esiste già con questa email ma con un metodo di accesso diverso.";
        } else if (error.code === "auth/cancelled-popup-request" || error.code === "auth/popup-closed-by-user" || error.code === "auth/redirect-cancelled-by-user") {
          errorMessage = "Processo di accesso Google interrotto o annullato.";
        }
        toast({
          title: "Errore Accesso Google",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        // Ensure loading is false if it was set true by this effect,
        // or if it was true from a previous button click before redirect.
        // This might need careful handling if multiple async operations can set it.
         setIsGoogleLoading(false);
      }
    };

    handleAsyncRedirect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, router, toast]); // router and toast are stable, auth is stable.


  const handleSuccessfulLoginRedirect = async (user: FirebaseUser) => {
    // This function is called after a successful login (email or Google)
    // The specific loading state (isEmailLoading/isGoogleLoading) is managed by the caller.
    try {
      const companyExists = await checkCompanyExists(user.uid);
      if (companyExists) {
        router.push('/dashboard');
      } else {
        router.push('/register'); 
      }
    } catch (error) {
        console.error("Error in handleSuccessfulLoginRedirect: ", error);
        toast({
            title: "Errore Post-Accesso",
            description: "Impossibile verificare i dati aziendali o reindirizzare.",
            variant: "destructive",
        });
    }
  };


  async function onEmailSubmit(data: LoginFormValues) {
    setIsEmailLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: "Accesso Riuscito!",
        description: "Verrai reindirizzato a breve.",
      });
      await handleSuccessfulLoginRedirect(userCredential.user);
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
      await signInWithRedirect(auth, provider);
      // After this call, the page will redirect. 
      // The result will be handled by the useEffect hook with getRedirectResult.
      // No further action needed here except setting loading and initiating.
    } catch (error: any) {
      console.error("Errore durante l'avvio di signInWithRedirect:", error);
      toast({
        title: "Errore Avvio Accesso Google",
        description: "Impossibile avviare il processo di accesso con Google. Riprova.",
        variant: "destructive",
      });
      setIsGoogleLoading(false); // Reset loading if redirect initiation fails
    }
  };

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
          disabled={isEmailLoading || isGoogleLoading} // Disable if any login process is active
        >
          {isGoogleLoading ? ( // Show loader if google login is in progress (either initiating redirect or processing result)
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

    