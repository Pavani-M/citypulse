import { MapPin } from "lucide-react";
import type { Place } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "bg-red-500",
  cafe: "bg-amber-500",
  tourist_attraction: "bg-purple-500",
  park: "bg-green-500",
  mall: "bg-blue-500",
};

/**
 * Lightweight, dependency-free stand-in for the Google Maps JavaScript API.
 * Positions markers proportionally within the search radius around the
 * center point. Swap this component for `@react-google-maps/api` (or the
 * vanilla Maps JS SDK) once a real GOOGLE_MAPS_API_KEY is available — the
 * props here already match what a real map component would need.
 */
export function MapView({
  center,
  radiusMeters,
  places,
  activePlaceId,
  onSelectPlace,
}: {
  center: { lat: number; lng: number };
  radiusMeters: number;
  places: Place[];
  activePlaceId?: string | null;
  onSelectPlace?: (placeId: string) => void;
}) {
  const radiusInDegrees = radiusMeters / 111000;

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:aspect-auto sm:h-[520px]">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden="true"
      />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center">
          <MapPin className="size-7 fill-slate-900 text-slate-900" />
          <span className="mt-0.5 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
            You searched here
          </span>
        </div>
      </div>

      {places.map((place) => {
        const dx = place.lng - center.lng;
        const dy = place.lat - center.lat;
        const leftPercent = Math.min(96, Math.max(4, 50 + (dx / radiusInDegrees) * 44));
        const topPercent = Math.min(96, Math.max(4, 50 - (dy / radiusInDegrees) * 44));
        const isActive = activePlaceId === place.placeId;

        return (
          <button
            key={place.placeId}
            type="button"
            title={place.rating !== undefined ? `${place.name} · ${place.rating.toFixed(1)}★` : place.name}
            onClick={() => onSelectPlace?.(place.placeId)}
            style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow transition-transform ${
              CATEGORY_COLORS[place.category] ?? "bg-slate-500"
            } ${isActive ? "z-10 size-4 scale-125" : "size-3"}`}
            aria-label={place.name}
          />
        );
      })}

      <p className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-[10px] text-slate-500">
        Illustrative map — connect a Google Maps API key for live tiles
      </p>
    </div>
  );
}
