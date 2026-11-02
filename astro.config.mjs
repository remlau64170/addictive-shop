import { defineConfig } from "astro/config";

// Site 100 % statique. Domaine de base configurable : variable SITE_URL, ou la valeur ci-dessous.
export default defineConfig({
  output: "static",
  site: process.env.SITE_URL ?? "https://shop.addictive-app.com",
  devToolbar: { enabled: false },
});
