
const TILE_API = "https://tile.googleapis.com";
const STORAGE_KEY = "rasad.googleTileSession";
/** Renew this long before Google's expiry, so a session never lapses mid-visit. */
const RENEW_BEFORE_MS = 24 * 60 * 60 * 1000;
const SESSION_REQUEST = { mapType: "satellite", language: "en-US", region: "AE", layerTypes: ["layerRoadmap"] };

export interface GoogleTileSession {
  session: string;
  /** Epoch ms. */
  expiresAt: number;
  tileSize: number;
  /** Last 6 characters of the key it was made with - a changed key gets a fresh session. */
  keyTag: string;
}

let pending: Promise<GoogleTileSession | null> | null = null;

const keyTag = (apiKey: string) => apiKey.slice(-6);

function readStored(apiKey: string): GoogleTileSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GoogleTileSession;
    const fresh = s.keyTag === keyTag(apiKey) && s.expiresAt - Date.now() > RENEW_BEFORE_MS;
    return fresh && s.session ? s : null;
  } catch {
    return null;
  }
}

function store(s: GoogleTileSession) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // not cached - the next page load just asks for a new session
  }
}

/** A usable session for this key, or null (no key / Google refused it). `force` skips the cache. */
export function getGoogleTileSession(apiKey: string, { force = false } = {}): Promise<GoogleTileSession | null> {
  if (!apiKey || typeof window === "undefined") return Promise.resolve(null);
  if (!force) {
    const stored = readStored(apiKey);
    if (stored) return Promise.resolve(stored);
  }
  if (pending) return pending;
  pending = (async () => {
    try {
      const res = await fetch(`${TILE_API}/v1/createSession?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(SESSION_REQUEST),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.session) {
        return null;
      }
      const session: GoogleTileSession = {
        session: body.session,
        expiresAt: Number(body.expiry) * 1000,
        tileSize: Number(body.tileWidth) || 256,
        keyTag: keyTag(apiKey),
      };
      store(session);
      return session;
    } catch {
      return null;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

export const googleTileUrl = (s: GoogleTileSession, apiKey: string) =>
  `${TILE_API}/v1/2dtiles/{z}/{x}/{y}?session=${encodeURIComponent(s.session)}&key=${encodeURIComponent(apiKey)}`;

/** Copyright text Google requires for the current view (e.g. "Imagery ©2026 <provider>, Map data ©2026 Google"). */
export async function fetchGoogleCopyright(
  s: GoogleTileSession,
  apiKey: string,
  view: { zoom: number; north: number; south: number; east: number; west: number },
): Promise<string | null> {
  const q = new URLSearchParams({
    session: s.session,
    key: apiKey,
    zoom: String(Math.round(view.zoom)),
    north: String(view.north),
    south: String(view.south),
    east: String(view.east),
    west: String(view.west),
  });
  try {
    const res = await fetch(`${TILE_API}/tile/v1/viewport?${q}`);
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body?.copyright === "string" ? body.copyright : null;
  } catch {
    return null;
  }
}
