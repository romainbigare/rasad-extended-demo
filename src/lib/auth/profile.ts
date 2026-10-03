export interface RbacProfile {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  company_id: number | null;
  role_id: number;
  role_name?: string;
  is_active: boolean;
  country: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  unit: string | null;
  timezone: string | null;
  notification_active: boolean;
  preferences?: {
    area_unit: "dunum" | "hectare";
    coord_format: "DMS" | "DD";
    locale: "en" | "ar";
  };
}

export type ProfilePatch = Partial<{
  name: string;
  unit: string;
  timezone: string;
  is_notification_enabled: boolean;
}>;

export function saveProfilePatch(
  updateProfile: unknown,
  patch: ProfilePatch,
): Promise<unknown | null> {
  return (updateProfile as (data: ProfilePatch) => Promise<unknown | null>)(patch);
}

export type PreferencesPatch = Partial<{
  area_unit: "dunum" | "hectare";
  coord_format: "DMS" | "DD";
  locale: "en" | "ar";
}>;

export function savePreferencesPatch(
  updatePreferences: unknown,
  patch: PreferencesPatch,
): Promise<unknown | null> {
  return (updatePreferences as (data: PreferencesPatch) => Promise<unknown | null>)(patch);
}
