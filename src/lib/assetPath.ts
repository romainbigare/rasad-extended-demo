/** Prefixes a /public path with the deploy base path (GitHub Pages serves the site under /<repo>). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const asset = (path: string) => `${BASE_PATH}${path}`;
