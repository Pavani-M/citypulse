import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/types";

export function Badge({
  children,
  className,
  tone = "slate",
}: {
  children: ReactNode;
  className?: string;
  tone?: "slate" | "blue" | "green" | "amber" | "red" | "purple";
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<RequestStatus, "slate" | "blue" | "green" | "amber" | "red"> = {
  Requested: "slate",
  "Under Review": "amber",
  Planned: "blue",
  "Coming Soon": "green",
  "Not Planned": "red",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
}
