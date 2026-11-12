// GET /api/telecharger?token=… : envoie le PDF si le lien est authentique, non expiré et jamais utilisé.
// Les fichiers sont dans un stockage privé (KV « FICHIERS »), jamais dans un dossier public du site.
import { readToken } from "../_lib/stripe.js";

const text = (message, status) =>
  new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });

export async function onRequestGet({ request, env }) {
  if (!env.DOWNLOAD_SIGNING_SECRET || !env.FICHIERS || !env.TELECHARGEMENTS) return text("Service indisponible.", 500);

  const token = new URL(request.url).searchParams.get("token");
  const { payload, error } = await readToken(env.DOWNLOAD_SIGNING_SECRET, token);
  if (error === "expire") return text("Ce lien a expiré. Revenez sur la page de remerciement pour en obtenir un nouveau.", 410);
  if (error || !/^[a-z0-9-]{1,60}$/.test(payload.p ?? "")) return text("Lien invalide.", 403);

  // Usage unique : le lien est marqué avant l'envoi du fichier.
  const usedKey = `lien:${payload.j}`;
  if (await env.TELECHARGEMENTS.get(usedKey)) return text("Ce lien a déjà été utilisé. Revenez sur la page de remerciement pour en obtenir un nouveau.", 410);
  await env.TELECHARGEMENTS.put(usedKey, "1", { expirationTtl: 3600 });

  const file = await env.FICHIERS.get(`pdf:${payload.p}`, { type: "arrayBuffer" });
  if (!file) {
    await env.TELECHARGEMENTS.delete(usedKey);
    return text("Fichier momentanément indisponible. Écrivez-nous via la page Contact.", 404);
  }
  return new Response(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="addictive-${payload.p}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
