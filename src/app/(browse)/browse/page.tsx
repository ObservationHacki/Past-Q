import { Suspense } from "react";
import {
  getInstitutions,
  getLevels,
  getPaperWithQuestions,
  getPapers,
  getSubjects,
} from "@/lib/browse-data";
import { BackLink, PanelLinkList } from "@/components/browse/browse-nav";
import { EmptyState, ListSkeleton, Panel } from "@/components/browse/panel";

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
    <div className="py-2">
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Browse</h1>
        <p className="text-sm text-gray-500">
          Drill down by level, institution and subject to find past papers.
        </p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,1.25fr)] md:divide-x md:divide-y-0">
        {/* LEFT — levels */}
        <Panel title="Levels">
          <Suspense fallback={<ListSkeleton />}>
            <LevelsPanel />
          </Suspense>
        </Panel>

        {/* MIDDLE — institutions OR subjects */}
        <Panel
          title={institution ? "Subjects" : "Institutions"}
          action={
            institution ? (
              <BackLink removeKeys={["institution", "subject", "paper"]} label="Institutions" />
            ) : undefined
          }
        >
          <Suspense
            key={`mid:${level ?? ""}:${institution ?? ""}`}
            fallback={<ListSkeleton />}
          >
            <MiddlePanel level={level} institution={institution} />
          </Suspense>
        </Panel>

        {/* RIGHT — papers OR question preview */}
        <Panel
          title={paper ? "Question preview" : "Papers"}
          action={
            paper ? <BackLink removeKeys={["paper"]} label="Papers" /> : undefined
          }
        >
          <Suspense
            key={`right:${subject ?? ""}:${paper ?? ""}`}
            fallback={<ListSkeleton />}
          >
            <RightPanel
              level={level}
              institution={institution}
              subject={subject}
              paper={paper}
            />
          </Suspense>
        </Panel>
      </div>
    </div>
  );
}

async function LevelsPanel() {
  const levels = await getLevels();

  if (levels.length === 0) {
    return (
      <EmptyState
        title="No levels yet"
        message="Run the seed migration to populate BECE, WASSCE, University and Professional levels."
      />
    );
  }

  return (
    <PanelLinkList
      paramKey="level"
      resetKeys={["institution", "subject", "paper"]}
      items={levels.map((l) => ({
        value: l.slug,
        label: l.name,
        sublabel: l.description ?? undefined,
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
        title="Pick a level"
        message="Select a level on the left to see its institutions."
      />
    );
  }

  // An institution is selected → show its subjects.
  if (institution) {
    const subjects = await getSubjects(level, institution);
    if (subjects.length === 0) {
      return (
        <EmptyState
          title="No subjects"
          message="This institution doesn't have any subjects yet."
        />
      );
    }
    return (
      <PanelLinkList
        paramKey="subject"
        resetKeys={["paper"]}
        items={subjects.map((s) => ({
          value: s.slug,
          label: s.name,
          sublabel: s.description ?? undefined,
        }))}
      />
    );
  }

  // Only a level is selected → show institutions.
  const institutions = await getInstitutions(level);
  if (institutions.length === 0) {
    return (
      <EmptyState
        title="No institutions"
        message="This level doesn't have any institutions yet."
      />
    );
  }
  return (
    <PanelLinkList
      paramKey="institution"
      resetKeys={["subject", "paper"]}
      items={institutions.map((i) => ({
        value: i.slug,
        label: i.name,
        sublabel: i.abbreviation ?? i.description ?? undefined,
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
        title="Pick a subject"
        message="Select a subject to see its past papers by year."
      />
    );
  }

  const papers = await getPapers(level, institution, subject);
  if (papers.length === 0) {
    return (
      <EmptyState
        title="No papers"
        message="There are no past papers for this subject yet."
      />
    );
  }

  return (
    <PanelLinkList
      paramKey="paper"
      items={papers.map((p) => ({
        value: p.id,
        label: p.title,
        sublabel: [
          String(p.year),
          `${p.total_questions} question${p.total_questions === 1 ? "" : "s"}`,
          p.duration_minutes ? `${p.duration_minutes} min` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      }))}
    />
  );
}

async function QuestionPreview({ paperId }: { paperId: string }) {
  const { paper, questions } = await getPaperWithQuestions(paperId);

  if (!paper) {
    return (
      <EmptyState
        title="Paper not found"
        message="This paper may have been removed."
      />
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">{paper.title}</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {paper.year} · {questions.length} question
          {questions.length === 1 ? "" : "s"}
        </p>
      </div>

      {questions.length === 0 ? (
        <EmptyState
          title="No questions"
          message="This paper doesn't have any questions yet."
        />
      ) : (
        <ol className="divide-y divide-gray-100">
          {questions.map((q) => (
            <li key={q.id} id={`q-${q.id}`} className="scroll-mt-4 px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-gray-400">
                  {q.number}.
                </span>
                <p className="text-sm text-gray-900">{q.content}</p>
              </div>

              {q.options && (
                <ul className="mt-2 space-y-1 pl-6">
                  {Object.entries(q.options).map(([key, value]) => {
                    const isAnswer = q.answer === key;
                    return (
                      <li
                        key={key}
                        className={[
                          "flex gap-2 text-xs",
                          isAnswer
                            ? "font-medium text-green-700"
                            : "text-gray-600",
                        ].join(" ")}
                      >
                        <span className="font-semibold">{key}.</span>
                        <span>{value}</span>
                        {isAnswer && (
                          <span aria-hidden="true" className="text-green-600">
                            &#10003;
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-1.5 flex flex-wrap gap-2 pl-6">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  {q.type}
                </span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                  {q.marks} mark{q.marks === 1 ? "" : "s"}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
