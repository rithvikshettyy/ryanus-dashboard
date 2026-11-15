import { connection } from "next/server";
import { PageHeader } from "@/components/layout/page-header";

/**
 * Same page frame as the dashboard: sticky header + centred, padded content column.
 * connection() opts out of build-time prerendering, so the header bell always shows fresh "x min ago" times.
 */
export async function ModulePage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  await connection();
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="mx-auto max-w-[1400px] space-y-5 p-4 md:space-y-7 md:p-8">{children}</div>
    </>
  );
}
