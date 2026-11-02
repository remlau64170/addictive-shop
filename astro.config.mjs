import { defineConfig } from "astro/config";

// Site 100 % statique. Le domaine (`site`) sera ajouté à la mise en ligne.
export default defineConfig({
  output: "static",
  devToolbar: { enabled: false },
});
