
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, PlusCircle, Search, Edit, Trash2, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, Timestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { TechnicianDetailsSheet, type TechnicianFormValues as TechnicianSheetFormValues } from "@/components/dashboard/technicians/TechnicianDetailsSheet"; 

export interface Technician {
  id: string;
  id_azienda: string;
  nome_completo: string;
  email?: string;
  telefono?: string;
  citta?: string;
  competenze?: string[];
  stato: string;
  data_creazione: Timestamp;
}

export default function TechniciansPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { toast } = useToast();

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedTechnicianForSheet, setSelectedTechnicianForSheet] = useState<Technician | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setCompanyId(user.uid);
      } else {
        setCurrentUser(null);
        setCompanyId(null);
        setTechnicians([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchTechnicians = useCallback(async (currentCompanyId: string) => {
    if (!currentCompanyId) {
      setIsLoading(false);
      setTechnicians([]);
      return;
    }
    setIsLoading(true);
    try {
      const techniciansQuery = query(
        collection(db, "tecnici"),
        where("id_azienda", "==", currentCompanyId),
        orderBy("data_creazione", "desc")
      );
      const querySnapshot = await getDocs(techniciansQuery);
      const fetchedTechnicians = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as Technician));
      setTechnicians(fetchedTechnicians);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      toast({ title: "Errore Caricamento Tecnici", description: "Impossibile caricare l'elenco dei tecnici.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (companyId) {
      fetchTechnicians(companyId);
    }
  }, [companyId, fetchTechnicians]);

  const filteredTechnicians = useMemo(() => {
    return technicians.filter(tech => {
      const searchTermLower = searchTerm.toLowerCase();
      return tech.nome_completo.toLowerCase().includes(searchTermLower) ||
             (tech.email && tech.email.toLowerCase().includes(searchTermLower)) ||
             (tech.citta && tech.citta.toLowerCase().includes(searchTermLower)) ||
             (tech.competenze && tech.competenze.some(skill => skill.toLowerCase().includes(searchTermLower)));
    });
  }, [technicians, searchTerm]);

  const handleOpenDetailsSheet = (technician: Technician) => {
    setSelectedTechnicianForSheet(technician);
    setIsSheetOpen(true);
  };

  const handleUpdateTechnician = async (technicianId: string, data: TechnicianSheetFormValues) => {
    if (!companyId) return;
    try {
      const technicianDocRef = doc(db, "tecnici", technicianId);
      const competenzeArray = typeof data.competenze === 'string' 
        ? data.competenze.split(',').map(c => c.trim()).filter(c => c) 
        : Array.isArray(data.competenze) ? data.competenze : [];

      await updateDoc(technicianDocRef, {
        ...data,
        competenze: competenzeArray,
        email: data.email || null,
        telefono: data.telefono || null,
      });
      toast({ title: "Successo!", description: "Tecnico aggiornato con successo." });
      if (companyId) fetchTechnicians(companyId);
    } catch (error) {
      console.error("Error updating technician:", error);
      toast({ title: "Errore Aggiornamento", description: "Impossibile aggiornare il tecnico.", variant: "destructive" });
      throw error;
    }
  };

  const handleDeleteTechnician = async (technicianId: string) => {
    if (!companyId) return;
    try {
      await deleteDoc(doc(db, "tecnici", technicianId));
      toast({ title: "Successo!", description: "Tecnico eliminato con successo." });
      if (companyId) fetchTechnicians(companyId);
    } catch (error) {
      console.error("Error deleting technician:", error);
      toast({ title: "Errore Eliminazione", description: "Impossibile eliminare il tecnico.", variant: "destructive" });
      throw error;
    }
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "disponibile":
        return "bg-green-100 text-green-700 border-green-200";
      case "occupato":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "in ferie":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "non disponibile":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestione Tecnici</h1>
          <p className="text-muted-foreground">Aggiungi, modifica e visualizza i tuoi tecnici.</p>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/dashboard/technicians/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Tecnico
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 relative">
               <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
               <Input 
                 placeholder="Cerca per nome, email, città, competenza..." 
                 className="pl-10 w-full md:w-auto"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Caricamento tecnici...</p>
            </div>
          ) : filteredTechnicians.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-22rem)] lg:h-[calc(100vh-20rem)]">
                <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                      <tr className="border-b"><th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Nome</th><th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Contatti</th><th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Città</th><th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Competenze</th><th className="p-3 text-left text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Stato</th><th className="p-3 text-right text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">Azioni</th></tr>
                    </thead>
                    <tbody>
                    {filteredTechnicians.map((tech) => (
                        <tr key={tech.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm">
                            <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://placehold.co/40x40.png?text=${tech.nome_completo.substring(0,2).toUpperCase()}`} alt={tech.nome_completo} data-ai-hint="person initial"/>
                                <AvatarFallback>{tech.nome_completo.substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-primary whitespace-nowrap">{tech.nome_completo}</span>
                            </div>
                        </td>
                        <td className="p-3 text-sm whitespace-nowrap">
                            <div>{tech.email || "N/D"}</div>
                            <div className="text-xs text-muted-foreground">{tech.telefono || "N/D"}</div>
                        </td>
                        <td className="p-3 text-sm whitespace-nowrap">{tech.citta || "N/D"}</td>
                        <td className="p-3 text-sm">
                            <div className="flex flex-wrap gap-1">
                            {(tech.competenze && tech.competenze.length > 0) ? tech.competenze.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>) : <span className="text-muted-foreground">N/D</span>}
                            </div>
                        </td>
                        <td className="p-3 text-sm whitespace-nowrap">
                            <Badge className={getStatusBadgeClass(tech.stato)}>
                            {tech.stato}
                            </Badge>
                        </td>
                        <td className="p-3 text-right text-sm whitespace-nowrap">
                            <Button variant="outline" size="sm" onClick={() => handleOpenDetailsSheet(tech)}>
                                <Edit className="mr-1 h-3 w-3"/> Dettagli
                            </Button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="mx-auto h-16 w-16 mb-4" />
              <p className="text-lg mb-2">Nessun tecnico trovato.</p>
              <p className="text-sm">Inizia aggiungendo il tuo primo tecnico.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTechnicianForSheet && (
        <TechnicianDetailsSheet
          isOpen={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          technician={selectedTechnicianForSheet}
          onUpdateTechnician={handleUpdateTechnician}
          onDeleteTechnician={handleDeleteTechnician}
        />
      )}
    </div>
  );
}
