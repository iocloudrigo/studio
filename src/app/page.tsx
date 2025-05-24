
import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle, Users, Zap, Target, UserPlus, Link2, ListChecks, CalendarCog, HelpCircle, ChevronRight, Euro, Star, ShieldCheck } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function LandingPage() {
  const faqItems = [
    {
      id: "faq-1",
      question: "Come posso iniziare a usare Incastro per la mia attività?",
      answer: "È semplice! Clicca su \"Registrati\" in alto, crea il tuo account amministratore e inserisci i dettagli della tua azienda. Riceverai subito un link unico da condividere con i tuoi clienti per iniziare a ricevere richieste."
    },
    {
      id: "faq-2",
      question: "Incastro è adatto anche per professionisti singoli o solo per aziende con più tecnici?",
      answer: "Incastro è perfetto sia per professionisti singoli che per aziende con team di tecnici. Puoi gestire le richieste e, se hai collaboratori, assegnare loro gli interventi. Se operi da solo, gestirai tutto tu in modo centralizzato."
    },
    {
      id: "faq-3",
      question: "I miei clienti devono scaricare un'app o registrarsi per inviare una richiesta?",
      answer: "No, i tuoi clienti non hanno bisogno di scaricare nulla né di registrarsi. Inviano le richieste tramite un semplice modulo web accessibile dal link unico personalizzato che fornirai loro (es. /richiedi-intervento?azienda=TUO-NOME)."
    },
    {
      id: "faq-4",
      question: "Posso personalizzare le informazioni della mia azienda visibili ai clienti?",
      answer: "Sì, dalla tua dashboard, nella sezione \"Impostazioni\", puoi configurare il nome della tua azienda e lo \"slug\" (la parte dell'URL che identifica la tua pagina pubblica di richiesta). Questo aiuta i clienti a riconoscerti immediatamente."
    },
    {
      id: "faq-5",
      question: "Posso modificare il link da condividere al cliente?",
      answer: "Sì, puoi utilizzare servizi esterni di short-link come Bit.ly per accorciare e personalizzare il link generato da Incastro. Inoltre, puoi trasformare il link in un QR Code da stampare o condividere digitalmente per un accesso ancora più rapido da parte dei tuoi clienti."
    }
  ];

  const pricingPlans = [
    {
      name: "Mensile",
      price: "€ 49",
      frequency: "/ mese",
      description: "Flessibilità totale, paga mese per mese.",
      features: ["Tutte le funzionalità Incastro", "Gestione completa richieste", "Supporto clienti", "Aggiornamenti inclusi"],
      cta: "Inizia con il Piano Mensile",
      href: "/register",
      highlight: false,
    },
    {
      name: "Annuale",
      price: "€ 499",
      frequency: "/ anno",
      description: "Risparmia con il pagamento annuale.",
      features: ["Tutte le funzionalità Incastro", "Gestione completa richieste", "Supporto clienti", "Aggiornamenti inclusi"],
      cta: "Scegli il Piano Annuale",
      href: "/register",
      highlight: true, // Puoi scegliere di evidenziare il piano annuale
    },
  ];


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
              Benvenuto su Incastro
            </h1>
            <p className="mb-10 text-lg text-muted-foreground md:text-xl">
              La piattaforma per ottimizzare la gestione dei tuoi interventi tecnici.
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
                alt="Illustrazione di Incastro"
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
                  Aziende multiservizi
                </li>
                <li className="flex items-center">
                  <Target className="mr-2 h-5 w-5 text-accent" />
                  Freelancer per appuntamenti e interventi.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Come Funziona Section */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto max-w-screen-lg px-4">
            <h2 className="mb-12 text-center text-3xl font-bold text-primary">
              Come Funziona Incastro?
            </h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center text-center p-4">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <UserPlus className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">1. Registrati</h3>
                <p className="text-sm text-muted-foreground">
                  Crea il tuo account e configura i dettagli della tua attività in pochi minuti.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Link2 className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">2. Link Unico</h3>
                <p className="text-sm text-muted-foreground">
                  Ottieni un link personalizzato da condividere con i tuoi clienti per ricevere richieste.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <ListChecks className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">3. Ricevi Richieste</h3>
                <p className="text-sm text-muted-foreground">
                  Le richieste inviate dai clienti appaiono direttamente nella tua dashboard.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <CalendarCog className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">4. Organizza</h3>
                <p className="text-sm text-muted-foreground">
                  Gestisci interventi, assegna tecnici e monitora lo stato.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Perché Scegliere Incastro Section */}
        <section className="py-12 md:py-20 bg-muted/50">
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

        {/* FAQ Section */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto max-w-screen-lg px-4">
            <div className="mb-12 text-center">
                <HelpCircle className="mx-auto h-12 w-12 text-primary mb-4" />
                <h2 className="text-3xl font-bold text-primary">
                    Domande Frequenti (FAQ)
                </h2>
                <p className="mt-2 text-muted-foreground">
                    Trova le risposte alle domande più comuni su Incastro.
                </p>
            </div>
            <Accordion type="single" collapsible className="w-full max-w-2xl mx-auto">
              {faqItems.map((item) => (
                <AccordionItem value={item.id} key={item.id} className="border border-border rounded-md mb-3 shadow-sm bg-card">
                  <AccordionTrigger className="text-lg font-semibold text-left hover:no-underline px-6 py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground leading-relaxed pt-0 pb-4 px-6">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-12 md:py-20 bg-muted/50">
          <div className="container mx-auto max-w-screen-lg px-4">
            <div className="mb-12 text-center">
              <Euro className="mx-auto h-12 w-12 text-primary mb-4" />
              <h2 className="text-3xl font-bold text-primary">
                Piani Tariffari Semplici e Trasparenti
              </h2>
              <p className="mt-2 text-muted-foreground">
                Scegli l'opzione di pagamento più adatta alle tue esigenze. Tutte le funzionalità sono incluse.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:max-w-3xl lg:mx-auto lg:gap-10">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-lg border bg-card p-6 shadow-lg flex flex-col ${
                    plan.highlight ? "border-primary ring-2 ring-primary" : "border-border"
                  }`}
                >
                  {plan.highlight && (
                    <div className="mb-4 text-center">
                      <span className="inline-block rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
                        Consigliato
                      </span>
                    </div>
                  )}
                  <h3 className="mb-2 text-2xl font-bold text-center text-primary">{plan.name}</h3>
                  <p className="mb-4 text-center text-muted-foreground">{plan.description}</p>
                  <div className="mb-6 text-center">
                    <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                    <span className="text-lg text-muted-foreground">{plan.frequency}</span>
                  </div>
                  <ul className="mb-8 space-y-2 text-muted-foreground flex-grow">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className={`w-full mt-auto ${plan.highlight ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-accent hover:bg-accent/90 text-accent-foreground'}`}>
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Tutti i prezzi sono IVA esclusa. Nessun contratto a lungo termine, disdici quando vuoi (per il piano mensile).
            </p>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center">
        <div className="container mx-auto max-w-screen-lg px-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Incastro. Tutti i diritti riservati.
          </p>
        </div>
      </footer>
    </div>
  );
}
