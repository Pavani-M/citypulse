import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderHeart } from "lucide-react";

import { listCollections } from "@/api/collections";
import { listUpvotedRequests } from "@/api/profile";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { BusinessRequest, Collection } from "@/types";

export function ProfilePage() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [upvotedRequests, setUpvotedRequests] = useState<BusinessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listCollections(), listUpvotedRequests()])
      .then(([cols, requests]) => {
        setCollections(cols);
        setUpvotedRequests(requests);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, []);

  const totalSavedPlaces = collections.reduce((sum, c) => sum + c.places.length, 0);

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
          <FolderHeart className="size-5" />
          Collections ({collections.length})
        </h2>
        {collections.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Nothing saved yet —{" "}
            <Link to="/discover" className="text-brand-600 hover:underline">
              discover places nearby
            </Link>{" "}
            and save your favorites into a collection.
          </p>
        ) : (
          <Card className="mt-3 flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">
                {collections.length} collection{collections.length === 1 ? "" : "s"}
              </p>
              <p className="text-sm text-slate-500">
                {totalSavedPlaces} place{totalSavedPlaces === 1 ? "" : "s"} saved
              </p>
            </div>
            <Link to="/collections" className="text-sm font-medium text-brand-600 hover:underline">
              View collections
            </Link>
          </Card>
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
