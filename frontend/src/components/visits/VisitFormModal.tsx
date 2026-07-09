import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Plus, Star, ThumbsDown, ThumbsUp, X } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Visit, VisitPrivacy } from "@/types";
import { VISIT_PRIVACY_OPTIONS } from "@/types";
import type { VisitInput } from "@/api/visits";

export interface VisitPlaceRef {
  placeId: string;
  name: string;
  category?: string | null;
  address?: string | null;
  photoUrl?: string | null;
}

const PRIVACY_LABEL: Record<VisitPrivacy, string> = {
  public: "Public",
  friends: "Friends only",
  private: "Private",
};

function TagInput({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const value = draft.trim();
    if (value && !values.includes(value)) onChange([...values, value]);
    setDraft("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-300 p-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
        {values.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(values.filter((t) => t !== tag))}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={values.length === 0 ? placeholder : ""}
          className="min-w-[8ch] flex-1 border-0 p-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}

export function VisitFormModal({
  place,
  visit,
  onClose,
  onSubmit,
}: {
  place: VisitPlaceRef;
  visit?: Visit;
  onClose: () => void;
  onSubmit: (input: VisitInput) => Promise<void>;
}) {
  const [visitDate, setVisitDate] = useState(visit?.visitDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [purpose, setPurpose] = useState(visit?.purpose ?? "");
  const [servicesUsed, setServicesUsed] = useState<string[]>(visit?.servicesUsed ?? []);
  const [itemsPurchased, setItemsPurchased] = useState<string[]>(visit?.itemsPurchased ?? []);
  const [amountSpent, setAmountSpent] = useState(visit?.amountSpent?.toString() ?? "");
  const [rating, setRating] = useState(visit?.rating ?? 0);
  const [waitingMinutes, setWaitingMinutes] = useState(visit?.waitingMinutes?.toString() ?? "");
  const [photos, setPhotos] = useState<string[]>(visit?.photos ?? []);
  const [photoDraft, setPhotoDraft] = useState("");
  const [notes, setNotes] = useState(visit?.notes ?? "");
  const [wouldVisitAgain, setWouldVisitAgain] = useState<boolean | null>(visit?.wouldVisitAgain ?? null);
  const [privacy, setPrivacy] = useState<VisitPrivacy>(visit?.privacy ?? "private");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPhoto = () => {
    const url = photoDraft.trim();
    if (!url) return;
    setPhotos((prev) => [...prev, url]);
    setPhotoDraft("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!visitDate) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        placeId: place.placeId,
        placeName: place.name,
        placeCategory: place.category ?? null,
        placeAddress: place.address ?? null,
        placePhotoUrl: place.photoUrl ?? null,
        visitDate,
        purpose: purpose.trim() || null,
        servicesUsed,
        itemsPurchased,
        amountSpent: amountSpent.trim() === "" ? null : Number(amountSpent),
        rating: rating > 0 ? rating : null,
        waitingMinutes: waitingMinutes.trim() === "" ? null : Number(waitingMinutes),
        photos,
        notes: notes.trim() || null,
        wouldVisitAgain,
        privacy,
      });
      onClose();
    } catch {
      setError("Couldn't save this visit — try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={visit ? `Edit visit to ${place.name}` : `Add visit to ${place.name}`} onClose={onClose} className="max-w-lg">
      <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="visit-date">Date</Label>
            <Input
              id="visit-date"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div>
            <Label htmlFor="visit-purpose">Purpose</Label>
            <Input
              id="visit-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Dinner with friends"
              maxLength={200}
            />
          </div>
        </div>

        <TagInput
          label="Services used"
          placeholder="Type and press Enter"
          values={servicesUsed}
          onChange={setServicesUsed}
        />

        <TagInput
          label="Items purchased"
          placeholder="Type and press Enter"
          values={itemsPurchased}
          onChange={setItemsPurchased}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="visit-amount">Amount spent</Label>
            <Input
              id="visit-amount"
              type="number"
              min={0}
              step="0.01"
              value={amountSpent}
              onChange={(e) => setAmountSpent(e.target.value)}
              placeholder="₹0"
            />
          </div>
          <div>
            <Label htmlFor="visit-waiting">Waiting time (min)</Label>
            <Input
              id="visit-waiting"
              type="number"
              min={0}
              step={1}
              value={waitingMinutes}
              onChange={(e) => setWaitingMinutes(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <Label>Rating</Label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                onClick={() => setRating(rating === value ? 0 : value)}
                className="p-0.5 text-amber-400 hover:scale-110"
              >
                <Star className="size-6" fill={value <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Photos</Label>
          <div className="space-y-1.5">
            {photos.map((url, i) => (
              <div key={`${url}-${i}`} className="flex items-center gap-2">
                <Input value={url} readOnly className="h-9 truncate text-slate-500" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 p-1.5 text-slate-400 hover:text-red-600"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input
                value={photoDraft}
                onChange={(e) => setPhotoDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPhoto();
                  }
                }}
                placeholder="Paste a photo URL"
                className="h-9"
              />
              <Button type="button" variant="outline" size="sm" onClick={addPhoto} disabled={!photoDraft.trim()}>
                <Plus className="size-4" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="visit-notes">Notes</Label>
          <Textarea
            id="visit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering about this visit"
            rows={3}
            maxLength={2000}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Would visit again?</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWouldVisitAgain(wouldVisitAgain === true ? null : true)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium",
                  wouldVisitAgain === true
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50",
                )}
              >
                <ThumbsUp className="size-4" />
                Yes
              </button>
              <button
                type="button"
                onClick={() => setWouldVisitAgain(wouldVisitAgain === false ? null : false)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium",
                  wouldVisitAgain === false
                    ? "border-red-600 bg-red-50 text-red-700"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50",
                )}
              >
                <ThumbsDown className="size-4" />
                No
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="visit-privacy">Privacy</Label>
            <Select
              id="visit-privacy"
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as VisitPrivacy)}
            >
              {VISIT_PRIVACY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {PRIVACY_LABEL[option]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {visit ? "Save changes" : "Add visit"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
