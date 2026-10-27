import { QueryProvider } from "@/components/check/QueryProvider";

export default function CheckLayout({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
