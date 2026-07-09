import { useState, type FormEvent } from "react";
import { Check, FolderPlus, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Collection, Place } from "@/types";

export function SaveToCollectionModal({
  place,
  collections,
  onClose,
  onToggle,
  onCreate,
}: {
  place: Place;
  collections: Collection[];
  onClose: () => void;
  onToggle: (collection: Collection, isMember: boolean) => Promise<void>;
  onCreate: (name: string) => Promise<Collection>;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (collection: Collection) => {
    const isMember = collection.places.some((p) => p.placeId === place.placeId);
    setPendingId(collection.id);
    setError(null);
    try {
      await onToggle(collection, isMember);
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setPendingId(null);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await onCreate(name);
      setNewName("");
      await handleToggle(created);
    } catch {
      setError("Couldn't create that collection — try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal title="Save to collection" onClose={onClose}>
      <div className="max-h-72 overflow-y-auto p-2">
        {collections.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500">
            You don't have any collections yet — create one below to save "{place.name}".
          </p>
        ) : (
          collections.map((collection) => {
            const isMember = collection.places.some((p) => p.placeId === place.placeId);
            const isPending = pendingId === collection.id;
            return (
              <button
                key={collection.id}
                type="button"
                disabled={isPending}
                onClick={() => handleToggle(collection)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-900">{collection.name}</span>
                  <span className="text-xs text-slate-400">
                    {collection.places.length} place{collection.places.length === 1 ? "" : "s"}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded border",
                    isMember ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300",
                  )}
                >
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    isMember && <Check className="size-3.5" />
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>

      {error && <p className="px-4 pb-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleCreate} className="flex items-center gap-2 border-t border-slate-100 p-3">
        <FolderPlus className="size-5 shrink-0 text-slate-400" />
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New collection name"
          maxLength={80}
          className="h-9"
        />
        <Button type="submit" size="sm" isLoading={isCreating} disabled={!newName.trim()}>
          Create
        </Button>
      </form>
    </Modal>
  );
}
