
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { RichiediInterventoForm } from "@/components/public/RichiediInterventoForm";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

async function getCompanyInfoBySlug(slug: string): Promise<{ id_azienda: string; nome_azienda: string } | null> {
  if (!slug || typeof slug !== 'string' || slug.trim() === '') {
    console.warn("Slug non fornito o non valido.");
    return null;
  }
  try {
    const aziendeRef = collection(db, "aziende");
    const q = query(aziendeRef, where("slug", "==", slug.trim()), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn(`Nessuna azienda trovata con slug: ${slug}`);
      return null;
    }
    const companyDoc = querySnapshot.docs[0];
    return {
      id_azienda: companyDoc.id, // L'ID del documento è uid_admin, che usiamo come id_azienda
      nome_azienda: companyDoc.data().nome || "Azienda Cliente",
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
