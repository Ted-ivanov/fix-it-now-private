import { defineRouting } from "next-intl/routing";

export const locales = ["bg", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "bg",
  // "/" is Bulgarian, English lives under "/en".
  localePrefix: "as-needed",
  // Bulgarian is the default for everyone; the browser language does not redirect.
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/services/[category]": {
      bg: "/uslugi/[category]",
      en: "/services/[category]",
    },
    "/services/[category]/book": {
      bg: "/uslugi/[category]/zapazi-chas",
      en: "/services/[category]/book",
    },
    "/our-work": {
      bg: "/zavarsheni-proekti",
      en: "/our-work",
    },
    "/our-work/[slug]": {
      bg: "/zavarsheni-proekti/[slug]",
      en: "/our-work/[slug]",
    },
    "/cancel/[token]": {
      bg: "/otkazvane/[token]",
      en: "/cancel/[token]",
    },
    "/privacy": {
      bg: "/poveritelnost",
      en: "/privacy",
    },
    "/terms": {
      bg: "/obshti-usloviya",
      en: "/terms",
    },
    // Alternative designs (noindex, for comparison).
    "/v2": "/v2",
    "/v2/book": "/v2/book",
    "/v3": "/v3",
    "/v3/book": "/v3/book",
    "/v4": "/v4",
    "/v4/book": "/v4/book",
  },
});

export type AppPathname = keyof typeof routing.pathnames;
