# Addictive : site et boutique

Site statique Astro, sans paiement, sans cookie, sans traqueur et sans bibliothèque extérieure. Un peu de JavaScript
intégré aux pages sert au menu, à la recherche, aux filtres et au tri ; le site reste lisible sans lui.

```bash
npm install
npm run dev
```

- `npm run build` construit le site dans `dist/` ; `npm run check` vérifie les types.
- Articles : un fichier Markdown dans `src/content/articles/`. Avec `draft: true`, l'article n'est visible qu'avec
  `npm run dev` et reste absent du site construit.
- Produits : un fichier Markdown dans `src/content/produits/`. Visuels dans `public/produits/`, refaits avec
  `node scripts/visuels/generate.mjs`. Dès qu'un `price:` (en euros) est renseigné, le tri et
  le filtre par prix de la boutique s'activent ; `needs:` donne les besoins du produit.
- Démo de l'appli (`src/demo/`) : écrans en HTML/CSS repris de l'appli, données 100 % fictives (`data.ts`), aucun appel
  réseau. Le code n'est chargé que lorsque le téléphone arrive à l'écran.
- Charte (`src/styles/global.css`, police de `public/fonts/`) et numéros d'aide (`src/data/helplines.ts`) : copies de
  l'appli. Toute correction part de l'appli, puis est recopiée ici.
