import Link from "next/link";

import { Card } from "../ui/Card";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <Card testId="coming-soon" className="mx-auto max-w-2xl text-center">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Planned page</span>
      <h1 className="mb-2 mt-2 text-xl font-extrabold">{title}</h1>
      <p className="mx-auto mb-5 mt-0 max-w-md text-xs text-muted">{description}</p>
      <Link
        href="/executive-view"
        className="inline-flex rounded-lg border border-teal bg-teal px-3 py-[7px] text-xs font-semibold text-white hover:bg-teal-2"
      >
        Back to Executive View
      </Link>
    </Card>
  );
}
