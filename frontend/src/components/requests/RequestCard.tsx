import { Link } from "react-router-dom";
import { ArrowBigUp, MapPin } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils";
import type { BusinessRequest } from "@/types";

export function RequestCard({
  request,
  onUpvote,
  upvoteDisabled,
}: {
  request: BusinessRequest;
  onUpvote?: (id: string) => void;
  upvoteDisabled?: boolean;
}) {
  return (
    <Card className="flex gap-4 p-5">
      <button
        type="button"
        onClick={() => onUpvote?.(request.id)}
        disabled={upvoteDisabled || request.isUpvotedByMe}
        aria-pressed={request.isUpvotedByMe}
        className={`flex h-fit flex-col items-center gap-0.5 rounded-lg border px-3 py-2 transition-colors ${
          request.isUpvotedByMe
            ? "border-brand-500 bg-brand-50 text-brand-600"
            : "border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <ArrowBigUp className="size-5" fill={request.isUpvotedByMe ? "currentColor" : "none"} />
        <span className="text-sm font-semibold">{request.upvoteCount}</span>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/requests/${request.id}`}
            className="font-semibold text-slate-900 hover:text-brand-600"
          >
            {request.businessName}
          </Link>
          <StatusBadge status={request.status} />
          <Badge tone="purple">{request.category}</Badge>
        </div>

        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="size-3.5" />
          {request.sourceCity} → {request.targetCity}
        </p>

        {request.description && (
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{request.description}</p>
        )}

        <p className="mt-2 text-xs text-slate-400">{timeAgo(request.createdAt)}</p>
      </div>
    </Card>
  );
}
