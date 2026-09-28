/**
 * Site-wide configuration: names, contact channels, navigation, SEO.
 * Contact details are Boaive's public ones (same as the studio site).
 */

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const site = {
  name: "Boaive's Burger Experiment",
  shortName: "Burger Experiment",
  studio: "Boaive",
  url: resolveSiteUrl(),
  /** The experiment's one idea. */
  thesis: "Built one layer at a time.",
  /** The fictional restaurant's personality, used sparingly. */
  slogan: "Messy hands. Good decisions.",
  description:
    "A burger, built one layer at a time. A fictional burger joint and a real experiment in storytelling, motion and 3D, made by Boaive.",

  contact: {
    email: "boaive.tech@gmail.com",
    instagram: {
      handle: "@boaive",
      url: "https://www.instagram.com/boaive/",
    },
  },
} as const;

export const emailHref = `mailto:${site.contact.email}`;

export type NavItem = { label: string; href: string };

export const primaryNav: NavItem[] = [
  { label: "Experience", href: "/" },
  { label: "Menu", href: "/menu" },
  { label: "Our Story", href: "/story" },
];
