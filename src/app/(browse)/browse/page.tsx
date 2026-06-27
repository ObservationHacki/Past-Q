import { Suspense } from "react";
import Link from "next/link";
import {
  getInstitutions,
  getLevels,
  getLevelSubjectCounts,
  getPaperWithQuestions,
  getPapers,
  getSubjects,
} from "@/lib/browse-data";
import BrowseHero from "@/components/browse/BrowseHero";
import BrowseShell from "@/components/browse/BrowseShell";
import { InstitutionGrid, PaperCards, SubjectList } from "@/components/browse/BrowseCards";
import { LevelCards } from "@/components/browse/LevelCards";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";

type SearchParams = {
  level?: string;
  institution?: string;
  subject?: string;
  paper?: string;
};

export const metadata = {
  title: "Browse — PastQ",
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { level, institution, subject, paper } = await searchParams;

  return (
    <>
      <BrowseHero />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<BrowseSkeleton />}>
          <BrowseShell
            left={
              <Suspense fallback={<PanelSkeleton />}>
                <LevelsPanel />
              </Suspense>
            }
            middle={
              <Suspense key={`mid:${level}:${institution}`} fallback={<PanelSkeleton />}>
                <MiddlePanel level={level} institution={institution} />
              </Suspense>
            }
            right={
              <Suspense key={`right:${subject}:${paper}`} fallback={<PanelSkeleton />}>
                <RightPanel
                  level={level}
                  institution={institution}
                  subject={subject}
                  paper={paper}
                />
              </Suspense>
            }
          />
        </Suspense>
      </div>
    </>
  );
}

function BrowseSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

async function LevelsPanel() {
  const [levels, counts] = await Promise.all([getLevels(), getLevelSubjectCounts()]);

  if (levels.length === 0) {
    return (
      <EmptyState
        title="No levels yet"
        message="Run the seed migration to populate BECE, WASSCE, University and Professional levels."
      />
    );
  }

  return (
    <LevelCards
      items={levels.map((l) => ({
        slug: l.slug,
        name: l.name,
        subjectCount: counts[l.slug] ?? 0,
      }))}
    />
  );
}

async function MiddlePanel({
  level,
  institution,
}: {
  level?: string;
  institution?: string;
}) {
  if (!level) {
    return (
      <EmptyState
        icon="👈"
        title="Pick a level"
        message="Select a level on the left to see its institutions."
      />
    );
  }

  if (institution) {
    const subjects = await getSubjects(level, institution);
    if (subjects.length === 0) {
      return (
        <EmptyState title="No subjects" message="This institution doesn't have any subjects yet." />
      );
    }
    return (
      <SubjectList
        items={subjects.map((s) => ({
          slug: s.slug,
          name: s.name,
          description: s.description,
        }))}
      />
    );
  }

  const institutions = await getInstitutions(level);
  if (institutions.length === 0) {
    return (
      <EmptyState title="No institutions" message="This level doesn't have any institutions yet." />
    );
  }

  return (
    <InstitutionGrid
      items={institutions.map((i) => ({
        slug: i.slug,
        name: i.name,
        abbreviation: i.abbreviation,
      }))}
    />
  );
}

async function RightPanel({
  level,
  institution,
  subject,
  paper,
}: {
  level?: string;
  institution?: string;
  subject?: string;
  paper?: string;
}) {
  if (paper) {
    return <QuestionPreview paperId={paper} />;
  }

  if (!subject || !level || !institution) {
    return (
      <EmptyState
        icon="📄"
        title="Pick a subject"
        message="Select a subject to see past papers by year."
      />
    );
  }

  const papers = await getPapers(level, institution, subject);
  if (papers.length === 0) {
    return (
      <EmptyState title="No papers" message="There are no past papers for this subject yet." />
    );
  }

  return (
    <PaperCards
      items={papers.map((p) => ({
        id: p.id,
        title: p.title,
        year: p.year,
        total_questions: p.total_questions,
        duration_minutes: p.duration_minutes,
      }))}
    />
  );
}

async function QuestionPreview({ paperId }: { paperId: string }) {
  const { paper, questions } = await getPaperWithQuestions(paperId);

  if (!paper) {
    return <EmptyState title="Paper not found" message="This paper may have been removed." />;
  }

  return (
    <div className="p-4">
      <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <p className="text-lg font-bold text-navy">{paper.title}</p>
        <p className="mt-1 text-sm text-muted">
          {paper.year} · {questions.length} questions
        </p>
        {questions.length > 0 && (
          <Link
            href={`/practice/${paper.id}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy shadow-sm transition active:scale-95 hover:bg-gold-dark"
          >
            Start Practice
          </Link>
        )}
      </div>

      {questions.length === 0 ? (
        <EmptyState title="No questions" message="This paper doesn't have any questions yet." />
      ) : (
        <ol className="max-h-96 space-y-3 overflow-y-auto">
          {questions.slice(0, 5).map((q) => (
            <li key={q.id} className="rounded-xl border border-border bg-card p-3 text-sm text-text">
              <span className="mr-2 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-bold text-navy">
                Q{q.number}
              </span>
              {q.content}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
