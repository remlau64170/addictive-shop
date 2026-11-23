import { readFileSync } from "node:fs";
import { defineConfig } from "astro/config";

// Ouverture de la boutique : le réglage PUBLIC_BOUTIQUE_OUVERTE de wrangler.toml ([vars]) sert aussi à la construction,
// pour que le site affiché et le serveur (Functions) suivent toujours le même réglage, sans dépendre des variables de
// construction de Cloudflare. Une variable d'environnement déjà définie garde la priorité (essais en local).
if (process.env.PUBLIC_BOUTIQUE_OUVERTE === undefined) {
  try {
    const toml = readFileSync(new URL("./wrangler.toml", import.meta.url), "utf8");
    const valeur = toml.match(/^PUBLIC_BOUTIQUE_OUVERTE\s*=\s*"([^"]*)"/m)?.[1];
    if (valeur !== undefined) process.env.PUBLIC_BOUTIQUE_OUVERTE = valeur;
  } catch {
    // Pas de wrangler.toml : boutique fermée.
  }
}

// Site 100 % statique. Domaine de base configurable : variable SITE_URL, ou la valeur ci-dessous.
export default defineConfig({
  output: "static",
  site: process.env.SITE_URL ?? "https://shop.addictive-app.com",
  devToolbar: { enabled: false },
});
