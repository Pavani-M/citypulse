import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles } from "lucide-react";

import { listRequests, upvoteRequest, removeUpvote } from "@/api/requests";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { RequestCard } from "@/components/requests/RequestCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import type { BusinessRequest } from "@/types";

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [sort, setSort] = useState<"top" | "new">("top");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationQuery, setLocationQuery] = useState("");

  useEffect(() => {
    setIsLoading(true);
    listRequests({ sort })
      .then((res) => setRequests(res.requests))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [sort]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!locationQuery.trim()) return;
    navigate(`/discover?location=${encodeURIComponent(locationQuery.trim())}`);
  };

  const handleUpvote = async (id: string) => {
    if (!user) {
      navigate("/login");
      return;
    }
    const target = requests.find((r) => r.id === id);
    if (!target) return;

    try {
      const updated = target.isUpvotedByMe ? await removeUpvote(id) : await upvoteRequest(id);
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-12 text-white sm:px-10">
        <p className="flex items-center gap-2 text-sm font-medium text-brand-100">
          <Sparkles className="size-4" />
          Bring the places you love to your city
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Request businesses. Discover what's already nearby.
        </h1>
        <p className="mt-3 max-w-xl text-brand-100">
          Vote for the restaurant, cafe, or store you wish existed here — and explore what's already
          around you with real ratings and reviews.
        </p>

        <form onSubmit={handleSearch} className="mt-6 flex max-w-lg gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search an area, e.g. Koramangala"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Discover
          </Button>
        </form>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-900">Trending requests</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={sort === "top" ? "primary" : "outline"}
              onClick={() => setSort("top")}
            >
              Top
            </Button>
            <Button
              size="sm"
              variant={sort === "new" ? "primary" : "outline"}
              onClick={() => setSort("new")}
            >
              Newest
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate("/requests/new")}>
              + New request
            </Button>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {isLoading ? (
          <div className="mt-10 flex justify-center">
            <Spinner />
          </div>
        ) : requests.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            No requests yet — be the first to request a business for your city.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} onUpvote={handleUpvote} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
