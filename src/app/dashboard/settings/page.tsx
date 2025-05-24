
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
import { Building, UserCircle, Bell, ShieldCheck, CreditCard, Loader2, LinkIcon, Users, PlusCircle, Mail, BriefcaseIcon, Edit, KeyRound, LogOut } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged, updateProfile, type User as FirebaseUser, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc, query, where, collection, getDocs, addDoc, serverTimestamp, orderBy, updateDoc, deleteDoc } from "firebase/firestore";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollaboratorDetailsSheet, type CollaboratorEditFormValues } from "@/components/dashboard/settings/CollaboratorDetailsSheet";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// Rimosso import non più necessario: import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useActiveCollaborator } from '@/app/dashboard/layout'; // Importa il custom hook

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
  email: z.string().email({ message: "Indirizzo email non valido." }),
  newPassword: z.string().optional(),
  confirmNewPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && !data.confirmNewPassword) {
    return false; 
  }
  if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
    return false; 
  }
  if (data.newPassword && data.newPassword.length < 6) {
    return false; 
  }
  return true;
}, {
  message: "Le password non coincidono o la nuova password è troppo corta (min. 6 caratteri).",
  path: ["confirmNewPassword"], 
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const collaboratorFormSchema = z.object({
  nome_completo: z.string().min(2, { message: "Il nome completo è richiesto."}),
  email: z.string().email({ message: "Indirizzo email non valido."}),
  ruolo: z.string().min(1, { message: "Il ruolo è richiesto."}),
});
export type CollaboratorFormValues = z.infer<typeof collaboratorFormSchema>; 

export interface Collaborator { 
  id: string;
  nome_completo: string;
  email: string;
  ruolo: string;
  id_azienda: string; 
}

const generateSlug = (name: string): string => {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

const RUOLI_COLLABORATORI = ["Amministratore", "Operatore", "Responsabile"];


export default function SettingsPage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<Partial<CompanyFormValues & { email_admin?: string; sede_citta?: string }>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSlugManuallyEditedCompany, setIsSlugManuallyEditedCompany] = useState(false);
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);

  const [selectedCollaboratorForSheet, setSelectedCollaboratorForSheet] = useState<Collaborator | null>(null);
  const [isCollaboratorSheetOpen, setIsCollaboratorSheetOpen] = useState(false);

  // Utilizza il context per activeCollaborator
  const { activeCollaborator, isLoadingActiveCollaborator } = useActiveCollaborator();
  const activeCollaboratorRole = activeCollaborator?.ruolo || null;
  
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
      email: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const collaboratorForm = useForm<CollaboratorFormValues>({
    resolver: zodResolver(collaboratorFormSchema),
    defaultValues: {
      nome_completo: "",
      email: "",
      ruolo: "",
    },
  });

  const fetchCollaborators = useCallback(async (currentCompanyId: string) => {
    if (!currentCompanyId) return;
    setIsLoadingCollaborators(true);
    try {
      const q = query(collection(db, "collaboratori_azienda"), where("id_azienda", "==", currentCompanyId), orderBy("data_creazione", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedCollaborators = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as Collaborator));
      setCollaborators(fetchedCollaborators);
    } catch (error) {
      console.error("Errore nel caricare i collaboratori:", error);
      toast({ title: "Errore Caricamento Collaboratori", description: "Impossibile caricare l'elenco dei collaboratori.", variant: "destructive" });
    } finally {
      setIsLoadingCollaborators(false);
    }
  }, [toast]);

  const ensureAdminCollaboratorExists = async (user: FirebaseUser) => {
    if (!user || !user.uid || !user.email) return;

    const adminEmail = user.email;
    const adminName = user.displayName || "Amministratore";
    const adminCompanyId = user.uid;

    const collaboratorsRef = collection(db, "collaboratori_azienda");
    const q = query(collaboratorsRef, where("id_azienda", "==", adminCompanyId), where("email", "==", adminEmail));
    
    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        const adminCollaboratorData = {
          id_azienda: adminCompanyId,
          nome_completo: adminName,
          email: adminEmail,
          ruolo: "Amministratore", 
          data_creazione: serverTimestamp(),
        };
        await addDoc(collaboratorsRef, adminCollaboratorData);
        console.log("Collaboratore amministratore creato:", adminEmail);
        if (companyId) fetchCollaborators(companyId);
      } else {
        const adminCollabDoc = querySnapshot.docs[0];
        let needsUpdate = false;
        const updates: Partial<Collaborator> = {};
        if (adminCollabDoc.data().nome_completo !== adminName) {
          updates.nome_completo = adminName;
          needsUpdate = true;
        }
        if (adminCollabDoc.data().ruolo !== "Amministratore") { 
          updates.ruolo = "Amministratore";
          needsUpdate = true;
        }
        if (needsUpdate) {
          await updateDoc(adminCollabDoc.ref, updates);
          console.log("Dettagli collaboratore amministratore aggiornati.");
          if (companyId) fetchCollaborators(companyId);
        }
      }
    } catch (error) {
      console.error("Errore durante la verifica/creazione del collaboratore amministratore:", error);
      toast({ title: "Errore Sincronizzazione Admin", description: "Impossibile sincronizzare l'amministratore come collaboratore.", variant: "destructive" });
    }
  };


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setCompanyId(user.uid);
        profileForm.reset({ 
          displayName: user.displayName || "",
          email: user.email || "",
          newPassword: "",
          confirmNewPassword: ""
        });

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
              logoUrl: data.logoUrl || "",
            };
            setCompanyData(loadedCompanyData);
            companyForm.reset(loadedCompanyData);
            if (data.slug) setIsSlugManuallyEditedCompany(true);
            
            await ensureAdminCollaboratorExists(user);
            fetchCollaborators(user.uid); 
          } else {
             companyForm.reset({
                logoUrl: "",
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
        setCompanyId(null);
      }
      setLoadingData(false);
    });

    return () => unsubscribe();
  }, [companyForm, profileForm, toast, fetchCollaborators, companyId]);

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
      const isNewCompany = !currentCompanyDataSnap.exists();

      let finalSlug = data.slug;
      if (data.slug.trim() === "") {
        finalSlug = generateSlug(data.nome) || `azienda-${currentUser.uid.substring(0,6)}`;
      } else {
        finalSlug = generateSlug(data.slug);
      }
      
      const validatedData = companyFormSchema.parse({...data, slug: finalSlug});

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
        logoUrl: validatedData.logoUrl || null,
        email_admin: currentUser.email, 
        uid_admin: currentUser.uid,
      };

      await setDoc(companyDocRef, dataToUpdate, { merge: true });
      
      if (isNewCompany) { 
        await ensureAdminCollaboratorExists(currentUser);
      }

      setCompanyData(prev => ({...prev, ...dataToUpdate}));
      companyForm.reset(dataToUpdate); 
      setIsSlugManuallyEditedCompany(true); 
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
    if (!currentUser || !companyId) {
      toast({ title: "Errore", description: "Utente non autenticato o ID azienda mancante.", variant: "destructive" });
      return;
    }
    
    if (activeCollaboratorRole !== "Amministratore") {
      toast({
        title: "Azione Non Permessa",
        description: "Devi operare come 'Amministratore' per modificare i dettagli del profilo principale.",
        variant: "destructive"
      });
      setIsSavingProfile(false);
      return;
    }
    
    setIsSavingProfile(true);
    let profileUpdated = false;

    try {
      if (data.displayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName: data.displayName });
        profileUpdated = true;
      }

      if (data.email !== currentUser.email) {
        try {
          await updateEmail(currentUser, data.email);
          const companyDocRef = doc(db, "aziende", currentUser.uid);
          await updateDoc(companyDocRef, { email_admin: data.email });
          profileUpdated = true;
        } catch (emailError: any) {
          console.error("Errore aggiornamento email Firebase Auth:", emailError);
          let desc = `Impossibile aggiornare l'email: ${emailError.message}`;
          if (emailError.code === 'auth/requires-recent-login') desc = "Per modificare l'email, è necessario un login recente. Prova a fare logout e login.";
          else if (emailError.code === 'auth/email-already-in-use') desc = "L'indirizzo email è già in uso da un altro account.";
          toast({ title: "Errore Email", description: desc, variant: "destructive" });
          setIsSavingProfile(false);
          return; 
        }
      }

      if (data.newPassword) {
        if (data.newPassword.length < 6) {
          profileForm.setError("newPassword", { message: "La password deve contenere almeno 6 caratteri." });
          setIsSavingProfile(false); return;
        }
        if (data.newPassword !== data.confirmNewPassword) {
          profileForm.setError("confirmNewPassword", { message: "Le password non coincidono." });
          setIsSavingProfile(false); return;
        }
        try {
          await updatePassword(currentUser, data.newPassword);
          profileUpdated = true;
          profileForm.reset({ ...data, newPassword: "", confirmNewPassword: "" });
        } catch (passwordError: any) {
          console.error("Errore aggiornamento password Firebase Auth:", passwordError);
          let desc = `Impossibile aggiornare la password: ${passwordError.message}`;
          if (passwordError.code === 'auth/requires-recent-login') desc = "Per modificare la password, è necessario un login recente. Prova a fare logout e login.";
          else if (passwordError.code === 'auth/weak-password') desc = "La password è troppo debole.";
          toast({ title: "Errore Password", description: desc, variant: "destructive" });
          setIsSavingProfile(false);
          return;
        }
      }

      const currentAuthUserAfterPossibleUpdates = auth.currentUser; 
      if (currentAuthUserAfterPossibleUpdates) {
        const adminEmailForQuery = currentAuthUserAfterPossibleUpdates.email || "";
        const adminDisplayNameForUpdate = currentAuthUserAfterPossibleUpdates.displayName || data.displayName;

        const adminCollaboratorsRef = collection(db, "collaboratori_azienda");
        const oldEmail = currentUser.email; 
        let adminCollabDocRef;

        const qOld = query(adminCollaboratorsRef, where("id_azienda", "==", currentUser.uid), where("email", "==", oldEmail));
        const oldAdminCollabSnapshot = await getDocs(qOld);

        if (!oldAdminCollabSnapshot.empty) {
          adminCollabDocRef = oldAdminCollabSnapshot.docs[0].ref;
          await updateDoc(adminCollabDocRef, { 
            nome_completo: adminDisplayNameForUpdate,
            email: adminEmailForQuery, 
            ruolo: "Amministratore" 
          });
        } else {
          const qNew = query(adminCollaboratorsRef, where("id_azienda", "==", currentUser.uid), where("email", "==", adminEmailForQuery));
          const newAdminCollabSnapshot = await getDocs(qNew);
          if (newAdminCollabSnapshot.empty) {
            await addDoc(adminCollaboratorsRef, {
              id_azienda: currentUser.uid,
              nome_completo: adminDisplayNameForUpdate,
              email: adminEmailForQuery,
              ruolo: "Amministratore",
              data_creazione: serverTimestamp(),
            });
          } else {
            adminCollabDocRef = newAdminCollabSnapshot.docs[0].ref;
             await updateDoc(adminCollabDocRef, { 
                nome_completo: adminDisplayNameForUpdate,
                ruolo: "Amministratore" 
            });
          }
        }
        if (companyId) fetchCollaborators(companyId);
      }


      if (profileUpdated) {
        toast({ title: "Successo!", description: "Profilo aggiornato." });
      } else {
        toast({ title: "Info", description: "Nessuna modifica rilevata nel profilo." });
      }

    } catch (error: any) {
      console.error("Errore aggiornamento profilo:", error);
      toast({ title: "Errore Aggiornamento", description: error.message || "Impossibile aggiornare il profilo.", variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function onAddCollaborator(data: CollaboratorFormValues) {
    if (!companyId) {
      toast({ title: "Errore", description: "ID Azienda non trovato.", variant: "destructive" });
      return;
    }
    setIsAddingCollaborator(true);
    try {
      const q = query(collection(db, "collaboratori_azienda"), where("id_azienda", "==", companyId), where("email", "==", data.email));
      const emailCheckSnapshot = await getDocs(q);
      if (!emailCheckSnapshot.empty) {
        collaboratorForm.setError("email", { type: "manual", message: "Questa email è già in uso per un collaboratore." });
        toast({ title: "Errore", description: "Email già utilizzata per un collaboratore.", variant: "destructive" });
        setIsAddingCollaborator(false);
        return;
      }

      const collaboratorData = {
        ...data,
        id_azienda: companyId,
        data_creazione: serverTimestamp(),
      };
      await addDoc(collection(db, "collaboratori_azienda"), collaboratorData);
      toast({ title: "Successo!", description: "Nuovo collaboratore aggiunto." });
      collaboratorForm.reset();
      if (companyId) fetchCollaborators(companyId); 
    } catch (error: any) {
      console.error("Errore aggiunta collaboratore:", error);
      toast({ title: "Errore Aggiunta", description: error.message || "Impossibile aggiungere il collaboratore.", variant: "destructive" });
    } finally {
      setIsAddingCollaborator(false);
    }
  }

  const handleOpenCollaboratorSheet = (collaborator: Collaborator) => {
    setSelectedCollaboratorForSheet(collaborator);
    setIsCollaboratorSheetOpen(true);
  };

  const handleUpdateCollaborator = async (collaboratorId: string, data: CollaboratorEditFormValues) => {
    if (!companyId || !currentUser) return;

    const collaboratorToUpdate = collaborators.find(c => c.id === collaboratorId);
    if (collaboratorToUpdate?.email === currentUser.email && data.email !== currentUser.email && collaboratorToUpdate.ruolo === "Amministratore") {
        toast({title: "Azione non permessa", description: "L'email del profilo Amministratore principale deve essere modificata tramite il form 'Profilo Utente Amministratore'.", variant: "destructive"});
        throw new Error("Cannot change primary admin email here.");
    }
    
    if (data.email !== collaboratorToUpdate?.email) {
      const q = query(collection(db, "collaboratori_azienda"), where("id_azienda", "==", companyId), where("email", "==", data.email));
      const emailCheckSnapshot = await getDocs(q);
      if (!emailCheckSnapshot.empty && emailCheckSnapshot.docs.some(d => d.id !== collaboratorId)) {
        toast({ title: "Errore", description: "Questa email è già in uso da un altro collaboratore.", variant: "destructive" });
        throw new Error("Email già in uso");
      }
    }

    try {
      const collaboratorDocRef = doc(db, "collaboratori_azienda", collaboratorId);
      await updateDoc(collaboratorDocRef, data); 
      toast({ title: "Successo!", description: "Collaboratore aggiornato."});
      fetchCollaborators(companyId);
    } catch (error: any) {
      console.error("Errore aggiornamento collaboratore:", error);
      if (error.message !== "Email già in uso" && error.message !== "Cannot change primary admin email here.") {
        toast({ title: "Errore Aggiornamento", description: error.message || "Impossibile aggiornare il collaboratore.", variant: "destructive" });
      }
      throw error; 
    }
  };
  
  const handleDeleteCollaborator = async (collaboratorId: string) => {
    if (!companyId || !currentUser) return;
    
    const collaboratorToDelete = collaborators.find(c => c.id === collaboratorId);
    if (collaboratorToDelete?.email === currentUser.email && collaboratorToDelete?.ruolo === "Amministratore") {
      toast({ title: "Azione non permessa", description: "L'amministratore principale non può essere eliminato.", variant: "destructive"});
      return;
    }

    try {
      const collaboratorDocRef = doc(db, "collaboratori_azienda", collaboratorId);
      await deleteDoc(collaboratorDocRef);
      toast({ title: "Successo!", description: "Collaboratore eliminato."});
      fetchCollaborators(companyId);
    } catch (error: any) {
      console.error("Errore eliminazione collaboratore:", error);
      toast({ title: "Errore Eliminazione", description: error.message || "Impossibile eliminare il collaboratore.", variant: "destructive" });
      throw error; 
    }
  };

  const canEditAdminProfile = activeCollaboratorRole === "Amministratore";

  if (loadingData || isLoadingActiveCollaborator) { // Considera anche isLoadingActiveCollaborator
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
          <TabsTrigger value="profile"><UserCircle className="mr-2 h-4 w-4 hidden sm:inline-block"/>Profilo & Utenti</TabsTrigger>
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
                     <Button 
                        variant="outline" 
                        type="button" 
                        disabled
                        onClick={() => {
                          toast({title: "Info", description: "Funzionalità di caricamento logo (Prossimamente)."})
                        }}
                    >
                        Cambia Logo (Prossimamente) 
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
                            <Input {...field} disabled={isSavingCompany} />
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
                            <Input type="email" {...field} disabled={isSavingCompany} placeholder="info@azienda.com"/>
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
                                disabled={isSavingCompany}
                                onBlur={(e) => {
                                    const manualSlug = generateSlug(e.target.value);
                                    if (e.target.value.trim() === "" && companyNameValue) { 
                                        field.onChange(generateSlug(companyNameValue));
                                        companyForm.trigger("slug");
                                    } else if (e.target.value.trim() !== "" && e.target.value !== manualSlug) {
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
                            <Input type="tel" {...field} disabled={isSavingCompany} />
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
                            <Input {...field} disabled={isSavingCompany} placeholder="Via Roma 1, 20121 Milano MI"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={isSavingCompany} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {isSavingCompany && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salva Modifiche Azienda
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Profilo Utente Amministratore</CardTitle>
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
                          <FormLabel>Nome Completo (Visibile Internamente)</FormLabel>
                          <FormControl>
                             <div className="relative">
                                <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input {...field} className="pl-10" disabled={isSavingProfile || !canEditAdminProfile} />
                              </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (Login)</FormLabel>
                           <FormControl>
                             <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input type="email" className="pl-10" {...field} disabled={isSavingProfile || !canEditAdminProfile} />
                              </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={profileForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nuova Password (lascia vuoto per non modificare)</FormLabel>
                           <FormControl>
                             <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input type="password" placeholder="••••••••" className="pl-10" {...field} disabled={isSavingProfile || !canEditAdminProfile} />
                              </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={profileForm.control}
                      name="confirmNewPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conferma Nuova Password</FormLabel>
                           <FormControl>
                             <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input type="password" placeholder="••••••••" className="pl-10" {...field} disabled={isSavingProfile || !canEditAdminProfile} />
                              </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div>
                      <Label htmlFor="userRole">Ruolo Principale</Label>
                      <Input id="userRole" value={"Amministratore Azienda"} disabled />
                    </div>
                    <Button type="submit" disabled={isSavingProfile || !canEditAdminProfile} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                       {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salva Modifiche Profilo
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Aggiungi Nuovo Collaboratore</CardTitle>
                <CardDescription>Inserisci i dettagli per un nuovo utente collaboratore.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...collaboratorForm}>
                  <form onSubmit={collaboratorForm.handleSubmit(onAddCollaborator)} className="space-y-6">
                    <FormField
                      control={collaboratorForm.control}
                      name="nome_completo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input placeholder="Mario Rossi" {...field} className="pl-10" disabled={isAddingCollaborator} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={collaboratorForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Collaboratore</FormLabel>
                          <FormControl>
                             <div className="relative">
                              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input type="email" placeholder="collaboratore@email.com" className="pl-10" {...field} disabled={isAddingCollaborator} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={collaboratorForm.control}
                      name="ruolo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ruolo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isAddingCollaborator}>
                            <FormControl>
                              <div className="relative">
                                <BriefcaseIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <SelectTrigger className="pl-10">
                                  <SelectValue placeholder="Seleziona un ruolo..." />
                                </SelectTrigger>
                              </div>
                            </FormControl>
                            <SelectContent>
                              {RUOLI_COLLABORATORI.map(ruolo => (
                                <SelectItem key={ruolo} value={ruolo}>{ruolo}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isAddingCollaborator} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      {isAddingCollaborator ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                      Aggiungi Collaboratore
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Collaboratori Registrati</CardTitle>
              <CardDescription>Elenco dei collaboratori che possono gestire le richieste per la tua azienda.</CardDescription>
            </CardHeader>
            <CardContent>              
              {isLoadingCollaborators ? (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Caricamento collaboratori...</p>
                </div>
              ) : collaborators.length > 0 ? (
                <ul className="space-y-3">
                  {collaborators.map(collab => (
                    <li key={collab.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                         <Avatar className="h-9 w-9">
                            <AvatarImage src={`https://placehold.co/40x40.png?text=${collab.nome_completo.substring(0,1).toUpperCase()}`} alt={collab.nome_completo} data-ai-hint="person letter"/>
                            <AvatarFallback>{collab.nome_completo.substring(0,2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        <div>
                          <p className="font-medium">{collab.nome_completo}</p>
                          <p className="text-xs text-muted-foreground">{collab.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm bg-secondary text-secondary-foreground px-2 py-1 rounded-full">{collab.ruolo}</span>
                        <Button variant="outline" size="sm" onClick={() => handleOpenCollaboratorSheet(collab)}>
                           <Edit className="mr-1 h-3 w-3" /> Dettagli
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="mx-auto h-10 w-10 mb-2" />
                  <p>Nessun collaboratore aggiunto per questa azienda.</p>
                </div>
              )}
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
               <Button variant="outline" className="mt-4" type="button" onClick={() => toast({title: "Info", description: "Funzionalità cambio password (Prossimamente). Per ora, usa il form nel profilo."})}>
                Cambia Password (Prossimamente)
              </Button>
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
      
      {selectedCollaboratorForSheet && (
        <CollaboratorDetailsSheet
          isOpen={isCollaboratorSheetOpen}
          onOpenChange={setIsCollaboratorSheetOpen}
          collaborator={selectedCollaboratorForSheet}
          onUpdateCollaborator={handleUpdateCollaborator}
          onDeleteCollaborator={handleDeleteCollaborator}
        />
      )}
    </div>
  );
}
