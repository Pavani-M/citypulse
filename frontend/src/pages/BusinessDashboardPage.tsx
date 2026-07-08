import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { listRequests } from "@/api/requests";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";
import type { BusinessRequest } from "@/types";

export function BusinessDashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BusinessRequest[]>([]);
  const [targetCity, setTargetCity] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => {
      listRequests({ targetCity: targetCity || undefined, sort: "top", pageSize: 50 })
        .then((res) => setRequests(res.requests))
        .catch((err) => setError(getApiErrorMessage(err)))
        .finally(() => setIsLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [targetCity]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">Business dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Signed in as <span className="font-medium">{user?.name}</span> — post progress updates and
        change status on any request below.
      </p>

      <div className="mt-6 max-w-xs">
        <Label htmlFor="filter-city">Filter by target city</Label>
        <Input
          id="filter-city"
          placeholder="e.g. Hyderabad"
          value={targetCity}
          onChange={(e) => setTargetCity(e.target.value)}
        />
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {requests.length === 0 && (
            <p className="text-sm text-slate-500">No requests match this filter.</p>
          )}
          {requests.map((request) => (
            <Card key={request.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{request.businessName}</span>
                  <StatusBadge status={request.status} />
                </div>
                <p className="text-sm text-slate-500">
                  {request.sourceCity} → {request.targetCity} · {request.upvoteCount} upvotes ·{" "}
                  {formatDate(request.createdAt)}
                </p>
              </div>
              <Link
                to={`/requests/${request.id}`}
                className="shrink-0 text-sm font-medium text-brand-600 hover:underline"
              >
                Manage →
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
