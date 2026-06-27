import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaperContext, getPaperWithQuestions } from "@/lib/browse-data";
import QuestionViewer from "@/components/questions/QuestionViewer";

const FIRST_PAGE = 10;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = await params;
  const { paper } = await getPaperWithQuestions(paperId);
  return {
    title: paper ? `${paper.title} — Practice — PastQ` : "Practice — PastQ",
  };
}

export default async function PracticePage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = await params;
  const [{ paper, questions }, context] = await Promise.all([
    getPaperWithQuestions(paperId),
    getPaperContext(paperId),
  ]);

  if (!paper) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/browse"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-navy"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to browse
        </Link>
      </div>

      <QuestionViewer
        paper={paper}
        context={context ?? undefined}
        initialQuestions={questions.slice(0, FIRST_PAGE)}
      />
    </div>
  );
}
