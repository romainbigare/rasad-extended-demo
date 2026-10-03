import { useState } from "react";

import { useAuth } from "@shared/auth/AuthContext";

import { savePreferencesPatch, type PreferencesPatch } from "@/lib/auth/profile";

export function useSavePreferences() {
  const auth = useAuth();
  const [pendingField, setPendingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(field: string, patch: PreferencesPatch): Promise<boolean> {
    setPendingField(field);
    setError(null);
    try {
      const result = await savePreferencesPatch(auth?.updatePreferences, patch);
      if (!result) {
        setError("Couldn’t save. Try again.");
        return false;
      }
      return true;
    } catch {
      setError("Couldn’t save. Try again.");
      return false;
    } finally {
      setPendingField(null);
    }
  }

  return { save, pendingField, error };
}
