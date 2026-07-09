import { Bookmark, ImageOff, Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDistance } from "@/lib/utils";
import type { Place } from "@/types";

export function PlaceCard({
  place,
  isSaved,
  onSaveClick,
  isActive,
  onHover,
}: {
  place: Place;
  isSaved?: boolean;
  onSaveClick?: (place: Place) => void;
  isActive?: boolean;
  onHover?: (placeId: string | null) => void;
}) {
  const searchQuery = [place.name, place.address].filter(Boolean).join(" ");
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

  return (
    <Card
      onMouseEnter={() => onHover?.(place.placeId)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => window.open(searchUrl, "_blank", "noopener,noreferrer")}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.open(searchUrl, "_blank", "noopener,noreferrer");
        }
      }}
      className={`flex cursor-pointer gap-3 p-4 transition-shadow hover:shadow-md ${isActive ? "ring-2 ring-brand-400" : ""}`}
    >
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {place.photoUrl ? (
          <img
            src={place.photoUrl}
            alt={place.name}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImageOff className="size-6 text-slate-300" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-slate-900">{place.name}</h3>
          {onSaveClick && (
            <button
              type="button"
              aria-label={isSaved ? "Saved — manage collections" : "Save to a collection"}
              aria-pressed={isSaved}
              onClick={(e) => {
                e.stopPropagation();
                onSaveClick(place);
              }}
              className={isSaved ? "text-brand-600" : "text-slate-400 hover:text-brand-600"}
            >
              <Bookmark className="size-5" fill={isSaved ? "currentColor" : "none"} />
            </button>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {place.rating !== undefined && (
            <span className="flex items-center gap-1 font-medium text-amber-600">
              <Star className="size-3.5 fill-current" />
              {place.rating.toFixed(1)}
            </span>
          )}
          {place.userRatingsTotal !== undefined && (
            <span className="text-slate-400">({place.userRatingsTotal.toLocaleString()} reviews)</span>
          )}
          <Badge tone="slate">{place.category.replace("_", " ")}</Badge>
        </div>

        <p className="mt-1 truncate text-sm text-slate-500">{place.address}</p>
        <p className="mt-1 text-xs text-slate-400">{formatDistance(place.distanceMeters)} away</p>
      </div>
    </Card>
  );
}
