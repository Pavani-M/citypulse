import { useState, type FormEvent } from "react";
import { Car, IndianRupee, ParkingCircle, Sparkles, Star } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { queryConcierge } from "@/api/concierge";
import { getApiErrorMessage } from "@/api/client";
import type { ConciergeResponse } from "@/types";

const EXAMPLE_PROMPTS = [
  "I have ₹1500. Plan a perfect date night in Jubilee Hills.",
  "Need the best dermatologist for acne under ₹1000 near Madhapur.",
];

function emojiForCategory(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("park") || c.includes("garden")) return "🌅";
  if (c.includes("cafe") || c.includes("coffee")) return "☕";
  if (c.includes("dessert") || c.includes("ice cream") || c.includes("sweet")) return "🍨";
  if (c.includes("restaurant") || c.includes("dinner") || c.includes("food")) return "🍽";
  if (c.includes("mall") || c.includes("shop")) return "🛍";
  if (c.includes("bar") || c.includes("pub")) return "🍸";
  if (c.includes("museum") || c.includes("attraction") || c.includes("tourist")) return "🏛";
  if (c.includes("gym") || c.includes("fitness")) return "🏋";
  if (c.includes("doctor") || c.includes("clinic") || c.includes("dermat") || c.includes("hospital"))
    return "🩺";
  if (c.includes("salon") || c.includes("spa")) return "💇";
  return "📍";
}

export function ConciergePage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<ConciergeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runQuery = async (text: string, excludePlaceIds: string[] = []) => {
    if (!text.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await queryConcierge(text, { excludePlaceIds });
      setResponse(res);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setResponse(null);
    runQuery(message);
  };

  const handleAnother = () => {
    if (!response) return;
    runQuery(message, response.usedPlaceIds);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-6 text-brand-600" />
        <h1 className="text-2xl font-semibold text-slate-900">AI Local Concierge</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Tell it what you need in plain language — a budget, an occasion, a specialty — and it'll
        plan or recommend from real nearby places instead of you fiddling with filters.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="I have ₹1500. Plan a perfect date night in Jubilee Hills."
          rows={3}
          maxLength={500}
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setMessage(prompt)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
            >
              {prompt}
            </button>
          ))}
        </div>
        <Button type="submit" isLoading={isLoading} disabled={!message.trim()}>
          Ask the Concierge
        </Button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {isLoading && (
        <div className="mt-10 flex justify-center">
          <Spinner />
        </div>
      )}

      {!isLoading && response?.type === "itinerary" && (
        <div className="mt-8 space-y-4">
          <div className="space-y-3">
            {response.result.stops.map((stop, i) => (
              <Card key={`${stop.placeId ?? stop.placeName}-${i}`} className="flex items-start gap-3 p-4">
                <span className="text-2xl leading-none">{emojiForCategory(stop.category)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-400">{stop.time}</p>
                  <p className="font-semibold text-slate-900">{stop.label}</p>
                  <p className="text-sm text-slate-500">{stop.placeName}</p>
                </div>
                <span className="shrink-0 text-sm font-medium text-slate-600">
                  ₹{stop.estimatedCostInr}
                </span>
              </Card>
            ))}
          </div>

          <Card className="flex flex-wrap items-center gap-4 p-4">
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <IndianRupee className="size-4 text-slate-400" />
              Estimated Cost ₹{response.result.estimatedTotalCostInr}
            </span>
            {response.result.drivingDistanceKm !== null && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Car className="size-4 text-slate-400" />
                Driving Distance {response.result.drivingDistanceKm} km
              </span>
            )}
            <Badge tone={response.result.parkingAvailable ? "green" : "slate"} className="flex items-center gap-1">
              <ParkingCircle className="size-3.5" />
              {response.result.parkingAvailable ? "Parking Available" : "Parking Not Confirmed"}
            </Badge>
          </Card>

          {response.result.notes && <p className="text-sm text-slate-500">{response.result.notes}</p>}

          <Button variant="outline" onClick={handleAnother} isLoading={isLoading}>
            Another
          </Button>
        </div>
      )}

      {!isLoading && response?.type === "recommendation" && (
        <div className="mt-8 space-y-4">
          <div className="space-y-3">
            {response.result.items.map((item, i) => (
              <Card key={`${item.placeId ?? item.placeName}-${i}`} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-900">
                    {i + 1}. {item.placeName}
                  </p>
                  {item.rating !== null && (
                    <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-amber-600">
                      <Star className="size-3.5 fill-current" />
                      {item.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.reason}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                  {item.estimatedCostInr !== null && <span>~₹{item.estimatedCostInr}</span>}
                  {item.distanceMeters !== null && (
                    <span>{Math.round(item.distanceMeters)} m away</span>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {response.result.notes && <p className="text-sm text-slate-500">{response.result.notes}</p>}

          <Button variant="outline" onClick={handleAnother} isLoading={isLoading}>
            Another
          </Button>
        </div>
      )}
    </div>
  );
}
