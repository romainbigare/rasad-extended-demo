import { useAuth } from "@shared/auth/AuthContext";
import { Settings } from "lucide-react";

import { LogoutIcon } from "@/components/AppShell/icons";
import { Button } from "@/components/ui/Button";
import { TitleIcon } from "@/components/ui/TitleIcon";
import { useT } from "@/lib/i18n/createDict";

import { STRINGS } from "../data/translations";

export function SettingsHeader() {
  const auth = useAuth();
  const t = useT(STRINGS);
  const name = auth?.user?.name ?? "—";
  const role = auth?.user?.role_name ?? "—";

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel p-6 shadow-xs"
      data-testid="settings-header"
    >
      <div className="min-w-0">
        <h1 className="m-0 flex items-center gap-2 text-xl font-bold text-ink">
          <TitleIcon icon={Settings} />
          {t("headerTitle")}
        </h1>
        <p className="mb-0 mt-1 text-xs text-muted">{t("loggedInAs").replace("{name}", name).replace("{role}", role)}</p>
      </div>
      {/* Log out lives here (not in the menu): a quiet outlined button, red text only. */}
      <Button
        onClick={() => auth?.logout()}
        data-testid="settings-logout"
        className="border-[#f2b8b0] text-red hover:bg-red-l"
      >
        <LogoutIcon className="flex-none" />
        {t("logOutButton")}
      </Button>
    </div>
  );
}
