import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building, UserCircle, Bell, ShieldCheck, CreditCard } from "lucide-react";

export default function SettingsPage() {
  // Mock company data - replace with actual data from context/DB
  const company = {
    name: "Incastro Solutions S.R.L.",
    email: "info@incastrosolutions.com",
    phone: "02 1234567",
    address: "Via Roma 1, 20121 Milano MI",
    logoUrl: "https://placehold.co/100x100.png?text=Logo",
  };

  // Mock user data
  const user = {
    name: "Mario Rossi",
    email: "mario.rossi@incastrosolutions.com",
    role: "Amministratore",
    avatarUrl: "https://placehold.co/100x100.png",
  };


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
          <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4 hidden sm:inline-block"/>Notifiche</TabsTrigger>
          <TabsTrigger value="security"><ShieldCheck className="mr-2 h-4 w-4 hidden sm:inline-block"/>Sicurezza</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="mr-2 h-4 w-4 hidden sm:inline-block"/>Fatturazione</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Informazioni Azienda</CardTitle>
              <CardDescription>Aggiorna i dettagli della tua attività.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={company.logoUrl} alt={company.name} data-ai-hint="company logo"/>
                  <AvatarFallback>{company.name.substring(0,1)}</AvatarFallback>
                </Avatar>
                <Button variant="outline">Cambia Logo</Button>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="companyName">Nome Azienda</Label>
                  <Input id="companyName" defaultValue={company.name} />
                </div>
                <div>
                  <Label htmlFor="companyEmail">Email Aziendale</Label>
                  <Input id="companyEmail" type="email" defaultValue={company.email} />
                </div>
                <div>
                  <Label htmlFor="companyPhone">Telefono</Label>
                  <Input id="companyPhone" type="tel" defaultValue={company.phone} />
                </div>
                <div>
                  <Label htmlFor="companyAddress">Indirizzo</Label>
                  <Input id="companyAddress" defaultValue={company.address} />
                </div>
              </div>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">Salva Modifiche Azienda</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Profilo Utente</CardTitle>
              <CardDescription>Gestisci le informazioni del tuo account personale.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar"/>
                  <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <Button variant="outline">Cambia Foto Profilo</Button>
              </div>
              <Separator />
              <div>
                <Label htmlFor="userName">Nome Completo</Label>
                <Input id="userName" defaultValue={user.name} />
              </div>
              <div>
                <Label htmlFor="userEmail">Email</Label>
                <Input id="userEmail" type="email" defaultValue={user.email} />
              </div>
              <div>
                <Label htmlFor="userRole">Ruolo</Label>
                <Input id="userRole" defaultValue={user.role} disabled />
              </div>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">Salva Modifiche Profilo</Button>
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
              <Button variant="outline" className="mt-4">Cambia Password</Button>
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
               <Button variant="outline" className="mt-4">Gestisci Abbonamento</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
