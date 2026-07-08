import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { createRequest } from "@/api/requests";
import { getApiErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { REQUEST_CATEGORIES, type RequestCategory } from "@/types";

export function CreateRequestPage() {
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState("");
  const [sourceCity, setSourceCity] = useState("");
  const [targetCity, setTargetCity] = useState("");
  const [category, setCategory] = useState<RequestCategory>("restaurant");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const request = await createRequest({
        businessName,
        sourceCity,
        targetCity,
        category,
        description: description.trim() || undefined,
      });
      navigate(`/requests/${request.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">Request a business</h1>
      <p className="mt-1 text-sm text-slate-500">
        Example: "Bring Third Wave Coffee from Bangalore to Hyderabad."
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="businessName">Business or restaurant name</Label>
          <Input
            id="businessName"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Third Wave Coffee"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sourceCity">From city</Label>
            <Input
              id="sourceCity"
              required
              value={sourceCity}
              onChange={(e) => setSourceCity(e.target.value)}
              placeholder="Bangalore"
            />
          </div>
          <div>
            <Label htmlFor="targetCity">To city</Label>
            <Input
              id="targetCity"
              required
              value={targetCity}
              onChange={(e) => setTargetCity(e.target.value)}
              placeholder="Hyderabad"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as RequestCategory)}
          >
            {REQUEST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="description">Why should it come here? (optional)</Label>
          <Textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="There's nothing like it in this city and the demand is huge among students nearby…"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Submit request
        </Button>
      </form>
    </div>
  );
}
