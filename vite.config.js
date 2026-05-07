import { defineConfig } from "vite";

/**
 * GitHub Pages project site: https://<user>.github.io/<repo>/
 * needs base "/<repo>/". User/org page repo (*.<github.io>) uses base "/".
 * Override anytime: VITE_BASE=/custom/ npm run build
 */
function pagesBase() {
  const explicit = process.env.VITE_BASE;
  if (explicit) {
    const b = explicit.endsWith("/") ? explicit : `${explicit}/`;
    return b.startsWith("/") ? b : `/${b}`;
  }
  const full = process.env.GITHUB_REPOSITORY || "";
  const repo = full.includes("/") ? full.split("/")[1] : "";
  if (!repo) return "/";
  if (repo.toLowerCase().endsWith(".github.io")) return "/";
  return `/${repo}/`;
}

export default defineConfig({
  base: pagesBase(),
  server: {
    port: 5174,
    strictPort: true,
  },
});
