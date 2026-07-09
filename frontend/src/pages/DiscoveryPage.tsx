import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { searchPlaces, type AutocompleteSuggestion } from "@/api/places";
import {
  addPlaceToCollection,
  createCollection,
  listCollections,
  removePlaceFromCollection,
} from "@/api/collections";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { FilterBar, DEFAULT_FILTERS, type PlaceFilters } from "@/components/places/FilterBar";
import { PlaceCard } from "@/components/places/PlaceCard";
import { MapView } from "@/components/places/MapView";
import { LocationAutocomplete } from "@/components/places/LocationAutocomplete";
import { SaveToCollectionModal } from "@/components/places/SaveToCollectionModal";
import { TipsModal } from "@/components/places/TipsModal";
import { VisitFormModal } from "@/components/visits/VisitFormModal";
import { createVisit, listVisits } from "@/api/visits";
import type { Collection, Place, Visit } from "@/types";

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
  const [ratingsAvailable, setRatingsAvailable] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [saveModalPlace, setSaveModalPlace] = useState<Place | null>(null);
  const [visitModalPlace, setVisitModalPlace] = useState<Place | null>(null);
  const [tipsModalPlace, setTipsModalPlace] = useState<Place | null>(null);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedPlaceIds = useMemo(
    () => new Set(collections.flatMap((c) => c.places.map((p) => p.placeId))),
    [collections],
  );
  const visitedPlaceIds = useMemo(() => new Set(visits.map((v) => v.placeId)), [visits]);

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
        setRatingsAvailable(res.ratingsAvailable);
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
      setCollections([]);
      setVisits([]);
      return;
    }
    listCollections()
      .then(setCollections)
      .catch(() => {
        /* Non-critical — save state just won't be pre-populated. */
      });
    listVisits()
      .then(setVisits)
      .catch(() => {
        /* Non-critical — visited state just won't be pre-populated. */
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

  const handleBookmarkClick = (place: Place) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setSaveModalPlace(place);
  };

  const handleToggleCollection = async (collection: Collection, isMember: boolean) => {
    if (isMember) {
      await removePlaceFromCollection(collection.id, saveModalPlace!.placeId);
      setCollections((prev) =>
        prev.map((c) =>
          c.id === collection.id
            ? { ...c, places: c.places.filter((p) => p.placeId !== saveModalPlace!.placeId) }
            : c,
        ),
      );
    } else {
      const added = await addPlaceToCollection(collection.id, saveModalPlace!);
      setCollections((prev) =>
        prev.map((c) => (c.id === collection.id ? { ...c, places: [added, ...c.places] } : c)),
      );
    }
  };

  const handleCreateCollection = async (name: string) => {
    const created = await createCollection(name);
    setCollections((prev) => [...prev, created]);
    return created;
  };

  const handleAddVisitClick = (place: Place) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setVisitModalPlace(place);
  };

  const handleTipsClick = (place: Place) => {
    setTipsModalPlace(place);
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
        <FilterBar filters={filters} onChange={handleFiltersChange} ratingsAvailable={ratingsAvailable} />
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
                  onSaveClick={handleBookmarkClick}
                  hasVisit={visitedPlaceIds.has(place.placeId)}
                  onAddVisitClick={handleAddVisitClick}
                  onTipsClick={handleTipsClick}
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

      {saveModalPlace && (
        <SaveToCollectionModal
          place={saveModalPlace}
          collections={collections}
          onClose={() => setSaveModalPlace(null)}
          onToggle={handleToggleCollection}
          onCreate={handleCreateCollection}
        />
      )}

      {visitModalPlace && (
        <VisitFormModal
          place={{
            placeId: visitModalPlace.placeId,
            name: visitModalPlace.name,
            category: visitModalPlace.category,
            address: visitModalPlace.address,
            photoUrl: visitModalPlace.photoUrl,
          }}
          onClose={() => setVisitModalPlace(null)}
          onSubmit={async (input) => {
            const created = await createVisit(input);
            setVisits((prev) => [created, ...prev]);
          }}
        />
      )}

      {tipsModalPlace && (
        <TipsModal
          place={{ placeId: tipsModalPlace.placeId, name: tipsModalPlace.name }}
          onClose={() => setTipsModalPlace(null)}
        />
      )}
    </div>
  );
}
