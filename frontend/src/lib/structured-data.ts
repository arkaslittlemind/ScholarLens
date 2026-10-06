import { AUTHOR_NAME, AUTHOR_URL, CHECK_DESCRIPTION, HOME_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const CONTEXT = "https://schema.org";

const AUTHOR_ID = `${SITE_URL}/#author`;

// Google resolves @id references only within one page, so pages that point at the
// author also carry this minimal node.
const AUTHOR_REF = { "@type": "Person", "@id": AUTHOR_ID, name: AUTHOR_NAME };

interface Crumb {
  name: string;
  path: string;
}

const HOME_CRUMB: Crumb = { name: "Home", path: "" };

const PROGRAMS_CRUMB: Crumb = { name: "Programs", path: "/programs" };

// The trail after Home, in order.
function breadcrumbs(trail: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [HOME_CRUMB, ...trail].map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

export const HOME_JSON_LD = {
  "@context": CONTEXT,
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: HOME_DESCRIPTION,
      inLanguage: "en-US",
      publisher: { "@id": AUTHOR_ID },
    },
    { ...AUTHOR_REF, url: AUTHOR_URL, sameAs: [AUTHOR_URL] },
  ],
};

export const CHECK_JSON_LD = {
  "@context": CONTEXT,
  "@graph": [
    {
      "@type": "WebApplication",
      name: `${SITE_NAME} eligibility checker`,
      url: `${SITE_URL}/check`,
      description: CHECK_DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@id": AUTHOR_ID },
    },
    AUTHOR_REF,
    breadcrumbs([{ name: "Check eligibility", path: "/check" }]),
  ],
};

export const METHODOLOGY_JSON_LD = {
  "@context": CONTEXT,
  "@graph": [breadcrumbs([{ name: "Methodology", path: "/methodology" }])],
};

export const PROGRAMS_JSON_LD = {
  "@context": CONTEXT,
  "@graph": [breadcrumbs([PROGRAMS_CRUMB])],
};

export function programJsonLd(program: Crumb) {
  return {
    "@context": CONTEXT,
    "@graph": [breadcrumbs([PROGRAMS_CRUMB, program])],
  };
}
