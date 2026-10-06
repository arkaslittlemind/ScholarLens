// The programs in the knowledge base, one per backend/data/programs/*.md file.
// Short display names and scopes only: the rules themselves are read from the
// corpus (src/lib/corpus.ts), which fails the build if this list and the files drift.
export interface CoveredProgram {
  name: string;
  scope: string;
  // The corpus filename with "_" as "-", and the program page's URL segment.
  slug: string;
}

export const COVERED_PROGRAMS: CoveredProgram[] = [
  { name: "Federal Pell Grant", scope: "Federal", slug: "federal-pell-grant" },
  { name: "Federal SEOG", scope: "Federal", slug: "federal-seog" },
  { name: "Federal TEACH Grant", scope: "Federal", slug: "federal-teach-grant" },
  { name: "Cal Grant A and B", scope: "California", slug: "california-cal-grant" },
  { name: "Bright Futures FAS", scope: "Florida", slug: "florida-bright-futures" },
  { name: "Georgia HOPE Scholarship", scope: "Georgia", slug: "georgia-hope-scholarship" },
  { name: "NJ Educational Opportunity Fund", scope: "New Jersey", slug: "nj-eof" },
  { name: "NJ STARS", scope: "New Jersey", slug: "nj-stars" },
  { name: "NJ Tuition Aid Grant", scope: "New Jersey", slug: "nj-tag" },
  { name: "NY Tuition Assistance Program", scope: "New York", slug: "ny-tap" },
];

export function programPath(slug: string): string {
  return `/programs/${slug}`;
}
