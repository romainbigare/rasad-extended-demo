import type { SVGProps } from "react";

import type { ChromeStringKey } from "@/lib/i18n/translations";

import {
  CalculatorIcon,
  CropsIcon,
  FeedbackIcon,
  GridIcon,
  IrrigationIcon,
  LandIcon,
  PhoneIcon,
  PulseIcon,
  ReportIcon,
  SettingsIcon,
  TicketIcon,
  TreesIcon,
  YieldIcon,
} from "./icons";

export const ROLES = {
  superAdmin: "SuperAdmin",
  adafsaAdmin: "ADAFSAAdmin",
  agronomist: "Agronomist",
  fieldOfficer: "FieldOfficer",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

const ANY_ROLE: readonly RoleName[] = Object.values(ROLES);

/** One page of a module that has several (Crop Water Calculator, Yield Optimisation): its `?tab=` value and its name in the menu and above the page. */
export interface NavTab {
  title: string;
  titleKey: ChromeStringKey;
  tab: string;
}

export interface NavItem {
  title: string;
  /** Arabic label, used when the EN/AR toggle is set to Arabic. */
  titleKey: ChromeStringKey;
  /** A small grey line under the name, e.g. "One farm". */
  subtitle?: string;
  subtitleKey?: ChromeStringKey;
  path: string;
  /** The module's pages, for the two modules that have more than one. The menu opens them under the item while the item is the current page. */
  children?: readonly NavTab[];
  /** Opens in a new tab instead of routing within this app. */
  external?: boolean;
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  allowedRoles: readonly RoleName[];
}

export interface NavGroup {
  heading: string;
  /** Menu heading; groups without one list their items under the logo with no title. */
  headingKey?: ChromeStringKey;
  /** Shown as one disclosure button at the foot of the menu, closed until opened (or until the current page is in it). */
  collapsible?: boolean;
  items: readonly NavItem[];
}

const tab = (tab: string, title: string, titleKey: ChromeStringKey): NavTab => ({ tab, title, titleKey });

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    heading: "Main",
    items: [
      { title: "Executive View", titleKey: "navExecutiveView", path: "/executive-view", icon: GridIcon, allowedRoles: ANY_ROLE },
    ],
  },
  {
    heading: "Modules",
    headingKey: "navGroupModules",
    items: [
      {
        title: "Crop Monitoring",
        titleKey: "navCropMonitoring",
        path: "/modules/crops",
        icon: CropsIcon,
        allowedRoles: ANY_ROLE,
      },
      {
        title: "Tree Monitoring",
        titleKey: "navTreeMonitoring",
        path: "/modules/trees",
        icon: TreesIcon,
        allowedRoles: ANY_ROLE,
      },
      {
        title: "Land Use & Structures",
        titleKey: "navLandUse",
        path: "/modules/land",
        icon: LandIcon,
        allowedRoles: ANY_ROLE,
      },
      {
        title: "Irrigation Efficiency",
        titleKey: "navIrrigation",
        path: "/modules/irrigation",
        icon: IrrigationIcon,
        allowedRoles: ANY_ROLE,
      },
      {
        title: "Crop Water Calculator",
        titleKey: "navWater",
        path: "/modules/water",
        icon: CalculatorIcon,
        allowedRoles: ANY_ROLE,
      },
      {
        title: "Yield Optimisation",
        titleKey: "navYield",
        path: "/modules/yield",
        icon: YieldIcon,
        allowedRoles: ANY_ROLE,
        children: [tab("forecast", "Yield forecast", "navTabYieldForecast"), tab("calendar", "Crop calendar", "navTabYieldCalendar")],
      },
    ],
  },
  {
    heading: "Farm and reports",
    headingKey: "navGroupFarmReports",
    items: [
      {
        title: "Farm Detail",
        titleKey: "navFarmMonitoring",
        subtitle: "One farm",
        subtitleKey: "navFarmMonitoringSub",
        path: "/farm-monitoring",
        icon: PulseIcon,
        allowedRoles: ANY_ROLE,
      },
      { title: "Reports", titleKey: "navReports", subtitle: "Exports", subtitleKey: "navReportsSub", path: "/reports", icon: ReportIcon, allowedRoles: ANY_ROLE },
    ],
  },
  {
    heading: "Support",
    headingKey: "navGroupSupport",
    collapsible: true,
    items: [
      {
        title: "Raise Ticket",
        titleKey: "navRaiseTicket",
        path: "/raise-ticket",
        icon: TicketIcon,
        allowedRoles: ANY_ROLE,
      },
      { title: "Contact Us", titleKey: "navContactUs", path: "/contact", icon: PhoneIcon, allowedRoles: ANY_ROLE },
      { title: "Feedback", titleKey: "navFeedback", path: "/feedback", icon: FeedbackIcon, allowedRoles: ANY_ROLE },
    ],
  },
];

/** Not a menu group: the small link beside Support at the foot (the top bar's avatar also leads to it). */
export const ACCOUNT_NAV_ITEM: NavItem = {
  title: "Account",
  titleKey: "navAccount",
  path: "/settings",
  icon: SettingsIcon,
  allowedRoles: ANY_ROLE,
};

/** Same fail-closed rule as visibleGroups: an unknown or missing role sees nothing. */
export function canSeeItem(item: NavItem, role: string | null | undefined): boolean {
  return !!role && (item.allowedRoles as readonly string[]).includes(role);
}
/** Fails closed: an unknown or missing role sees nothing. */
export function visibleGroups(role: string | null | undefined): NavGroup[] {
  if (!role) return [];
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeeItem(item, role)),
  })).filter((group) => group.items.length > 0);
}

export function isActivePath(current: string, path: string): boolean {
  return current === path || current.startsWith(`${path}/`);
}

/** The module a menu path belongs to (e.g. "/modules/crops"), with its pages if it has several; undefined for other paths. */
export function moduleNavItem(path: string): NavItem | undefined {
  return NAV_GROUPS.flatMap((group) => group.items).find((item) => item.path === path);
}
