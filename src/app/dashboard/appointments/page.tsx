import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, PlusCircle, Search, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Mock data for appointments - replace with actual data fetching
const mockAppointments = [
  { id: "APP001", requestId: "REQ001", customer: "Laura Bianchi", technician: "Mario Rossi", service: "Riparazione perdita", dateTime: "2024-07-22 10:00", status: "Confermato" },
  { id: "APP002", requestId: "REQ005", customer: "Franco Galli", technician: "Luigi Neri", service: "Sostituzione rubinetto", dateTime: "2024-07-23 14:30", status: "Da Confermare" },
  { id: "APP003", requestId: "REQ008", customer: "Elena Fiore", technician: "Anna Gialli", service: "Verifica impianto gas", dateTime: "2024-07-24 09:00", status: "Completato" },
];

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestione Appuntamenti</h1>
          <p className="text-muted-foreground">Visualizza e organizza gli appuntamenti confermati.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" /> Sincronizza Calendario
            </Button>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/dashboard/appointments/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Nuovo Appuntamento
            </Link>
            </Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 relative">
               <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
               <Input placeholder="Cerca per cliente, tecnico, servizio..." className="pl-10 w-full md:w-auto" />
            </div>
            {/* Add calendar view toggle or date range picker here if needed */}
          </div>
        </CardHeader>
        <CardContent>
          {mockAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">ID App.</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Cliente</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Servizio</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Tecnico</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Data e Ora</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Stato</th>
                    <th className="p-3 text-right text-sm font-semibold text-muted-foreground">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {mockAppointments.map((app) => (
                    <tr key={app.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 text-sm font-medium text-primary">{app.id}</td>
                      <td className="p-3 text-sm">{app.customer}</td>
                      <td className="p-3 text-sm">{app.service}</td>
                      <td className="p-3 text-sm">{app.technician}</td>
                      <td className="p-3 text-sm">{app.dateTime}</td>
                      <td className="p-3 text-sm">
                        <Badge variant={
                          app.status === "Confermato" ? "default" :
                          app.status === "Completato" ? "secondary" : // Assuming 'secondary' is visually distinct for completed
                          app.status === "Da Confermare" ? "outline" : // 'outline' for pending
                          "destructive" // for "Annullato" or other critical states
                        }
                        className={
                            app.status === "Confermato" ? "bg-green-500 hover:bg-green-600 text-white" :
                            app.status === "Completato" ? "bg-blue-500 hover:bg-blue-600 text-white" :
                            app.status === "Da Confermare" ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""
                        }>
                          {app.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-sm">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/appointments/${app.id}`}>Dettagli</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="mx-auto h-16 w-16 mb-4" />
              <p className="text-lg mb-2">Nessun appuntamento trovato.</p>
              <p className="text-sm">Crea un nuovo appuntamento o sincronizza il tuo calendario.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
