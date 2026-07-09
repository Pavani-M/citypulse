import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { searchPlaces, type AutocompleteSuggestion } from "@/api/places";
import { listSavedPlaces, savePlace, unsavePlace } from "@/api/profile";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { FilterBar, DEFAULT_FILTERS, type PlaceFilters } from "@/components/places/FilterBar";
import { PlaceCard } from "@/components/places/PlaceCard";
import { MapView } from "@/components/places/MapView";
import { LocationAutocomplete } from "@/components/places/LocationAutocomplete";
import type { Place } from "@/types";

export function DiscoveryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialLocation = searchParams.get("location") ?? "";
  const [locationInput, setLocationInput] = useState(initialLocation);
  const [filters, setFilters] = useState<PlaceFilters>(DEFAULT_FILTERS);

  const [center, setCenter] = useState<{ lat: number; lng: number; formattedAddress: string } | null>(
    null,
  );
  const [places, setPlaces] = useState<Place[]>([]);
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (location: string, currentFilters: PlaceFilters) => {
      if (!location.trim()) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await searchPlaces({
          location: location.trim(),
          category: currentFilters.category || undefined,
          minRating: currentFilters.minRating || undefined,
          minReviews: currentFilters.minReviews || undefined,
          radiusMeters: currentFilters.radiusMeters,
          sortBy: currentFilters.sortBy,
        });
        setCenter(res.center);
        setPlaces(res.places);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialLocation) runSearch(initialLocation, filters);
    // Only run on mount / when the URL's `location` param changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocation]);

  useEffect(() => {
    if (!user) {
      setSavedPlaceIds(new Set());
      return;
    }
    listSavedPlaces()
      .then((saved) => setSavedPlaceIds(new Set(saved.map((s) => s.placeId))))
      .catch(() => {
        /* Non-critical — save state just won't be pre-populated. */
      });
  }, [user]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearchParams(locationInput ? { location: locationInput } : {});
    runSearch(locationInput, filters);
  };

  const handleSuggestionSelect = (suggestion: AutocompleteSuggestion) => {
    setLocationInput(suggestion.description);
    setSearchParams({ location: suggestion.description });
    runSearch(suggestion.description, filters);
  };

  const handleFiltersChange = (next: PlaceFilters) => {
    setFilters(next);
    if (center) runSearch(locationInput, next);
  };

  const handleToggleSave = async (place: Place) => {
    if (!user) {
      navigate("/login");
      return;
    }
    const isSaved = savedPlaceIds.has(place.placeId);
    try {
      if (isSaved) {
        await unsavePlace(place.placeId);
        setSavedPlaceIds((prev) => {
          const next = new Set(prev);
          next.delete(place.placeId);
          return next;
        });
      } else {
        await savePlace(place);
        setSavedPlaceIds((prev) => new Set(prev).add(place.placeId));
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">Discover nearby places</h1>
      <p className="mt-1 text-sm text-slate-500">
        Search an area, locality, or city to see restaurants, cafes, attractions, parks, and malls
        around it.
      </p>

      <form onSubmit={handleSearchSubmit} className="mt-6 flex gap-2">
        <LocationAutocomplete
          value={locationInput}
          onChange={setLocationInput}
          onSelect={handleSuggestionSelect}
          placeholder="Search an area, e.g. Indiranagar"
        />
        <Button type="submit" isLoading={isLoading}>
          Search
        </Button>
      </form>

      <div className="mt-4">
        <FilterBar filters={filters} onChange={handleFiltersChange} />
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <Spinner />
        </div>
      ) : center ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MapView
            center={center}
            radiusMeters={filters.radiusMeters}
            places={places}
            activePlaceId={activePlaceId}
            onSelectPlace={setActivePlaceId}
          />

          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              {places.length} place{places.length === 1 ? "" : "s"} near{" "}
              <span className="font-medium text-slate-700">{center.formattedAddress}</span>
            </p>
            <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
              {places.map((place) => (
                <PlaceCard
                  key={place.placeId}
                  place={place}
                  isSaved={savedPlaceIds.has(place.placeId)}
                  onToggleSave={handleToggleSave}
                  isActive={activePlaceId === place.placeId}
                  onHover={setActivePlaceId}
                />
              ))}
              {places.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  No places match these filters — try widening the radius or clearing a filter.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-slate-500">
          Search an area above to see what's nearby.
        </p>
      )}
    </div>
  );
}
