
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { RichiediInterventoForm } from "@/components/public/RichiediInterventoForm";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Removed CardDescription as it's not used here
import { AlertTriangle } from "lucide-react";

async function getCompanyInfoBySlug(slug: string): Promise<{ id_azienda: string; nome_azienda: string } | null> {
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
    
    let displayName: string;
    const fetchedCompanyName = companyData.nome;

    if (typeof fetchedCompanyName === 'string' && fetchedCompanyName.trim() !== '') {
      displayName = fetchedCompanyName;
    } else {
      // Fallback if 'nome' is missing, empty, or not a string in the found document
      displayName = `Azienda (slug: ${normalizedSlug})`;
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

export default async function RichiediInterventoPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const companySlug = typeof searchParams.azienda === 'string' ? searchParams.azienda : undefined;
  let companyInfo = null;

  if (companySlug) {
    companyInfo = await getCompanyInfoBySlug(companySlug);
  }

  if (!companySlug) {
    return (
      <PublicLayout>
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

  if (!companyInfo) {
    return (
      <PublicLayout companyName="Azienda Non Trovata">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-destructive flex items-center justify-center">
              <AlertTriangle className="mr-2 h-6 w-6" /> Azienda Non Trovata
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              L'azienda con slug "{companySlug}" non è stata trovata nel nostro sistema.
              Verifica che lo slug sia corretto o contatta l'assistenza.
            </p>
          </CardContent>
        </Card>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout companyName={companyInfo.nome_azienda}>
      <RichiediInterventoForm
        id_azienda={companyInfo.id_azienda}
        companyDisplayName={companyInfo.nome_azienda}
      />
    </PublicLayout>
  );
}
