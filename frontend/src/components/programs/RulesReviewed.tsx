import { formatReviewedDate, getOldestReviewDate } from "@/lib/corpus";

interface RulesReviewedProps {
  className?: string;
}

export function RulesReviewed({ className }: RulesReviewedProps) {
  const reviewed = getOldestReviewDate();
  return (
    <p className={className}>
      Program rules last reviewed <time dateTime={reviewed}>{formatReviewedDate(reviewed)}</time>
    </p>
  );
}
