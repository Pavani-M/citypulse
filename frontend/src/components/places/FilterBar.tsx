import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Input";
import { PLACE_CATEGORIES, SEARCH_RADII_METERS } from "@/types";
import { formatDistance } from "@/lib/utils";
import type { SearchPlacesParams } from "@/api/places";

export interface PlaceFilters {
  category: string;
  minRating: number;
  minReviews: number;
  radiusMeters: (typeof SEARCH_RADII_METERS)[number];
  sortBy: NonNullable<SearchPlacesParams["sortBy"]>;
}

export const DEFAULT_FILTERS: PlaceFilters = {
  category: "",
  minRating: 0,
  minReviews: 0,
  radiusMeters: 3000,
  sortBy: "distance",
};

export function FilterBar({
  filters,
  onChange,
  ratingsAvailable = true,
}: {
  filters: PlaceFilters;
  onChange: (next: PlaceFilters) => void;
  /** Hides rating-based filters/sort options when the active provider has no rating data. */
  ratingsAvailable?: boolean;
}) {
  return (
    <div className={`grid grid-cols-2 gap-4 ${ratingsAvailable ? "sm:grid-cols-5" : "sm:grid-cols-3"}`}>
      <div>
        <Label htmlFor="filter-category">Category</Label>
        <Select
          id="filter-category"
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
        >
          <option value="">All categories</option>
          {PLACE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace("_", " ")}
            </option>
          ))}
        </Select>
      </div>

      {ratingsAvailable && (
        <div>
          <Label htmlFor="filter-rating">Min rating</Label>
          <Select
            id="filter-rating"
            value={filters.minRating}
            onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
          >
            <option value={0}>Any rating</option>
            {[3, 3.5, 4, 4.5].map((r) => (
              <option key={r} value={r}>
                {r}+ stars
              </option>
            ))}
          </Select>
        </div>
      )}

      {ratingsAvailable && (
        <div>
          <Label htmlFor="filter-reviews">Min reviews</Label>
          <Select
            id="filter-reviews"
            value={filters.minReviews}
            onChange={(e) => onChange({ ...filters, minReviews: Number(e.target.value) })}
          >
            <option value={0}>Any</option>
            {[50, 100, 500, 1000].map((r) => (
              <option key={r} value={r}>
                {r}+ reviews
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="filter-radius">Distance</Label>
        <Select
          id="filter-radius"
          value={filters.radiusMeters}
          onChange={(e) =>
            onChange({
              ...filters,
              radiusMeters: Number(e.target.value) as PlaceFilters["radiusMeters"],
            })
          }
        >
          {SEARCH_RADII_METERS.map((r) => (
            <option key={r} value={r}>
              within {formatDistance(r)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-sort">Sort by</Label>
        <Select
          id="filter-sort"
          value={filters.sortBy}
          onChange={(e) => onChange({ ...filters, sortBy: e.target.value as PlaceFilters["sortBy"] })}
        >
          <option value="distance">Nearest</option>
          {ratingsAvailable && <option value="rating">Highest rating</option>}
          {ratingsAvailable && <option value="reviews">Most reviews</option>}
        </Select>
      </div>
    </div>
  );
}
