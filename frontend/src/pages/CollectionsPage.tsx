import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Folder, FolderPlus, Pencil, Trash2, Check, X } from "lucide-react";

import {
  createCollection,
  deleteCollection,
  listCollections,
  renameCollection,
} from "@/api/collections";
import { getApiErrorMessage } from "@/api/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";
import type { Collection } from "@/types";

export function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    listCollections()
      .then(setCollections)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await createCollection(name);
      setCollections((prev) => [...prev, created]);
      setNewName("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (collection: Collection) => {
    setEditingId(collection.id);
    setEditingName(collection.name);
  };

  const handleRename = async (collection: Collection) => {
    const name = editingName.trim();
    if (!name || name === collection.name) {
      setEditingId(null);
      return;
    }
    try {
      const updated = await renameCollection(collection.id, name);
      setCollections((prev) => prev.map((c) => (c.id === collection.id ? { ...c, ...updated } : c)));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setEditingId(null);
    }
  };

  const handleDelete = async (collection: Collection) => {
    try {
      await deleteCollection(collection.id);
      setCollections((prev) => prev.filter((c) => c.id !== collection.id));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setConfirmDeleteId(null);
    }
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
      <h1 className="text-2xl font-semibold text-slate-900">Your collections</h1>
      <p className="mt-1 text-sm text-slate-500">
        Places you've saved while discovering, organized into lists.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New collection name, e.g. Weekend spots"
          maxLength={80}
        />
        <Button type="submit" isLoading={isCreating} disabled={!newName.trim()}>
          <FolderPlus className="size-4" />
          Create
        </Button>
      </form>

      {collections.length === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-500">
          No collections yet — create one above, or save a place from{" "}
          <Link to="/discover" className="text-brand-600 hover:underline">
            Discover
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {collections.map((collection) => (
            <Card key={collection.id} className="p-4">
              {confirmDeleteId === collection.id ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-700">
                    Delete "{collection.name}" and its {collection.places.length} saved place
                    {collection.places.length === 1 ? "" : "s"}?
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>
                      Cancel
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(collection)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <Link to={`/collections/${collection.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Folder className="size-5 shrink-0 text-brand-600" />
                    <div className="min-w-0">
                      {editingId === collection.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                          <Input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(collection);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            maxLength={80}
                            className="h-8 py-1"
                          />
                          <button
                            type="button"
                            aria-label="Save name"
                            onClick={() => handleRename(collection)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-md"
                          >
                            <Check className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Cancel rename"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <p className="truncate font-medium text-slate-900">{collection.name}</p>
                      )}
                      <p className="text-sm text-slate-500">
                        {collection.places.length} place{collection.places.length === 1 ? "" : "s"} ·
                        Created {formatDate(collection.createdAt)}
                      </p>
                    </div>
                  </Link>
                  {editingId !== collection.id && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label="Rename collection"
                        onClick={() => startEditing(collection)}
                        className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-md"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete collection"
                        onClick={() => setConfirmDeleteId(collection.id)}
                        className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-md"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
