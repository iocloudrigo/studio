
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { RichiediInterventoForm, type RichiediInterventoFormProps } from "@/components/public/RichiediInterventoForm";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import type { Metadata, ResolvingMetadata } from 'next'

interface CompanyInfo {
  id_azienda: string;
  nome_azienda: string | null; // Può essere null se il nome non è valido/impostato
}

async function getCompanyInfoBySlug(slug: string): Promise<CompanyInfo | null> {
  if (!slug || typeof slug !== 'string' || slug.trim() === '') {
    console.warn("Slug non fornito o non valido.");
    return null;
  }
  try {
    const aziendeRef = collection(db, "aziende");
    const normalizedSlug = slug.toLowerCase().trim();
    const q = query(aziendeRef, where("slug", "==", normalizedSlug), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn(`Nessuna azienda trovata con slug normalizzato: ${normalizedSlug} (originale: ${slug})`);
      return null;
    }
    const companyDoc = querySnapshot.docs[0];
    const companyData = companyDoc.data();
    
    let displayName: string | null = null;
    const fetchedCompanyName = companyData.nome;

    if (typeof fetchedCompanyName === 'string' && 
        fetchedCompanyName.trim() !== '' && 
        fetchedCompanyName.trim().toLowerCase() !== 'nuova azienda') {
      displayName = fetchedCompanyName.trim();
    }

    return {
      id_azienda: companyDoc.id, 
      nome_azienda: displayName,
    };
  } catch (error) {
    console.error("Errore nel recuperare l'azienda dallo slug:", error);
    return null;
  }
}

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const companySlug = typeof searchParams.azienda === 'string' ? searchParams.azienda : undefined;
  let pageTitle = 'Richiedi Intervento'; // Default title

  if (companySlug) {
    const companyInfo = await getCompanyInfoBySlug(companySlug);
    if (companyInfo && companyInfo.nome_azienda) { // Nome azienda valido
      pageTitle = `Richiedi Intervento a ${companyInfo.nome_azienda}`;
    } else if (companyInfo && !companyInfo.nome_azienda) { // Azienda trovata, ma nome generico
      pageTitle = 'Richiedi Intervento';
    } else { // Azienda non trovata dallo slug
       pageTitle = 'Azienda Non Trovata - Richiedi Intervento';
    }
  } else { // Slug non fornito
    pageTitle = 'Parametro Azienda Mancante - Richiedi Intervento';
  }

  return {
    title: pageTitle,
  }
}

export default async function RichiediInterventoPage({
  searchParams,
}: Props) {
  const companySlug = typeof searchParams.azienda === 'string' ? searchParams.azienda : undefined;
  
  if (!companySlug) {
    return (
      <PublicLayout companyName="Richiesta Intervento">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-destructive flex items-center justify-center">
              <AlertTriangle className="mr-2 h-6 w-6" /> Parametro Azienda Mancante
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              È necessario specificare un'azienda per inviare una richiesta. Assicurati che l'URL contenga il parametro `?azienda=nomeazienda`.
            </p>
          </CardContent>
        </Card>
      </PublicLayout>
    );
  }

  const companyInfo = await getCompanyInfoBySlug(companySlug);

  if (!companyInfo) {
    return (
      <PublicLayout companyName="Richiesta Intervento">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-destructive flex items-center justify-center">
              <AlertTriangle className="mr-2 h-6 w-6" /> Azienda Non Trovata
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              L'azienda specificata non è stata trovata. Verifica che l'URL sia corretto o contatta l'assistenza.
            </p>
          </CardContent>
        </Card>
      </PublicLayout>
    );
  }

  // Se companyInfo.nome_azienda è null, useremo un testo generico.
  // Altrimenti, useremo il nome reale dell'azienda.
  const layoutHeaderName = companyInfo.nome_azienda || "Richiesta Intervento";
  const formTargetDisplayName = companyInfo.nome_azienda || "la tua azienda di fiducia";

  return (
    <PublicLayout companyName={layoutHeaderName}>
      <RichiediInterventoForm
        id_azienda={companyInfo.id_azienda}
        companyDisplayName={formTargetDisplayName}
      />
    </PublicLayout>
  );
}
