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
import { Mail, Lock } from "lucide-react";

const LoginFormSchema = z.object({
  email: z.string().email({ message: "Indirizzo email non valido." }),
  password: z.string().min(6, { message: "La password deve contenere almeno 6 caratteri." }),
});

type LoginFormValues = z.infer<typeof LoginFormSchema>;

export function LoginForm() {
  const { toast } = useToast();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: LoginFormValues) {
    console.log(data);
    // TODO: Implement actual login logic
    toast({
      title: "Login Tentativo",
      description: "Credenziali inviate: " + JSON.stringify(data),
    });
    // router.push('/dashboard'); // Redirect on successful login
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Accedi</CardTitle>
        <CardDescription>
          Inserisci le tue credenziali per accedere alla dashboard aziendale.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input type="email" placeholder="mario.rossi@azienda.com" {...field} className="pl-10" />
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
                      <Input type="password" placeholder="••••••••" {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
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
