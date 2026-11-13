// Correspondance produit du site → variantes Printful. Seul fichier à modifier pour ajouter une couleur ou une taille.
// T-shirt : Bella+Canvas 3001 (produit Printful 71), broderie poitrine côté cœur, fils standard Printful.
export const CATALOGUE_PRINTFUL = {
  "t-shirt-sois-addict": {
    produit: 71,
    emplacement: "embroidery_chest_left",
    optionFils: "thread_colors_chest_left",
    // Position du blason à taille réelle : zone poitrine 1200 × 1200 px à 300 dpi (10,2 cm), blason 667 × 496 px
    // (56,5 × 42 mm), centré, en haut de la zone. Sans position, Printful agrandirait le motif à toute la zone.
    position: { area_width: 1200, area_height: 1200, width: 667, height: 496, top: 0, left: 267 },
    couleurs: {
      noir: {
        fils: ["#3399FF", "#FFFFFF"], // Aqua/Teal (logo) et blanc (textes)
        // EMPLACEMENT DU BLASON : variable d'environnement avec l'adresse publique du fichier, ou « id:12345 »
        // pour un fichier de la bibliothèque Printful. À brancher quand le blason sera validé.
        fichier: "PRINTFUL_FICHIER_BLASON_NOIR",
        variantes: { XS: 9527, S: 4016, M: 4017, L: 4018, XL: 4019, "2XL": 4020, "3XL": 5295, "4XL": 5310 },
      },
      blanc: {
        fils: ["#005397", "#000000"], // Royal (logo) et noir (textes)
        fichier: "PRINTFUL_FICHIER_BLASON_BLANC",
        variantes: { XS: 9526, S: 4011, M: 4012, L: 4013, XL: 4014, "2XL": 4015, "3XL": 5294, "4XL": 5309 },
      },
    },
  },
};
