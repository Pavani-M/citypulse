import { CheckCircle2, MessageSquare } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { RequestUpdate } from "@/types";

export function StatusTimeline({ updates }: { updates: RequestUpdate[] }) {
  if (updates.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No official updates yet — the business hasn't posted progress on this request.
      </p>
    );
  }

  return (
    <ol className="relative space-y-6 border-l border-slate-200 pl-6">
      {updates.map((update) => (
        <li key={update.id} className="relative">
          <span className="absolute -left-[1.65rem] flex size-5 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            {update.status ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <MessageSquare className="size-3" />
            )}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {update.status && <StatusBadge status={update.status} />}
            <span className="text-xs text-slate-400">{formatDate(update.createdAt)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-700">{update.message}</p>
          {update.postedByName && (
            <p className="mt-1 text-xs text-slate-400">— {update.postedByName}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
