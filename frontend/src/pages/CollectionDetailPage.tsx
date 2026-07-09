import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageOff, Trash2 } from "lucide-react";

import { listCollections, removePlaceFromCollection } from "@/api/collections";
import { getApiErrorMessage } from "@/api/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";
import type { Collection, CollectionPlace } from "@/types";

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCollections()
      .then((cols) => {
        const found = cols.find((c) => c.id === id) ?? null;
        setCollection(found);
        if (!found) setError("Collection not found.");
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleRemove = async (place: CollectionPlace) => {
    if (!collection) return;
    try {
      await removePlaceFromCollection(collection.id, place.placeId);
      setCollection((prev) =>
        prev ? { ...prev, places: prev.places.filter((p) => p.placeId !== place.placeId) } : prev,
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-red-600">{error ?? "Collection not found."}</p>
        <Link to="/collections" className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
          <ArrowLeft className="size-4" />
          Back to collections
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        to="/collections"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600"
      >
        <ArrowLeft className="size-4" />
        Back to collections
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-slate-900">{collection.name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {collection.places.length} place{collection.places.length === 1 ? "" : "s"} saved
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {collection.places.length === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-500">
          Nothing saved here yet —{" "}
          <Link to="/discover" className="text-brand-600 hover:underline">
            discover places nearby
          </Link>{" "}
          and add them to this collection.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {collection.places.map((place) => {
            const searchQuery = [place.name, place.address].filter(Boolean).join(" ");
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
            return (
              <Card
                key={place.placeId}
                onClick={() => window.open(searchUrl, "_blank", "noopener,noreferrer")}
                className="flex cursor-pointer gap-3 p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                  {place.photoUrl ? (
                    <img src={place.photoUrl} alt={place.name} className="size-full object-cover" loading="lazy" />
                  ) : (
                    <ImageOff className="size-5 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-semibold text-slate-900">{place.name}</h3>
                    <button
                      type="button"
                      aria-label="Remove from this collection"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(place);
                      }}
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    {place.category && <Badge tone="slate">{place.category.replace("_", " ")}</Badge>}
                  </div>
                  {place.address && <p className="mt-1 truncate text-sm text-slate-500">{place.address}</p>}
                  <p className="mt-1 text-xs text-slate-400">Saved {formatDate(place.savedAt)}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
