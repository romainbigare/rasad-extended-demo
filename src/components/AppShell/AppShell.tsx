import Head from "next/head";
import type { ReactNode } from "react";
import { useState } from "react";

import { FilterProvider } from "@/lib/filters/FilterContext";

import { AuthGuard } from "./AuthGuard";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useSidebarCollapsed } from "./useSidebarCollapsed";

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const sidebar = useSidebarCollapsed();

  return (
    <AuthGuard>
      <FilterProvider>
        <Head>
          <title>{`${title} · ADAFSA`}</title>
        </Head>
        <div className="flex min-h-screen">
          <Sidebar
            open={navOpen}
            onClose={() => setNavOpen(false)}
            collapsed={sidebar.collapsed}
            onToggleCollapsed={sidebar.toggle}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar onMenu={() => setNavOpen(true)} />
            <main className="flex-1 p-4 sm:p-6">
              {/* Very wide screens (2560+): page content centred at 1920px instead of stretched edge to edge. */}
              <div className="mx-auto w-full max-w-[1920px]">{children}</div>
            </main>
            <Footer />
          </div>
        </div>
      </FilterProvider>
    </AuthGuard>
  );
}
