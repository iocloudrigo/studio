import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { FileText, CalendarDays, PlusCircle, Lightbulb } from "lucide-react";

export default function DashboardPage() {
  // Mock data - replace with actual data fetching
  const stats = {
    activeRequests: 12,
    pendingAppointments: 5,
    techniciansAvailable: 8,
  };

  const recentRequests = [
    { id: "REQ001", summary: "Riparazione perdita d'acqua cucina", status: "In attesa di tecnico", customer: "Laura Bianchi" },
    { id: "REQ002", summary: "Installazione nuovo condizionatore", status: "Tecnico assegnato", customer: "Marco Verdi" },
    { id: "REQ003", summary: "Manutenzione caldaia annuale", status: "Completato", customer: "Giulia Neri" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Aziendale</h1>
          <p className="text-muted-foreground">Panoramica delle attività e gestione interventi.</p>
        </div>
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/dashboard/requests/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Nuova Richiesta
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Richieste Attive</CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRequests}</div>
            <p className="text-xs text-muted-foreground">Interventi in corso o da assegnare</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appuntamenti Pendenti</CardTitle>
            <CalendarDays className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingAppointments}</div>
            <p className="text-xs text-muted-foreground">Da confermare o programmare</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tecnici Disponibili</CardTitle>
            <Lightbulb className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.techniciansAvailable}</div>
            <p className="text-xs text-muted-foreground">Pronti per nuovi incarichi</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ultime Richieste</CardTitle>
          <CardDescription>Visualizza le richieste di intervento più recenti.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">ID</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Cliente</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Sommario</th>
                    <th className="p-3 text-left text-sm font-semibold text-muted-foreground">Stato</th>
                    <th className="p-3 text-right text-sm font-semibold text-muted-foreground">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((req) => (
                    <tr key={req.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 text-sm">{req.id}</td>
                      <td className="p-3 text-sm">{req.customer}</td>
                      <td className="p-3 text-sm">{req.summary}</td>
                      <td className="p-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          req.status === "Completato" ? "bg-green-100 text-green-700" :
                          req.status === "Tecnico assegnato" ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-3 text-right text-sm">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/requests/${req.id}`}>Dettagli</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-2" />
              <p>Nessuna richiesta recente trovata.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placeholder for other sections like upcoming appointments or AI suggestions summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Prossimi Appuntamenti</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mb-2" />
            <p>Nessun appuntamento imminente.</p>
            <Button variant="link" asChild className="mt-2 text-accent"><Link href="/dashboard/appointments">Vedi tutti</Link></Button>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Suggerimenti AI</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
             <Image src="https://placehold.co/400x200.png" alt="AI suggestions placeholder" width={200} height={100} data-ai-hint="abstract technology" className="rounded-md mb-2 opacity-70" />
            <p>L'AI è pronta ad assisterti.</p>
            <Button variant="link" asChild className="mt-2 text-accent"><Link href="/dashboard/requests/suggestions">Analizza richieste</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
