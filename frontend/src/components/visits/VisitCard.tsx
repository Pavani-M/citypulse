import { Clock, ImageOff, Pencil, Star, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { Visit, VisitPrivacy } from "@/types";

const PRIVACY_LABEL: Record<VisitPrivacy, string> = {
  public: "Public",
  friends: "Friends only",
  private: "Private",
};

const PRIVACY_TONE: Record<VisitPrivacy, "green" | "blue" | "slate"> = {
  public: "green",
  friends: "blue",
  private: "slate",
};

export function VisitCard({
  visit,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  isConfirmingDelete,
  onCancelDelete,
}: {
  visit: Visit;
  onEdit: (visit: Visit) => void;
  onRequestDelete: (visit: Visit) => void;
  onConfirmDelete: (visit: Visit) => void;
  isConfirmingDelete?: boolean;
  onCancelDelete?: () => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
          {visit.placePhotoUrl ? (
            <img src={visit.placePhotoUrl} alt={visit.placeName} className="size-full object-cover" loading="lazy" />
          ) : (
            <ImageOff className="size-5 text-slate-300" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-slate-900">{visit.placeName}</h3>
              <p className="text-xs text-slate-400">{formatDate(visit.visitDate)}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                aria-label="Edit visit"
                onClick={() => onEdit(visit)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Delete visit"
                onClick={() => onRequestDelete(visit)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {visit.placeCategory && <Badge tone="slate">{visit.placeCategory.replace("_", " ")}</Badge>}
            <Badge tone={PRIVACY_TONE[visit.privacy]}>{PRIVACY_LABEL[visit.privacy]}</Badge>
            {visit.rating !== null && (
              <span className="flex items-center gap-1 font-medium text-amber-600">
                <Star className="size-3.5 fill-current" />
                {visit.rating}/5
              </span>
            )}
            {visit.wouldVisitAgain !== null &&
              (visit.wouldVisitAgain ? (
                <span className="flex items-center gap-1 text-green-600">
                  <ThumbsUp className="size-3.5" /> Would return
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-500">
                  <ThumbsDown className="size-3.5" /> Wouldn't return
                </span>
              ))}
          </div>

          {visit.purpose && <p className="mt-1.5 text-sm text-slate-700">{visit.purpose}</p>}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {visit.amountSpent !== null && <span>₹{visit.amountSpent.toLocaleString()} spent</span>}
            {visit.waitingMinutes !== null && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {visit.waitingMinutes} min wait
              </span>
            )}
          </div>

          {(visit.servicesUsed.length > 0 || visit.itemsPurchased.length > 0) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {visit.servicesUsed.map((s) => (
                <span key={`s-${s}`} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                  {s}
                </span>
              ))}
              {visit.itemsPurchased.map((i) => (
                <span key={`i-${i}`} className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                  {i}
                </span>
              ))}
            </div>
          )}

          {visit.notes && <p className="mt-1.5 text-sm text-slate-500">{visit.notes}</p>}

          {visit.photos.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {visit.photos.map((url, i) => (
                <img
                  key={`${url}-${i}`}
                  src={url}
                  alt={`${visit.placeName} visit photo ${i + 1}`}
                  className="size-16 shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {isConfirmingDelete && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2">
          <p className="text-sm text-red-700">Delete this visit?</p>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={onCancelDelete}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={() => onConfirmDelete(visit)}>
              Delete
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
