import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaperWithQuestions } from "@/lib/browse-data";
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
  const { paper, questions } = await getPaperWithQuestions(paperId);

  if (!paper) notFound();

  return (
    <div className="py-2">
      <div className="mx-auto mb-6 w-full max-w-5xl">
        <Link
          href="/browse"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to browse
        </Link>
      </div>

      <QuestionViewer paper={paper} initialQuestions={questions.slice(0, FIRST_PAGE)} />
    </div>
  );
}
