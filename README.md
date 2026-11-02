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
- Produits : un fichier Markdown dans `src/content/produits/`. Dès qu'un `price:` (en euros) est renseigné, le tri et
  le filtre par prix de la boutique s'activent ; `needs:` donne les besoins du produit.
- Écrans de l'appli : `public/appli/` (accueil-serie, calendrier, envie, badges, addictforms), liste dans
  `src/components/PhoneShowcase.astro`. Remplacez un écran provisoire par la vraie capture sous le même nom.
- Charte (`src/styles/global.css`, police de `public/fonts/`) et numéros d'aide (`src/data/helplines.ts`) : copies de
  l'appli. Toute correction part de l'appli, puis est recopiée ici.
