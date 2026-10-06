interface JsonLdProps {
  data: Record<string, unknown>;
}

// Escaping "<" means no string in the data can close the script tag early.
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: JsonLdProps) {
  // Safe as raw HTML only because serializeJsonLd escapes every "<".
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
