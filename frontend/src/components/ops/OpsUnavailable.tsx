import type { OpsResult } from "@/lib/ops";

interface OpsUnavailableProps {
  kind: Exclude<OpsResult["kind"], "ok">;
}

const COPY: Record<OpsUnavailableProps["kind"], { title: string; body: string }> = {
  not_configured: {
    title: "The operations view is not configured",
    body: "Set the same OPS_API_TOKEN on the backend and in the frontend's server environment, then restart both.",
  },
  rejected: {
    title: "The backend rejected the ops token",
    body: "OPS_API_TOKEN differs between the frontend and the backend. Make them match and restart.",
  },
  unavailable: {
    title: "The backend is not reachable",
    body: "The API did not answer or returned an unexpected response. Check that it is running, then reload.",
  },
};

export function OpsUnavailable({ kind }: OpsUnavailableProps) {
  const { title, body } = COPY[kind];
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-3xl border border-hairline p-8">
      <h2 className="text-xl font-medium">{title}</h2>
      <p className="text-ink-secondary">{body}</p>
    </div>
  );
}
