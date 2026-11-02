# Addictive : site et boutique

Site statique Astro, sans paiement, sans cookie, sans traqueur, sans formulaire et sans JavaScript côté navigateur.

```bash
npm install
npm run dev
```

- `npm run build` construit le site dans `dist/` ; `npm run check` vérifie les types.
- Articles : un fichier Markdown dans `src/content/articles/`. Avec `draft: true`, l'article n'est visible qu'avec
  `npm run dev` et reste absent du site construit.
- Produits : un fichier Markdown dans `src/content/produits/`.
- Charte (`src/styles/global.css`, police de `public/fonts/`) et numéros d'aide (`src/data/helplines.ts`) : copies de
  l'appli. Toute correction part de l'appli, puis est recopiée ici.
