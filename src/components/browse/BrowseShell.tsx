"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

export default function BrowseShell({
  left,
  middle,
  right,
}: {
  left: ReactNode;
  middle: ReactNode;
  right: ReactNode;
}) {
  const searchParams = useSearchParams();
  const level = searchParams.get("level");
  const institution = searchParams.get("institution");
  const subject = searchParams.get("subject");

  const step = !level ? 1 : !institution ? 2 : !subject ? 3 : 4;

  const tabs = [
    { n: 1, label: "Level" },
    { n: 2, label: "Institution" },
    { n: 3, label: "Subject" },
    { n: 4, label: "Papers" },
  ];

  return (
    <>
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 md:hidden">
        {tabs.map((tab) => (
          <span
            key={tab.n}
            className={[
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium",
              step === tab.n ? "bg-navy text-white" : tab.n > step ? "text-muted/40" : "text-muted",
            ].join(" ")}
          >
            {tab.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section
          className={`rounded-2xl border border-border bg-card shadow-sm ${level ? "hidden lg:block" : "block"}`}
        >
          <PanelHeading title="Select Level" />
          {left}
        </section>

        <section
          className={`rounded-2xl border border-border bg-card shadow-sm ${
            !level ? "hidden lg:block" : subject ? "hidden lg:block" : "block"
          }`}
        >
          <PanelHeading title={institution ? "Select Subject" : "Select Institution"} />
          {middle}
        </section>

        <section
          className={`rounded-2xl border border-border bg-card shadow-sm ${
            !subject ? "hidden lg:block" : "block"
          }`}
        >
          <PanelHeading title="Papers & Practice" />
          {right}
        </section>
      </div>
    </>
  );
}

function PanelHeading({ title }: { title: string }) {
  return (
    <div className="border-b border-border px-4 py-3">
      <h2 className="text-sm font-bold text-navy">{title}</h2>
    </div>
  );
}
