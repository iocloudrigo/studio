
import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle, Users, Zap, Target } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-screen-lg items-center justify-between px-4">
          <Logo />
          <Button asChild variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
            <Link href="/register">Registrati</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section & Login Form */}
        <section className="py-12 md:py-20 bg-gradient-to-b from-background to-muted/50">
          <div className="container mx-auto max-w-screen-lg px-4 text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-primary md:text-5xl lg:text-6xl">
              Benvenuto in Incastro
            </h1>
            <p className="mb-10 text-lg text-muted-foreground md:text-xl">
              La piattaforma SaaS per ottimizzare la gestione dei tuoi interventi tecnici.
            </p>
            <div className="mx-auto max-w-md">
              <LoginForm />
            </div>
          </div>
        </section>

        {/* Cos'è Incastro Section */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto grid max-w-screen-lg items-center gap-8 px-4 md:grid-cols-2 md:gap-12">
            <div className="order-2 md:order-1">
              <h2 className="mb-4 text-3xl font-bold text-primary">Cos'è Incastro?</h2>
              <p className="mb-4 text-muted-foreground">
                Incastro è la soluzione pensata per artigiani, piccole e medie imprese che gestiscono interventi tecnici sul campo. Semplifica la ricezione delle richieste, la pianificazione degli appuntamenti, l'assegnazione dei tecnici e la comunicazione con i clienti.
              </p>
              <p className="text-muted-foreground">
                Grazie a un'interfaccia intuitiva e a potenti strumenti, inclusa l'assistenza AI per i suggerimenti, Incastro ti aiuta a risparmiare tempo, ridurre gli errori e migliorare la soddisfazione del cliente.
              </p>
            </div>
            <div className="order-1 md:order-2">
              <Image
                src="https://placehold.co/600x400.png"
                alt="Illustrazione di Incastro SaaS"
                width={600}
                height={400}
                className="rounded-lg shadow-lg"
                data-ai-hint="software interface teamwork"
              />
            </div>
          </div>
        </section>

        {/* A Chi è Rivolto Section */}
        <section className="py-12 md:py-20 bg-muted/50">
          <div className="container mx-auto grid max-w-screen-lg items-center gap-8 px-4 md:grid-cols-2 md:gap-12">
            <div>
              <Image
                src="https://placehold.co/600x400.png"
                alt="Tecnici al lavoro"
                width={600}
                height={400}
                className="rounded-lg shadow-lg"
                data-ai-hint="technician tools"
              />
            </div>
            <div>
              <h2 className="mb-4 text-3xl font-bold text-primary">A Chi è Rivolto?</h2>
              <p className="mb-4 text-muted-foreground">
                Incastro è ideale per una vasta gamma di professionisti e aziende, tra cui:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center">
                  <Users className="mr-2 h-5 w-5 text-accent" />
                  Idraulici ed elettricisti
                </li>
                <li className="flex items-center">
                  <Zap className="mr-2 h-5 w-5 text-accent" />
                  Installatori e manutentori di impianti
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5 text-accent" />
                  Aziende di servizi multiservizi
                </li>
                <li className="flex items-center">
                  <Target className="mr-2 h-5 w-5 text-accent" />
                  Qualsiasi professionista che gestisca appuntamenti e interventi esterni.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Perché Scegliere Incastro Section */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto max-w-screen-lg px-4">
            <h2 className="mb-10 text-center text-3xl font-bold text-primary">
              Perché Scegliere Incastro?
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <Zap className="mb-4 h-10 w-10 text-accent" />
                <h3 className="mb-2 text-xl font-semibold">Efficienza Operativa</h3>
                <p className="text-sm text-muted-foreground">
                  Automatizza la gestione delle richieste e ottimizza l'assegnazione dei tecnici, riducendo i tempi morti.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <Users className="mb-4 h-10 w-10 text-accent" />
                <h3 className="mb-2 text-xl font-semibold">Miglior Collaborazione</h3>
                <p className="text-sm text-muted-foreground">
                  Centralizza le informazioni e facilita la comunicazione tra amministrazione, tecnici e clienti.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <CheckCircle className="mb-4 h-10 w-10 text-accent" />
                <h3 className="mb-2 text-xl font-semibold">Soddisfazione Cliente</h3>
                <p className="text-sm text-muted-foreground">
                  Offri un servizio più rapido e trasparente, con aggiornamenti puntuali e una gestione professionale.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center">
        <div className="container mx-auto max-w-screen-lg px-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Incastro SaaS. Tutti i diritti riservati.
          </p>
        </div>
      </footer>
    </div>
  );
}
