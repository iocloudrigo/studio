import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, PlusCircle, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data for requests - replace with actual data fetching
const mockRequests = [
  { id: "REQ001", customer: "Laura Bianchi", service: "Riparazione perdita", technician: "Mario Rossi", status: "Assegnato", date: "2024-07-15", priority: "Alta" },
  { id: "REQ002", customer: "Marco Verdi", service: "Installazione AC", technician: "Luigi Neri", status: "Completato", date: "2024-07-12", priority: "Media" },
  { id: "REQ003", customer: "Giulia Neri", service: "Manutenzione caldaia", technician: "Anna Gialli", status: "In attesa", date: "2024-07-18", priority: "Bassa" },
  { id: "REQ004", customer: "Paolo Serra", service: "Controllo impianto", technician: "-", status: "Nuova", date: "2024-07-20", priority: "Media" },
];

export default function RequestsPage() {
  // State for filters would go here, e.g., using React.useState
  // For now, it's a static display

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestione Richieste</h1>
          <p className="text-muted-foreground">Visualizza, assegna e monitora tutte le richieste di intervento.</p>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/dashboard/requests/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Nuova Richiesta Manuale
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 relative">
               <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
               <Input placeholder="Cerca per ID, cliente, servizio..." className="pl-10 w-full md:w-auto" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  <Filter className="mr-2 h-4 w-4" /> Filtra
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Filtra per Stato</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {["Nuova", "In attesa", "Assegnato", "Completato", "Annullato"].map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    // checked={...} onCheckedChange={...}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {mockRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">ID</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Cliente</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Servizio</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Tecnico</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Stato</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Data Richiesta</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Priorità</th>
                    <th className="p-3 text-right text-sm font-semibold text-muted-foreground">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {mockRequests.map((req) => (
                    <tr key={req.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 text-sm font-medium text-primary">{req.id}</td>
                      <td className="p-3 text-sm">{req.customer}</td>
                      <td className="p-3 text-sm">{req.service}</td>
                      <td className="p-3 text-sm">{req.technician}</td>
                      <td className="p-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          req.status === "Completato" ? "bg-green-100 text-green-700" :
                          req.status === "Assegnato" ? "bg-blue-100 text-blue-700" :
                          req.status === "In attesa" ? "bg-orange-100 text-orange-700" :
                          req.status === "Nuova" ? "bg-purple-100 text-purple-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm">{req.date}</td>
                      <td className="p-3 text-sm">{req.priority}</td>
                      <td className="p-3 text-right text-sm">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/requests/${req.id}`}>Visualizza</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="mx-auto h-16 w-16 mb-4" />
              <p className="text-lg mb-2">Nessuna richiesta trovata.</p>
              <p className="text-sm">Prova a modificare i filtri o aggiungi una nuova richiesta.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
