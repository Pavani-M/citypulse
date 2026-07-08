import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Star } from "lucide-react";

import { listSavedPlaces, listUpvotedRequests, unsavePlace } from "@/api/profile";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { BusinessRequest, SavedPlace } from "@/types";

export function ProfilePage() {
  const { user } = useAuth();
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [upvotedRequests, setUpvotedRequests] = useState<BusinessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listSavedPlaces(), listUpvotedRequests()])
      .then(([places, requests]) => {
        setSavedPlaces(places);
        setUpvotedRequests(requests);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, []);

  const handleUnsave = async (placeId: string) => {
    await unsavePlace(placeId);
    setSavedPlaces((prev) => prev.filter((p) => p.placeId !== placeId));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">{user?.name}</h1>
      <p className="text-sm text-slate-500">{user?.email}</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Bookmark className="size-5" />
          Saved places ({savedPlaces.length})
        </h2>
        {savedPlaces.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Nothing saved yet —{" "}
            <Link to="/discover" className="text-brand-600 hover:underline">
              discover places nearby
            </Link>{" "}
            and bookmark your favorites.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {savedPlaces.map((place) => (
              <Card key={place.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{place.name}</p>
                  <p className="flex items-center gap-1 text-sm text-slate-500">
                    {place.rating !== null && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Star className="size-3.5 fill-current" />
                        {place.rating.toFixed(1)}
                      </span>
                    )}
                    {place.address && <span className="truncate">· {place.address}</span>}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleUnsave(place.placeId)}>
                  Remove
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">
          Upvoted requests ({upvotedRequests.length})
        </h2>
        {upvotedRequests.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            You haven't upvoted any requests yet —{" "}
            <Link to="/" className="text-brand-600 hover:underline">
              see what's trending
            </Link>
            .
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {upvotedRequests.map((request) => (
              <Card key={request.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <Link
                    to={`/requests/${request.id}`}
                    className="font-medium text-slate-900 hover:text-brand-600"
                  >
                    {request.businessName}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {request.sourceCity} → {request.targetCity}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
