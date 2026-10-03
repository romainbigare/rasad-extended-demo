import type { ReactNode } from "react";

import { type FigureProps, PageFrame } from "@/components/frame/PageFrame";

import type { useModuleFrame } from "../useModuleFrame";

/** One page of a module: the common frame (title, the module's tabs where it has several, figures) around the page's own blocks. Rendered inside the AppShell, so the region filter is in scope. */
export function ModuleTabFrame({
  frame,
  figures,
  figuresAside,
  testId,
  children,
}: {
  frame: ReturnType<typeof useModuleFrame>;
  figures?: readonly FigureProps[];
  /** A compact card beside the figure strip. */
  figuresAside?: ReactNode;
  testId: string;
  children: ReactNode;
}) {
  return (
    <PageFrame title={frame.title} tabs={frame.tabs} activeTab={frame.active} figures={figures} figuresAside={figuresAside} testId={testId}>
      {children}
    </PageFrame>
  );
}
