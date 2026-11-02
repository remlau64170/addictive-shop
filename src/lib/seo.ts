/** Référencement : adresses absolues, à partir du domaine de base réglé dans astro.config.mjs (variable SITE_URL). */
export const SITE_NAME = "Addictive";
export const CONTACT_EMAIL = "contact@addictive-app.com";
export const DEFAULT_IMAGE = "/og.jpg";

export function absolute(path: string) {
  const withSlash = path.endsWith("/") || /\.[a-z0-9]+$/i.test(path) ? path : `${path}/`;
  return new URL(withSlash, import.meta.env.SITE).href;
}

export const PUBLISHER = {
  "@type": "Organization",
  name: SITE_NAME,
  url: absolute("/"),
  logo: absolute("/icon-only-192.png"),
};
