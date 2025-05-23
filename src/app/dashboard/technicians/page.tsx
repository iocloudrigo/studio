import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, PlusCircle, Search, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Mock data for technicians
const mockTechnicians = [
  { id: "TECH001", name: "Mario Rossi", email: "mario.rossi@example.com", phone: "3331234567", skills: ["Idraulica", "Riscaldamento"], status: "Disponibile", avatar: "https://placehold.co/40x40.png" },
  { id: "TECH002", name: "Luigi Neri", email: "luigi.neri@example.com", phone: "3339876543", skills: ["Elettricità", "Condizionamento"], status: "Occupato", avatar: "https://placehold.co/40x40.png" },
  { id: "TECH003", name: "Anna Gialli", email: "anna.gialli@example.com", phone: "3335551122", skills: ["Caldaie", "Gas"], status: "In Ferie", avatar: "https://placehold.co/40x40.png" },
];

export default function TechniciansPage() {
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
               <Input placeholder="Cerca per nome, email, competenza..." className="pl-10 w-full md:w-auto" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mockTechnicians.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Nome</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Contatti</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Competenze</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Stato</th>
                    <th className="p-3 text-right text-sm font-semibold text-muted-foreground">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {mockTechnicians.map((tech) => (
                    <tr key={tech.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={tech.avatar} alt={tech.name} data-ai-hint="person avatar" />
                            <AvatarFallback>{tech.name.substring(0,2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{tech.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <div>{tech.email}</div>
                        <div className="text-xs text-muted-foreground">{tech.phone}</div>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {tech.skills.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <Badge variant={
                          tech.status === "Disponibile" ? "default" :
                          tech.status === "Occupato" ? "outline" :
                          "destructive"
                        }
                        className={
                            tech.status === "Disponibile" ? "bg-green-500 hover:bg-green-600 text-white" :
                            tech.status === "Occupato" ? "bg-orange-500 hover:bg-orange-600 text-white" :
                            "bg-red-500 hover:bg-red-600 text-white"
                        }>
                          {tech.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-sm">
                        <Button variant="ghost" size="icon" className="hover:text-primary" asChild>
                          <Link href={`/dashboard/technicians/edit/${tech.id}`} title="Modifica">
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:text-destructive" title="Elimina">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="mx-auto h-16 w-16 mb-4" />
              <p className="text-lg mb-2">Nessun tecnico trovato.</p>
              <p className="text-sm">Inizia aggiungendo il tuo primo tecnico.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
