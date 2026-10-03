
export function isCleverTapEnabled(): boolean {
  // Next.js makes NEXT_PUBLIC_* vars available via process.env on both client and server
  return process.env.NEXT_PUBLIC_ENABLE_CLEVERTAP === "true";
}

export function canUseCleverTap(): boolean {
  return (
    isCleverTapEnabled() &&
    typeof window !== "undefined" &&
    typeof (window as any).clevertap !== "undefined"
  );
}

export function sanitizeCleverTapProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === "") continue;
    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      out[key] = sanitizeCleverTapProps(value as Record<string, unknown>);
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function installCleverTapNullFilter(): void {
  if (typeof window === "undefined") return;
  const ct = (window as any).clevertap;
  if (!ct || ct.__nullFilterInstalled) return;
  ct.__nullFilterInstalled = true;

  if (ct.event?.push) {
    const originalEventPush = ct.event.push.bind(ct.event);
    ct.event.push = (name: string, props?: Record<string, unknown>) =>
      originalEventPush(
        name,
        props ? sanitizeCleverTapProps(props) : props,
      );
  }

  if (ct.profile?.push) {
    const originalProfilePush = ct.profile.push.bind(ct.profile);
    ct.profile.push = (payload: { Site?: Record<string, unknown> }) => {
      if (payload?.Site) {
        return originalProfilePush({
          ...payload,
          Site: sanitizeCleverTapProps(payload.Site),
        });
      }
      return originalProfilePush(payload);
    };
  }

  if (ct.onUserLogin?.push) {
    const originalLoginPush = ct.onUserLogin.push.bind(ct.onUserLogin);
    ct.onUserLogin.push = (payload: Record<string, unknown>) =>
      originalLoginPush(sanitizeCleverTapProps(payload));
  }
}
