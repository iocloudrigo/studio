
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building, UserCircle, Bell, ShieldCheck, CreditCard, Loader2, LinkIcon, Upload } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged, updateProfile, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, query, where, collection, getDocs } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Zod Schemas
const companyFormSchema = z.object({
  nome: z.string().min(2, { message: "Il nome dell'azienda deve contenere almeno 2 caratteri." }),
  email_contatto: z.string().email({ message: "Indirizzo email non valido." }).optional().or(z.literal("")),
  telefono_contatto: z.string().optional(),
  indirizzo_completo: z.string().optional(),
  slug: z.string()
    .min(1, { message: "Lo slug è richiesto." })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Slug non valido. Usa solo lettere minuscole, numeri e trattini singoli." })
    .refine(s => !s.startsWith('-') && !s.endsWith('-'), { message: "Lo slug non può iniziare o finire con un trattino." }),
  logoUrl: z.string().url({message: "URL logo non valido"}).optional().or(z.literal("")),
});
type CompanyFormValues = z.infer<typeof companyFormSchema>;

const profileFormSchema = z.object({
  displayName: z.string().min(2, { message: "Il nome deve contenere almeno 2 caratteri." }),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Helper per generare slug
const generateSlug = (name: string): string => {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};


export default function SettingsPage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [companyData, setCompanyData] = useState<Partial<CompanyFormValues & { email_admin?: string; sede_citta?: string }>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSlugManuallyEditedCompany, setIsSlugManuallyEditedCompany] = useState(false);
  
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      nome: "",
      email_contatto: "",
      telefono_contatto: "",
      indirizzo_completo: "",
      slug: "",
      logoUrl: "",
    },
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        profileForm.reset({ displayName: user.displayName || "" });

        try {
          const companyDocRef = doc(db, "aziende", user.uid);
          const companyDocSnap = await getDoc(companyDocRef);
          if (companyDocSnap.exists()) {
            const data = companyDocSnap.data();
            const loadedCompanyData = {
              nome: data.nome || "",
              email_contatto: data.email_contatto || data.email_admin || "",
              telefono_contatto: data.telefono_contatto || "",
              indirizzo_completo: data.indirizzo_completo || data.sede_citta || "",
              slug: data.slug || "",
              logoUrl: data.logoUrl || "https://placehold.co/100x100.png?text=Logo",
            };
            setCompanyData(loadedCompanyData);
            companyForm.reset(loadedCompanyData);
            if (data.slug) setIsSlugManuallyEditedCompany(true);
          } else {
             companyForm.reset({
                logoUrl: "https://placehold.co/100x100.png?text=Logo",
                nome: "",
                email_contatto: user.email || "",
                slug: generateSlug(user.displayName || "mia-azienda"),
             });
          }
        } catch (error) {
          console.error("Errore nel caricare i dati dell'azienda:", error);
          toast({ title: "Errore Dati Azienda", description: "Impossibile caricare i dati dell'azienda.", variant: "destructive" });
        }
      } else {
        setCurrentUser(null);
      }
      setLoadingData(false);
    });
    return () => unsubscribe();
  }, [companyForm, profileForm, toast]);

  const companyNameValue = companyForm.watch("nome");
  const companySlugValue = companyForm.watch("slug");
  const companyLogoUrlValue = companyForm.watch("logoUrl");

  useEffect(() => {
    if (!isSlugManuallyEditedCompany && companyNameValue && !companyForm.formState.dirtyFields.slug) {
      const newSlug = generateSlug(companyNameValue);
      if (companyForm.getValues("slug") !== newSlug) {
        companyForm.setValue("slug", newSlug, { shouldValidate: true });
      }
    }
  }, [companyNameValue, companyForm, isSlugManuallyEditedCompany]);

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) {
      toast({ title: "Errore", description: "Utente non autenticato.", variant: "destructive" });
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // Limite 5MB
      toast({ title: "File troppo grande", description: "Il logo non deve superare i 5MB.", variant: "destructive" });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast({ title: "Formato non supportato", description: "Carica un file JPG, PNG, GIF o WEBP.", variant: "destructive" });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const logoStoragePath = `logos/${currentUser.uid}/${file.name}`;
      console.log(`Attempting to upload logo to: ${logoStoragePath}`);
      const logoUploadRef = storageRef(storage, logoStoragePath);
      const uploadTask = uploadBytesResumable(logoUploadRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        },
        (error) => {
          console.error("Errore durante l'upload del logo (uploadTask.on error):", error.code, error.message, error);
          toast({ title: "Errore Upload Logo", description: `Impossibile caricare il logo: ${error.message}. Controlla i permessi di Firebase Storage.`, variant: "destructive" });
          setIsUploadingLogo(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("Logo caricato, URL:", downloadURL);
            companyForm.setValue("logoUrl", downloadURL, { shouldValidate: true, shouldDirty: true });
            setCompanyData(prev => ({ ...prev, logoUrl: downloadURL }));
            toast({ title: "Logo Caricato!", description: "Il nuovo logo è stato caricato. Salva le modifiche per applicarlo." });
          } catch (downloadError) {
            console.error("Errore ottenimento Download URL:", downloadError);
            toast({ title: "Errore Post-Upload", description: "Logo caricato ma impossibile ottenere URL.", variant: "destructive" });
          } finally {
            setIsUploadingLogo(false);
          }
        }
      );
    } catch (error) {
      console.error("Errore durante l'avvio dell'upload del logo:", error);
      toast({ title: "Errore Upload", description: "Si è verificato un errore imprevisto durante il caricamento.", variant: "destructive" });
      setIsUploadingLogo(false); // Assicura che lo stato di caricamento sia resettato
    }
  };


  async function onSubmitCompany(data: CompanyFormValues) {
    if (!currentUser) {
      toast({ title: "Errore", description: "Utente non autenticato.", variant: "destructive" });
      return;
    }
    setIsSavingCompany(true);
    try {
      const companyDocRef = doc(db, "aziende", currentUser.uid);
      const currentCompanyDataSnap = await getDoc(companyDocRef);
      const currentSlug = currentCompanyDataSnap.exists() ? currentCompanyDataSnap.data().slug : null;

      const finalSlug = generateSlug(data.slug);
       if (finalSlug !== data.slug && data.slug.trim() !== "") {
          companyForm.setValue("slug", finalSlug, { shouldValidate: true });
      } else if (data.slug.trim() === "" && companyForm.getValues("nome")) {
          const regeneratedSlug = generateSlug(companyForm.getValues("nome"));
          companyForm.setValue("slug", regeneratedSlug, { shouldValidate: true });
          data.slug = regeneratedSlug;
      } else if (data.slug.trim() === "" && !companyForm.getValues("nome")) {
          companyForm.setError("slug", { type: "manual", message: "Lo slug è richiesto o il nome azienda per generarlo." });
          setIsSavingCompany(false);
          return;
      }
      
      const validatedData = companyFormSchema.parse({...data, slug: data.slug});

      if (validatedData.slug !== currentSlug) {
        const slugQuery = query(collection(db, "aziende"), where("slug", "==", validatedData.slug));
        const slugQuerySnapshot = await getDocs(slugQuery);
        if (!slugQuerySnapshot.empty) {
          let slugTaken = false;
          slugQuerySnapshot.forEach(docSnap => {
            if (docSnap.id !== currentUser.uid) {
              slugTaken = true;
            }
          });
          if (slugTaken) {
            companyForm.setError("slug", { type: "manual", message: "Questo slug è già utilizzato. Scegline uno diverso." });
            toast({ title: "Errore Salvataggio", description: "Lo slug inserito è già in uso.", variant: "destructive" });
            setIsSavingCompany(false);
            return;
          }
        }
      }
      
      const dataToUpdate = {
        nome: validatedData.nome,
        email_contatto: validatedData.email_contatto || null,
        telefono_contatto: validatedData.telefono_contatto || null,
        indirizzo_completo: validatedData.indirizzo_completo || null,
        slug: validatedData.slug,
        logoUrl: validatedData.logoUrl || "https://placehold.co/100x100.png?text=Logo",
        email_admin: currentUser.email,
        uid_admin: currentUser.uid,
      };

      await setDoc(companyDocRef, dataToUpdate, { merge: true });
      
      setCompanyData(prev => ({...prev, ...dataToUpdate}));
      toast({ title: "Successo!", description: "Dati aziendali aggiornati." });
    } catch (error: any) {
      console.error("Errore salvataggio dati azienda:", error);
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          companyForm.setError(err.path[0] as keyof CompanyFormValues, { message: err.message });
        });
        toast({ title: "Errore di Validazione", description: "Controlla i campi evidenziati.", variant: "destructive" });
      } else {
        toast({ title: "Errore Salvataggio", description: error.message || "Impossibile salvare i dati dell'azienda.", variant: "destructive" });
      }
    } finally {
      setIsSavingCompany(false);
    }
  }

  async function onSubmitProfile(data: ProfileFormValues) {
    if (!currentUser) {
      toast({ title: "Errore", description: "Utente non autenticato.", variant: "destructive" });
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateProfile(currentUser, { displayName: data.displayName });
      setCurrentUser(prevUser => prevUser ? { ...prevUser, displayName: data.displayName } : null);
      toast({ title: "Successo!", description: "Profilo aggiornato." });
    } catch (error: any) {
      console.error("Errore aggiornamento profilo:", error);
      toast({ title: "Errore Aggiornamento", description: error.message || "Impossibile aggiornare il profilo.", variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Impostazioni</h1>
        <p className="text-muted-foreground">Gestisci le informazioni della tua azienda e le preferenze dell'account.</p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6">
          <TabsTrigger value="company"><Building className="mr-2 h-4 w-4 hidden sm:inline-block"/>Azienda</TabsTrigger>
          <TabsTrigger value="profile"><UserCircle className="mr-2 h-4 w-4 hidden sm:inline-block"/>Profilo</TabsTrigger>
          <TabsTrigger value="notifications" disabled><Bell className="mr-2 h-4 w-4 hidden sm:inline-block"/>Notifiche</TabsTrigger>
          <TabsTrigger value="security" disabled><ShieldCheck className="mr-2 h-4 w-4 hidden sm:inline-block"/>Sicurezza</TabsTrigger>
          <TabsTrigger value="billing" disabled><CreditCard className="mr-2 h-4 w-4 hidden sm:inline-block"/>Fatturazione</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Informazioni Azienda</CardTitle>
              <CardDescription>Aggiorna i dettagli della tua attività.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit(onSubmitCompany)} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage 
                        src={companyLogoUrlValue || "https://placehold.co/100x100.png?text=Logo"} 
                        alt={companyForm.getValues("nome")} 
                        data-ai-hint="company logo"
                      />
                      <AvatarFallback>{(companyForm.getValues("nome") || "L").substring(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <input
                        type="file"
                        ref={logoFileInputRef}
                        onChange={handleLogoFileChange}
                        accept="image/png, image/jpeg, image/gif, image/webp"
                        className="hidden"
                    />
                    <Button 
                        variant="outline" 
                        type="button" 
                        onClick={() => logoFileInputRef.current?.click()}
                        disabled={isUploadingLogo || isSavingCompany}
                    >
                        {isUploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isUploadingLogo ? "Caricamento..." : "Cambia Logo"}
                    </Button>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={companyForm.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Azienda</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isSavingCompany || isUploadingLogo} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="email_contatto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Contatto Aziendale</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} disabled={isSavingCompany || isUploadingLogo} placeholder="info@azienda.com"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={companyForm.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Slug Pubblico Azienda</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="es: idraulica-rossi"
                                {...field}
                                className="pl-10"
                                disabled={isSavingCompany || isUploadingLogo}
                                onBlur={(e) => {
                                    const manualSlug = generateSlug(e.target.value);
                                    if (e.target.value.trim() === "") { 
                                        field.onChange(""); 
                                    } else if (e.target.value !== manualSlug) {
                                        field.onChange(manualSlug);
                                        companyForm.trigger("slug");
                                    }
                                    setIsSlugManuallyEditedCompany(true);
                                    field.onBlur();
                                }}
                                onChange={(e) => {
                                    field.onChange(e.target.value); 
                                    if (!isSlugManuallyEditedCompany && e.target.value !== generateSlug(companyNameValue) ) {
                                        setIsSlugManuallyEditedCompany(true);
                                    }
                                     companyForm.clearErrors('slug');
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            L'URL pubblico per ricevere richieste clienti sarà:
                            <code className="font-semibold text-primary text-xs break-all ml-1">
                              /richiedi-intervento?azienda={generateSlug(companySlugValue) || "..."}
                            </code>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="telefono_contatto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefono</FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} disabled={isSavingCompany || isUploadingLogo} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="indirizzo_completo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Indirizzo Completo</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isSavingCompany || isUploadingLogo} placeholder="Via Roma 1, 20121 Milano MI"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={isSavingCompany || isUploadingLogo} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {isSavingCompany && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salva Modifiche Azienda
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Profilo Utente</CardTitle>
              <CardDescription>Gestisci le informazioni del tuo account personale.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={currentUser?.photoURL || "https://placehold.co/100x100.png"} alt={profileForm.getValues("displayName")} data-ai-hint="person avatar"/>
                      <AvatarFallback>{(profileForm.getValues("displayName") || currentUser?.email?.substring(0,1) || "U").toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Button variant="outline" type="button" disabled>Cambia Foto Profilo (Prossimamente)</Button>
                  </div>
                  <Separator />
                  <FormField
                    control={profileForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isSavingProfile} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <Label htmlFor="userEmail">Email (Login)</Label>
                    <Input id="userEmail" type="email" value={currentUser?.email || ""} disabled />
                  </div>
                  <div>
                    <Label htmlFor="userRole">Ruolo</Label>
                    <Input id="userRole" value={"Amministratore"} disabled />
                  </div>
                  <Button type="submit" disabled={isSavingProfile} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                     {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salva Modifiche Profilo
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Impostazioni Notifiche</CardTitle>
              <CardDescription>Scegli come e quando ricevere le notifiche.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center h-48 flex flex-col justify-center items-center text-muted-foreground">
              <Bell className="h-12 w-12 mb-2" />
              <p>Funzionalità di notifica in arrivo.</p>
              <p className="text-sm">Potrai personalizzare le preferenze per email e notifiche in-app.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Sicurezza Account</CardTitle>
              <CardDescription>Modifica la password e gestisci le opzioni di sicurezza.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center h-48 flex flex-col justify-center items-center text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mb-2" />
              <p>Opzioni di sicurezza avanzate in arrivo.</p>
              <Button variant="outline" className="mt-4" type="button" disabled>Cambia Password (Prossimamente)</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Fatturazione e Abbonamento</CardTitle>
              <CardDescription>Visualizza il tuo piano attuale e la cronologia di fatturazione.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center h-48 flex flex-col justify-center items-center text-muted-foreground">
              <CreditCard className="h-12 w-12 mb-2" />
              <p>Dettagli di fatturazione e gestione abbonamento in arrivo.</p>
               <Button variant="outline" className="mt-4" type="button" disabled>Gestisci Abbonamento (Prossimamente)</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
