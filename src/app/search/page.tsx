import SearchResults from "@/components/SearchResults";

type SearchParams = {
  q?: string;
  level?: string;
  institution?: string;
  subject?: string;
  year?: string;
};

export const metadata = {
  title: "Search — PastQ",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const query = sp.q ?? "";

  const filters: Record<string, string> = {};
  if (sp.level) filters.level = sp.level;
  if (sp.institution) filters.institution = sp.institution;
  if (sp.subject) filters.subject = sp.subject;
  if (sp.year) filters.year = sp.year;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-navy">Search</h1>
      <SearchResults query={query} filters={filters} />
    </div>
  );
}
