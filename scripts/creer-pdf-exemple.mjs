/**
 * Crée un PDF d'exemple très simple (une page de texte) : les vrais PDF viendront plus tard.
 * Usage : node scripts/creer-pdf-exemple.mjs <sortie.pdf> "<titre>"
 */
import { writeFileSync } from "node:fs";

const [sortie, titre = "PDF d'exemple"] = process.argv.slice(2);
if (!sortie) throw new Error("Usage : node scripts/creer-pdf-exemple.mjs <sortie.pdf> \"<titre>\"");

const latin1 = (text) => text.replace(/[\()]/g, "\$&");
const lignes = [titre, "PDF d'exemple : le vrai contenu arrivera plus tard.", "Fichier de test, sans valeur commerciale."];
const flux = `BT /F1 20 Tf 60 760 Td (${latin1(lignes[0])}) Tj /F1 12 Tf 0 -34 Td (${latin1(lignes[1])}) Tj 0 -20 Td (${latin1(lignes[2])}) Tj ET`;
const objets = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
  `<< /Length ${Buffer.byteLength(flux, "latin1")} >>\nstream\n${flux}\nendstream`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
];
let pdf = "%PDF-1.4\n";
const positions = [];
objets.forEach((objet, index) => {
  positions.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${index + 1} 0 obj\n${objet}\nendobj\n`;
});
const debut = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${positions.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("")}`;
pdf += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${debut}\n%%EOF\n`;
writeFileSync(sortie, Buffer.from(pdf, "latin1"));
console.log(`PDF d'exemple créé : ${sortie}`);
