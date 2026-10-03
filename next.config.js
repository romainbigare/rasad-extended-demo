// Static export for GitHub Pages. NEXT_PUBLIC_BASE_PATH is "/<repo>" on Pages, empty locally.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

module.exports = {
  output: "export",
  trailingSlash: false,
  reactStrictMode: true,
  swcMinify: true,
  images: { unoptimized: true },
  basePath,
  // Every backend call goes to the in-browser mock (service worker), same origin.
  env: {
    NEXT_PUBLIC_API_BASE_URL: `${basePath}/__mock`,
    NEXT_PUBLIC_RBAC_BASE_URL: `${basePath}/__mock`,
    NEXT_PUBLIC_ADAFSA_FE_URL: basePath,
    NEXT_PUBLIC_BASEMAP: "esri",
  },
};
