import Link from "next/link";
import { useRouter } from "next/router";
import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";

import { useAuth } from "@shared/auth/AuthContext";
import { useFilterHref } from "@/lib/filters/FilterContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";

import { cx } from "../ui/cx";
import { ChevronDownIcon, CloseIcon, ExternalLinkIcon, MenuIcon, SupportIcon } from "./icons";
import { ACCOUNT_NAV_ITEM, canSeeItem, isActivePath, type NavGroup, type NavItem, visibleGroups } from "./navigation";
import { asset } from "@/lib/assetPath";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  /** Desktop only: icons-only rail (the phone drawer is always full width). */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/** A collapsed item's name, shown beside the rail on hover. Fixed-positioned so the
 * nav's scroll area can't clip it (it would, as a child of that overflow box). */
interface RailTooltip {
  label: string;
  top: number;
  edge: number;
}

export function Sidebar({ open, onClose, collapsed, onToggleCollapsed }: SidebarProps) {
  const router = useRouter();
  const auth = useAuth();
  const { language } = useLanguage();
  // Menu links carry the region choice, so the next page opens on the same selection.
  const filterHref = useFilterHref();
  const role = auth?.user?.role_name;
  const groups = visibleGroups(role);
  // Collapsible groups (Support) sit at the foot of the menu; the rest scroll in the nav.
  const mainGroups = groups.filter((group) => !group.collapsible);
  const footGroups = groups.filter((group) => group.collapsible);
  const showAccount = canSeeItem(ACCOUNT_NAV_ITEM, role);
  const isRtl = language === "ar";
  const [tooltip, setTooltip] = useState<RailTooltip | null>(null);
  // Drawer (below lg) open: Escape closes it, and the page behind doesn't scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  /** Hover handlers for a collapsed rail item - the name appears beside it. */
  const railHover = (label: string) =>
    collapsed
      ? {
          onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
            const r = e.currentTarget.getBoundingClientRect();
            const aside = e.currentTarget.closest("aside")?.getBoundingClientRect();
            setTooltip({ label, top: r.top + r.height / 2, edge: isRtl ? (aside?.left ?? r.left) : (aside?.right ?? r.right) });
          },
          onMouseLeave: () => setTooltip(null),
        }
      : {};

  /** Label text: hidden on the collapsed desktop rail, always shown in the phone drawer. */
  const labelText = (text: ReactNode) => <span className={cx("truncate", collapsed && "lg:sr-only")}>{text}</span>;

  const itemClass = (active: boolean) =>
    cx(
      "mb-0.5 flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs font-semibold transition",
      collapsed && "lg:justify-center lg:gap-0 lg:px-0",
      active
        ? "border-transparent bg-[#f4f7f6] font-bold text-green-d"
        : "border-transparent text-[#41484B] hover:bg-[#F4F7F6] hover:text-ink",
    );
  /** Active icon green, inactive grey - independent of the row's own text color. */
  const iconClass = (active: boolean) => (active ? "text-green-d" : "text-[#667876]");

  /** One menu row: a route inside the app, or an external link that opens a new tab. */
  const renderItem = (item: NavItem) => {
    const ItemIcon = item.icon;
    const label = t(item.titleKey, language);
    if (item.external) {
      return (
        <a
          key={item.path}
          href={item.path}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          aria-label={collapsed ? label : undefined}
          {...railHover(label)}
          className={itemClass(false)}
        >
          <ItemIcon className={cx("flex-none", iconClass(false))} />
          {labelText(label)}
          <ExternalLinkIcon width={12} height={12} className={cx("ms-auto text-muted", collapsed && "lg:hidden")} />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      );
    }
    const active = isActivePath(router.pathname, item.path);
    const subtitle = item.subtitleKey ? t(item.subtitleKey, language) : null;
    // A module opens its pages under it while it is the current page (only Crop Water Calculator and Yield Optimisation have several); the first page counts until `?tab=` is read.
    const rawTab = router.isReady ? router.query.tab : undefined;
    const currentTab = (Array.isArray(rawTab) ? rawTab[0] : rawTab) ?? item.children?.[0].tab;
    return (
      <div key={item.path}>
        <Link
          href={filterHref(item.path)}
          onClick={onClose}
          aria-current={active ? "page" : undefined}
          aria-label={collapsed ? label : undefined}
          {...railHover(label)}
          className={itemClass(active)}
        >
          <ItemIcon className={cx("flex-none", iconClass(active))} />
          {subtitle ? (
            <span className={cx("min-w-0", collapsed && "lg:sr-only")}>
              <span className="block truncate">{label}</span>
              <span className="block truncate text-xs font-normal text-muted">{subtitle}</span>
            </span>
          ) : (
            labelText(label)
          )}
        </Link>
        {active && item.children && (
          <ul className={cx("m-0 mb-1 list-none space-y-0.5 p-0 ps-[34px]", collapsed && "lg:hidden")} data-testid={`nav-pages-${item.path.split("/").pop()}`}>
            {item.children.map((child) => {
              const on = child.tab === currentTab;
              return (
                <li key={child.tab}>
                  <Link
                    href={filterHref(`${item.path}?tab=${child.tab}`)}
                    shallow
                    replace
                    onClick={onClose}
                    aria-current={on ? "page" : undefined}
                    className={cx(
                      "block truncate rounded-md px-2.5 py-1.5 text-xs transition",
                      on ? "font-semibold text-green-d" : "text-muted hover:text-ink",
                    )}
                  >
                    {t(child.titleKey, language)}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  /** The small Account link beside Support: icon and name, icon only on the collapsed rail. */
  const renderAccountLink = () => {
    const AccountIcon = ACCOUNT_NAV_ITEM.icon;
    const label = t(ACCOUNT_NAV_ITEM.titleKey, language);
    const active = isActivePath(router.pathname, ACCOUNT_NAV_ITEM.path);
    return (
      <Link
        href={ACCOUNT_NAV_ITEM.path}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? label : undefined}
        {...railHover(label)}
        className={cx(
          "flex flex-none items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition",
          collapsed && "lg:justify-center lg:gap-0 lg:px-0",
          active ? "border-transparent bg-[#f4f7f6] font-bold text-green-d" : "border-transparent text-[#41484B] hover:bg-[#F4F7F6] hover:text-ink",
        )}
      >
        <AccountIcon className={cx("flex-none", iconClass(active))} />
        {labelText(label)}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cx(
          "fixed inset-0 z-30 bg-ink/40 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        id="app-sidebar"
        aria-label={t("mainNavigation", language)}
        className={cx(
          "fixed inset-y-0 z-40 flex w-64 flex-col border-line bg-panel transition-[transform,width,visibility] duration-300",
          // Below lg the whole drawer scrolls (landscape phones), and a closed drawer is invisible, so
          // keyboard / screen-reader focus can't land on its hidden links. Desktop is unaffected.
          "max-lg:overflow-y-auto",
          !open && "max-lg:invisible",
          collapsed && "lg:w-[76px]",
          isRtl ? "right-0 border-l border-r-0" : "left-0 border-r",
          // `lg:translate-x-0` must win over the closed-drawer transform at
          // desktop width. Both are plain single-class selectors here (no
          // `rtl:` variant on the transform), so Tailwind's normal
          // mobile-first cascade order resolves it correctly - unlike an
          // `rtl:translate-x-full` variant, whose extra `[dir="rtl"]`
          // ancestor selector would outrank `lg:translate-x-0` on specificity
          // alone and hide the whole sidebar at every width in Arabic.
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:supports-[height:100dvh]:h-dvh",
          open ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full",
        )}
      >
        {/* Collapse / expand (desktop): a hamburger at the very top, on the rail too. The phone drawer has its own close button. */}
        <div className={cx("hidden flex-none px-3 pt-3 lg:flex", collapsed && "lg:justify-center")}>
          <button
            type="button"
            onClick={() => {
              setTooltip(null);
              onToggleCollapsed();
            }}
            aria-label={t(collapsed ? "expandSidebar" : "collapseSidebar", language)}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            title={t(collapsed ? "expandSidebar" : "collapseSidebar", language)}
            className="rounded-lg p-2 text-muted transition hover:bg-[#f4f7f6] hover:text-ink touch:p-2.5"
          >
            <MenuIcon width={20} height={20} />
          </button>
        </div>

        <div
          className={cx(
            "relative border-b border-line px-[18px] pb-3.5 pt-[18px] text-center lg:pt-1",
            collapsed && "lg:px-2 lg:pb-3",
          )}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeNavigation", language)}
            className="absolute right-3 top-3 rounded-md p-1 text-muted hover:bg-[#f4f7f6] touch:p-2.5 rtl:right-auto rtl:left-3 lg:hidden"
          >
            <CloseIcon />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- static
           * export + images.unoptimized:true (next.config.js) means
           * next/image's only remaining feature here is layout-shift
           * prevention via explicit width/height, not worth the import for
           * one fixed-size logo. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized images (see above) */}
          <img
            src={asset("/images/adafsa-logo-full.png")}
            alt={t("adafsaEmblemAlt", language)}
            className={cx("mx-auto h-auto w-full max-w-[160px]", collapsed && "lg:hidden")}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- same as above */}
          <img
            src={asset("/images/adafsa-logo.png")}
            alt={t("adafsaEmblemAlt", language)}
            className={cx("mx-auto hidden h-11 w-auto", collapsed && "lg:block")}
          />
          <div className={cx(collapsed && "lg:hidden")}>
            <div className="mt-2.5 text-xs font-bold text-green-d">
              {t("brandLine", "en")}
            </div>
          </div>
        </div>

        <nav className={cx("flex-1 overflow-y-auto px-1.5 py-2.5", collapsed && "lg:overflow-x-hidden lg:px-2.5")}>
          {mainGroups.map((group, groupIndex) => (
            <div key={group.heading}>
              {group.headingKey && (
                <h6
                  className={cx(
                    "mx-2 mb-1.5 mt-3.5 text-xs font-semibold text-muted",
                    collapsed && "lg:hidden",
                  )}
                >
                  {t(group.headingKey, language)}
                </h6>
              )}
              {/* Collapsed: a thin divider between groups instead of their headings. */}
              {collapsed && groupIndex > 0 && <div aria-hidden className="mx-2 my-2.5 hidden border-t border-line lg:block" />}
              {group.items.map(renderItem)}
            </div>
          ))}
        </nav>

        {/* Support (a popup menu) with the Account link beside it, pinned under the scrolling menu. */}
        {(footGroups.length > 0 || showAccount) && (
          <div className={cx("border-t border-line px-1.5 py-2", collapsed && "lg:px-2.5")}>
            <div className={cx("flex items-center gap-1", collapsed && "lg:flex-col lg:items-stretch")}>
              {footGroups.map((group) => (
                <SupportMenu
                  key={group.heading}
                  group={group}
                  label={group.headingKey ? t(group.headingKey, language) : group.heading}
                  collapsed={collapsed}
                  currentPath={router.pathname}
                  onNavigate={onClose}
                  onOpen={() => setTooltip(null)}
                  railHover={railHover}
                  labelText={labelText}
                  iconClass={iconClass}
                />
              ))}
              {showAccount && renderAccountLink()}
            </div>
          </div>
        )}

        <div className={cx("border-t border-line px-1.5 py-3", collapsed && "lg:hidden")}>
          <div className="text-xs text-muted">
            <b className="block text-green-d">Wafra Greentech</b>
            <span className="block">
              {t("poweredBy", language)} <b>Map My Crop</b>
            </span>
          </div>
        </div>
      </aside>

      {collapsed && tooltip && (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-[60] hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink shadow-[0_6px_20px_rgba(0,0,0,0.12)] lg:block"
          style={
            isRtl
              ? { top: tooltip.top, right: `calc(100vw - ${tooltip.edge}px + 10px)` }
              : { top: tooltip.top, left: tooltip.edge + 10 }
          }
        >
          {tooltip.label}
        </span>
      )}
    </>
  );
}

/**
 * Support at the foot of the menu: one button that opens a small popup (like the region picker's) with the
 * support pages as links. Opens above the button; on the collapsed desktop rail it opens beside the rail.
 * Closes on outside click, Escape, Tab or choosing a page. Arrow keys / Home / End move between the links.
 */
function SupportMenu({
  group,
  label,
  collapsed,
  currentPath,
  onNavigate,
  onOpen,
  railHover,
  labelText,
  iconClass,
}: {
  group: NavGroup;
  label: string;
  collapsed: boolean;
  currentPath: string;
  onNavigate: () => void;
  onOpen: () => void;
  railHover: (label: string) => Record<string, unknown>;
  labelText: (text: ReactNode) => ReactNode;
  iconClass: (active: boolean) => string;
}) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const menuId = `sidebar-menu-${group.heading.toLowerCase()}`;
  const onSupportPage = group.items.some((item) => isActivePath(currentPath, item.path));

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };
  const focusItem = (index: number) => {
    const last = group.items.length - 1;
    itemRefs.current[index < 0 ? last : index > last ? 0 : index]?.focus();
  };
  const onButtonKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      onOpen();
      setOpen(true);
      // The menu mounts on the next render; focus its first (or last) link then.
      requestAnimationFrame(() => focusItem(e.key === "ArrowUp" ? -1 : 0));
    }
  };
  const onMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusItem(current + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItem(current - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(-1);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={cx("relative min-w-0 flex-1", collapsed && "lg:flex-none")}>
      <button
        ref={buttonRef}
        type="button"
        data-testid="sidebar-support"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={collapsed ? label : undefined}
        onClick={() => {
          onOpen();
          setOpen((v) => !v);
        }}
        onKeyDown={onButtonKeyDown}
        {...(open ? {} : railHover(label))}
        className={cx(
          "flex w-full min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-xs font-semibold transition",
          collapsed && "lg:justify-center lg:gap-0 lg:px-0",
          open || onSupportPage
            ? "border-transparent bg-[#f4f7f6] font-bold text-green-d"
            : "border-transparent text-[#41484B] hover:bg-[#F4F7F6] hover:text-ink",
        )}
      >
        <SupportIcon className={cx("flex-none", iconClass(open || onSupportPage))} />
        {labelText(label)}
        <ChevronDownIcon className={cx("ms-auto flex-none text-muted transition", !open && "rotate-180", collapsed && "lg:hidden")} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          data-testid="sidebar-support-menu"
          onKeyDown={onMenuKeyDown}
          className={cx(
            "absolute bottom-full z-50 mb-1.5 min-w-[190px] max-w-[calc(100vw-1rem)] rounded-lg border border-line bg-panel py-1 text-xs shadow-lg start-0",
            // Collapsed desktop rail: beside the rail, level with the button, instead of above it.
            collapsed && "lg:bottom-0 lg:mb-0 lg:ms-3 lg:start-full",
          )}
        >
          {group.items.map((item, i) => {
            const ItemIcon = item.icon;
            const active = isActivePath(currentPath, item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                role="menuitem"
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setOpen(false);
                  onNavigate();
                }}
                className={cx(
                  "flex items-center gap-2.5 px-3 py-2.5 font-semibold outline-none hover:bg-[#f4f7f6] focus-visible:bg-[#f4f7f6] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-d sm:py-2 touch:py-3",
                  active ? "text-green-d" : "text-ink",
                )}
              >
                <ItemIcon className="flex-none text-muted" />
                {t(item.titleKey, language)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
