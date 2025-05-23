import { PublicLayout } from "@/components/layouts/PublicLayout";
import { RequestForm } from "@/components/public/RequestForm";

// Mock function to get company display name - replace with actual data fetching
async function getCompanyDisplayName(slug: string): Promise<string> {
  // In a real app, this would fetch from a database
  // For now, just capitalize the slug and add "S.r.l."
  if (slug === "acme-corp") return "ACME Corporation";
  if (slug === "beta-solutions") return "Beta Solutions S.p.A.";
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + " S.r.l.";
}

export default async function PublicRequestPage({ params }: { params: { companySlug: string } }) {
  const companyDisplayName = await getCompanyDisplayName(params.companySlug);

  return (
    <PublicLayout companyName={companyDisplayName}>
      <RequestForm companySlug={params.companySlug} companyDisplayName={companyDisplayName} />
    </PublicLayout>
  );
}

// Optional: Generate static paths if you have a known list of companies
// export async function generateStaticParams() {
//   // Fetch company slugs from a DB or static list
//   const companies = [{ slug: "acme-corp" }, { slug: "beta-solutions" }];
//   return companies.map((company) => ({
//     companySlug: company.slug,
//   }));
// }
