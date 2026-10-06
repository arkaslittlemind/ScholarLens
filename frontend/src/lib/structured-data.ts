import { AUTHOR_NAME, AUTHOR_URL, CHECK_DESCRIPTION, HOME_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const CONTEXT = "https://schema.org";

const AUTHOR_ID = `${SITE_URL}/#author`;

// Google resolves @id references only within one page, so pages that point at the
// author also carry this minimal node.
const AUTHOR_REF = { "@type": "Person", "@id": AUTHOR_ID, name: AUTHOR_NAME };

function breadcrumbs(name: string, path: string) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name, item: `${SITE_URL}${path}` },
    ],
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
    breadcrumbs("Check eligibility", "/check"),
  ],
};

export const METHODOLOGY_JSON_LD = {
  "@context": CONTEXT,
  "@graph": [breadcrumbs("Methodology", "/methodology")],
};
