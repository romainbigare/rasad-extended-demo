import Link from "next/link";
import { useRouter } from "next/router";
import { type ReactNode, useEffect, useState } from "react";

import { useAuth } from "@shared/auth/AuthContext";
import { initials } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";

import { cx } from "../ui/cx";
import { SearchPalette } from "./SearchPalette";
import { BellIcon, CloseIcon, MenuIcon, SearchIcon } from "./icons";
import { RegionPicker } from "./RegionPicker";

const pill =
  "flex items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-[#fafbfb] px-3 py-[7px] text-xs font-semibold";

function Pending({
  reason,
  className,
  children,
  testId,
}: {
  reason: string;
  className?: string;
  children: ReactNode;
  testId: string;
}) {
  return (
    <button
      type="button"
      disabled
      aria-disabled
      title={reason}
      data-testid={testId}
      className={cx(pill, "cursor-not-allowed", className)}
    >
      {children}
    </button>
  );
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const auth = useAuth();
  const user = auth?.user;
  const { language } = useLanguage();
  const router = useRouter();
  // Phones: search opens in a row under the bar (the inline box is md+ only).
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => setSearchOpen(false), [router.asPath]);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-1.5 border-b border-line bg-panel px-3 shadow-[0_1px_3px_rgba(4,48,59,0.03)] sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onMenu}
        aria-label={t("openNavigation", language)}
        aria-controls="app-sidebar"
        className="flex-none rounded-lg border border-line p-2 text-ink hover:bg-[#f4f7f6] touch:p-2.5 lg:hidden"
      >
        <MenuIcon />
      </button>

      {/* Every width - the region filters every page, so phones need it too. */}
      <RegionPicker className="min-w-0 shrink sm:shrink-0" />

      {/* min-w-0: lets the search box shrink in a narrow header instead of
       * pushing into the account link (its input truncates inside). */}
      <SearchPalette className="hidden min-w-0 max-w-[320px] flex-1 md:block" />

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => setSearchOpen((open) => !open)}
        aria-label={t("searchLabel", language)}
        aria-expanded={searchOpen}
        aria-controls="topbar-mobile-search"
        data-testid="topbar-search-toggle"
        className="flex-none rounded-lg border border-line p-2 text-ink hover:bg-[#f4f7f6] touch:p-2.5 md:hidden"
      >
        {searchOpen ? <CloseIcon /> : <SearchIcon />}
      </button>

      <Link
        href="/settings"
        className="flex min-w-0 items-center gap-2.5 rounded-lg px-1.5 py-1 transition hover:bg-[#f4f7f6]"
        data-testid="topbar-user"
        title={t("viewProfile", language)}
      >
        <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-teal text-xs font-bold text-white">
          {initials(user?.name || user?.email)}
        </div>
        <div className="hidden min-w-0 text-left rtl:text-right md:block">
          <b className="block truncate">{user?.name || user?.email || "—"}</b>
          <div className="truncate text-xs text-muted">
            {user?.role_name ?? t("roleUnavailable", language)} · ADAFSA
          </div>
        </div>
      </Link>

      {searchOpen && (
        <div
          id="topbar-mobile-search"
          className="absolute inset-x-0 top-full border-b border-line bg-panel px-2.5 py-2 shadow-sm md:hidden"
        >
          <SearchPalette autoFocus />
        </div>
      )}
    </header>
  );
}
