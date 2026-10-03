import type { ComponentType, SVGProps } from "react";
import {
  Activity,
  Archive,
  Bell,
  Building,
  Building2,
  Calculator,
  ChevronDown,
  ChevronsLeft,
  Compass,
  Crosshair,
  Droplets,
  Eye,
  EyeOff,
  ExternalLink,
  FileSpreadsheet,
  Headset,
  LandPlot,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  Maximize2,
  Menu,
  MessageSquareQuote,
  Minimize2,
  Minus,
  MapPin,
  PhoneCall,
  Plus,
  Search,
  Settings,
  Send,
  Sprout,
  TicketPlus,
  TrendingUp,
  Upload,
  Trees,
  Warehouse,
  X,
} from "lucide-react";

type P = SVGProps<SVGSVGElement>;

/** Every icon in the app is a Lucide icon, at the same 16px/1.8-weight look
 * the app was designed around (Lucide's own defaults are 24px/2 - sized for
 * a much bigger canvas than our nav rows and inline labels). */
function withDefaults(LucideIcon: ComponentType<P>) {
  function Wrapped(p: P) {
    return <LucideIcon width={16} height={16} strokeWidth={1.8} aria-hidden focusable={false} {...p} />;
  }
  Wrapped.displayName = `Icon(${LucideIcon.displayName ?? LucideIcon.name})`;
  return Wrapped;
}

// Sidebar navigation.
export const GridIcon = withDefaults(LayoutDashboard);
export const FarmIcon = withDefaults(Warehouse);
export const PulseIcon = withDefaults(Activity);
export const ReportIcon = withDefaults(FileSpreadsheet);
export const TicketIcon = withDefaults(TicketPlus);
export const PhoneIcon = withDefaults(PhoneCall);
export const SupportIcon = withDefaults(Headset);
export const ArchiveIcon = withDefaults(Archive);
export const SendIcon = withDefaults(Send);
export const UploadIcon = withDefaults(Upload);
export const FeedbackIcon = withDefaults(MessageSquareQuote);
export const MailIcon = withDefaults(Mail);
export const SettingsIcon = withDefaults(Settings);
export const LogoutIcon = withDefaults(LogOut);
export const ExternalLinkIcon = withDefaults(ExternalLink);

// Top bar.
export const PinIcon = withDefaults(MapPin);
export const SearchIcon = withDefaults(Search);
export const BellIcon = withDefaults(Bell);
export const MenuIcon = withDefaults(Menu);
export const CloseIcon = withDefaults(X);
export const ChevronDownIcon = withDefaults(ChevronDown);

// Password field, sidebar collapse.
export const EyeIcon = withDefaults(Eye);
export const EyeOffIcon = withDefaults(EyeOff);
/** « - rotate 180° for ». */
export const ChevronsIcon = withDefaults(ChevronsLeft);

// Map controls.
export const PlusIcon = withDefaults(Plus);
export const MinusIcon = withDefaults(Minus);
export const ExpandIcon = withDefaults(Maximize2);
export const CompressIcon = withDefaults(Minimize2);
/** Fit-to-view ("Fit to emirate" / "Fit to farm"). */
export const HomeViewIcon = withDefaults(Crosshair);

// Executive View hero (portfolio / land & area section titles and the portfolio tiles).
export const CompassIcon = withDefaults(Compass);
/** "Total Farms" tile - Lucide has no barn icon; a warehouse reads the same way. */
export const BarnIcon = withDefaults(Warehouse);
export const LayersIcon = withDefaults(Layers);
export const TreesIcon = withDefaults(Trees);
export const LandIcon = withDefaults(LandPlot);

// Operations Domain tabs / cards.
/** Protected-agriculture structures (greenhouse, shade house, open shed) - kept
 * visually distinct from FactoryIcon's other structure types below. */
export const GreenhouseIcon = withDefaults(Building);
export const FactoryIcon = withDefaults(Building2);

// Module entries in the menu.
export const CropsIcon = withDefaults(Sprout);
export const IrrigationIcon = withDefaults(Droplets);
export const CalculatorIcon = withDefaults(Calculator);
export const YieldIcon = withDefaults(TrendingUp);
