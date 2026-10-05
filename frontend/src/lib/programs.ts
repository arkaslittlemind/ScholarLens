// The programs in the knowledge base, mirroring backend/data/programs/*.md.
// Marketing and methodology copy only: the agent's answers never read this list.
export interface CoveredProgram {
  name: string;
  scope: string;
}

export const COVERED_PROGRAMS: CoveredProgram[] = [
  { name: "Federal Pell Grant", scope: "Federal" },
  { name: "Federal SEOG", scope: "Federal" },
  { name: "Federal TEACH Grant", scope: "Federal" },
  { name: "Cal Grant A and B", scope: "California" },
  { name: "Bright Futures FAS", scope: "Florida" },
  { name: "Georgia HOPE Scholarship", scope: "Georgia" },
  { name: "NJ Educational Opportunity Fund", scope: "New Jersey" },
  { name: "NJ STARS", scope: "New Jersey" },
  { name: "NJ Tuition Aid Grant", scope: "New Jersey" },
  { name: "NY Tuition Assistance Program", scope: "New York" },
];
