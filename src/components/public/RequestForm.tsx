"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, MessageSquare } from "lucide-react";
// Import AI flow if needed directly, or handle in server action
// import { summarizeRequest } from "@/ai/flows/summarize-request";

interface RequestFormProps {
  companySlug: string;
  companyDisplayName?: string;
}

const RequestFormSchema = z.object({
  clientName: z.string().min(2, { message: "Il nome deve contenere almeno 2 caratteri." }),
  clientEmail: z.string().email({ message: "Indirizzo email non valido." }),
  clientPhone: z.string().min(5, { message: "Numero di telefono non valido." }),
  clientAddress: z.string().min(5, { message: "Indirizzo non valido." }),
  problemDescription: z.string().min(10, { message: "La descrizione deve contenere almeno 10 caratteri." }),
});

type RequestFormValues = z.infer<typeof RequestFormSchema>;

export function RequestForm({ companySlug, companyDisplayName }: RequestFormProps) {
  const { toast } = useToast();
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(RequestFormSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      problemDescription: "",
    },
  });

  async function onSubmit(data: RequestFormValues) {
    console.log("Request for company:", companySlug, data);
    // TODO: Implement actual request submission logic
    // This could involve calling a server action that also uses `summarizeRequest` AI flow.
    
    // Example: const summary = await summarizeRequest({ requestText: data.problemDescription });
    // console.log("AI Summary:", summary);

    toast({
      title: "Richiesta Inviata",
      description: "La tua richiesta di intervento è stata inviata con successo.",
    });
    form.reset();
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Richiesta di Intervento</CardTitle>
        {companyDisplayName && (
          <CardDescription>Modulo di richiesta per {companyDisplayName}</CardDescription>
        )}
         {!companyDisplayName && companySlug && (
          <CardDescription>Modulo di richiesta per l'azienda con identificativo: {companySlug}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome e Cognome</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Mario Rossi" {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="email" placeholder="mario.rossi@email.com" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="tel" placeholder="333 1234567" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="clientAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo Intervento</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea placeholder="Via Roma 1, 00100 Città (Provincia)" {...field} className="pl-10 min-h-[60px]" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="problemDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione del Problema</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea placeholder="Descrivi il problema riscontrato..." {...field} className="pl-10 min-h-[120px]" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              Invia Richiesta
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
