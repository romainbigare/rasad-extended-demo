import { type FrameTab, useActiveTab } from "@/components/frame/PageFrame";
import { moduleNavItem } from "@/components/AppShell/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";

/**
 * A module page's title, its tabs (the same pages the menu lists under the module, named in the UI
 * language) and the tab the link is on. `path` is the module's menu path, e.g. "/modules/crops".
 */
export function useModuleFrame(path: string): { title: string; tabs: FrameTab[]; active: string } {
  const { language } = useLanguage();
  const item = moduleNavItem(path);
  const tabs = (item?.children ?? []).map((child) => ({ tab: child.tab, label: t(child.titleKey, language) }));
  const active = useActiveTab(tabs);
  return { title: item ? t(item.titleKey, language) : "", tabs, active };
}
