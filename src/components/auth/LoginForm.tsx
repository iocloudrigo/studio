
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
    return false; // Assume company doesn't exist or access failed
  }
}

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true); // Start true to check on mount

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const processRedirect = async () => {
      console.log("LoginForm: useEffect - Attempting getRedirectResult...");
      try {
        const result = await getRedirectResult(auth);
        console.log("LoginForm: getRedirectResult result:", result);

        if (result?.user) {
          const user = result.user;
          setIsGoogleLoading(true); // Indicate active processing of Google login
          console.log("LoginForm: Google sign-in successful via redirect. User:", user.uid, user.email);
          toast({
            title: "Accesso Google Riuscito!",
            description: "Verifica dati account in corso...",
          });

          const companyExists = await checkCompanyExists(user.uid);
          if (companyExists) {
            console.log("LoginForm: Company exists for Google user. Redirecting to /dashboard.");
            router.push('/dashboard');
          } else {
            console.log("LoginForm: Company DOES NOT exist for Google user. Redirecting to /register.");
            router.push('/register');
          }
          // No need to setIsGoogleLoading(false) here due to navigation
        } else {
          console.log("LoginForm: No redirect result or user not found in result.");
          // No action needed if no redirect was pending.
          // Ensure isGoogleLoading is false if it was somehow set true before this.
          if (isGoogleLoading) setIsGoogleLoading(false);
        }
      } catch (error: any) {
        setIsGoogleLoading(true); // We were trying to process a Google login
        console.error("LoginForm: Error during getRedirectResult:", error);
        let errorMessage = "Errore durante l'accesso con Google. Riprova.";
        if (error.code === "auth/account-exists-with-different-credential") {
          errorMessage = "Un account esiste già con questa email ma con un metodo di accesso diverso.";
        } else if (error.code === "auth/cancelled-popup-request" || error.code === "auth/popup-closed-by-user" || error.code === "auth/redirect-cancelled") {
          errorMessage = "Processo di accesso Google interrotto o annullato.";
        } else if (error.code === "auth/redirect-error"){
            errorMessage = "Errore durante il reindirizzamento da Google. Riprova.";
        }
        toast({
          title: "Errore Accesso Google",
          description: errorMessage,
          variant: "destructive",
        });
        setIsGoogleLoading(false); // Reset loading state on error
      } finally {
        setIsProcessingRedirect(false); // Finished initial check
        console.log("LoginForm: useEffect - getRedirectResult processing finished.");
      }
    };

    processRedirect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  async function onEmailSubmit(data: LoginFormValues) {
    if (isProcessingRedirect) {
        toast({ title: "Attendi", description: "Verifica accesso precedente in corso.", variant: "default" });
        return;
    }
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

  const handleGoogleLogin = async () => {
    if (isProcessingRedirect) {
      toast({ title: "Attendi", description: "Verifica accesso precedente in corso.", variant: "default" });
      return;
    }
    console.log("handleGoogleLogin called.");
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      console.log("handleGoogleLogin: Attempting signInWithRedirect...");
      await signInWithRedirect(auth, provider);
      // Page will redirect. isGoogleLoading remains true.
      // The useEffect hook will handle the result upon page reload.
    } catch (error: any) {
      console.error("handleGoogleLogin: Errore durante l'avvio di signInWithRedirect:", error);
      toast({
        title: "Errore Avvio Accesso Google",
        description: "Impossibile avviare il processo di accesso con Google. Riprova.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
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
                      <Input type="email" placeholder="mario.rossi@azienda.com" {...field} className="pl-10" disabled={isProcessingRedirect || isEmailLoading || isGoogleLoading} />
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
                      <Input type="password" placeholder="••••••••" {...field} className="pl-10" disabled={isProcessingRedirect || isEmailLoading || isGoogleLoading} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isProcessingRedirect || isEmailLoading || isGoogleLoading}>
              {(isEmailLoading || (isGoogleLoading && !isProcessingRedirect)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isProcessingRedirect ? "Verifica in corso..." : "Accedi"}
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
          disabled={isProcessingRedirect || isEmailLoading || isGoogleLoading}
        >
          {isGoogleLoading && !isProcessingRedirect && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isProcessingRedirect ? (
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
          )}
          {isProcessingRedirect ? "Verifica in corso..." : "Accedi con Google"}
        </Button>

      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Non hai un account?{' '}
            <Button variant="link" asChild className="text-accent p-0 h-auto" disabled={isProcessingRedirect}>
              <Link href="/register">
                Registrati
              </Link>
            </Button>
          </p>
      </CardFooter>
    </Card>
  );
}
