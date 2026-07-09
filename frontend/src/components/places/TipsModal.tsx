import { useEffect, useState, type FormEvent } from "react";
import { Flag, Pencil, Pin, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { createTip, deleteTip, listTips, pinTip, reportTip, updateTip, voteTip } from "@/api/tips";
import { getApiErrorMessage } from "@/api/client";
import type { Tip, TipSort } from "@/types";
import { TIP_SORT_OPTIONS } from "@/types";

const SORT_LABEL: Record<TipSort, string> = {
  helpful: "Most Helpful",
  newest: "Newest",
  verified: "Verified Business",
  pinned: "Pinned Tips",
};

const MAX_LENGTH = 250;

function TipRow({
  tip,
  currentUserId,
  isAdmin,
  onVote,
  onReport,
  onEdit,
  onDelete,
  onPin,
}: {
  tip: Tip;
  currentUserId: string | undefined;
  isAdmin: boolean;
  onVote: (tip: Tip, value: 1 | -1) => void;
  onReport: (tip: Tip) => void;
  onEdit: (tip: Tip) => void;
  onDelete: (tip: Tip) => void;
  onPin: (tip: Tip) => void;
}) {
  const isOwn = tip.userId === currentUserId;

  return (
    <div className="border-b border-slate-100 px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-medium text-slate-900">{tip.userName ?? "Anonymous"}</span>
        {tip.userRole === "business_rep" && <Badge tone="blue">Verified Business</Badge>}
        {tip.isTopContributor && <Badge tone="purple">Top Contributor</Badge>}
        {tip.isPinned && <Badge tone="amber">📌 Pinned</Badge>}
      </div>

      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{tip.body}</p>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          aria-label="Upvote"
          aria-pressed={tip.myVote === 1}
          onClick={() => onVote(tip, 1)}
          className={cn(
            "flex items-center gap-1 text-sm",
            tip.myVote === 1 ? "text-brand-600" : "text-slate-400 hover:text-brand-600",
          )}
        >
          <ThumbsUp className="size-4" fill={tip.myVote === 1 ? "currentColor" : "none"} />
          {tip.upvoteCount}
        </button>
        <button
          type="button"
          aria-label="Downvote"
          aria-pressed={tip.myVote === -1}
          onClick={() => onVote(tip, -1)}
          className={cn(
            "flex items-center gap-1 text-sm",
            tip.myVote === -1 ? "text-red-600" : "text-slate-400 hover:text-red-600",
          )}
        >
          <ThumbsDown className="size-4" fill={tip.myVote === -1 ? "currentColor" : "none"} />
          {tip.downvoteCount}
        </button>
        <button
          type="button"
          aria-label={tip.isReportedByMe ? "Already reported" : "Report"}
          disabled={tip.isReportedByMe}
          onClick={() => onReport(tip)}
          className={cn(
            "flex items-center gap-1 text-sm",
            tip.isReportedByMe ? "text-slate-300" : "text-slate-400 hover:text-red-600",
          )}
        >
          <Flag className="size-4" />
        </button>

        <div className="ml-auto flex items-center gap-2">
          {isOwn && (
            <>
              <button
                type="button"
                aria-label="Edit tip"
                onClick={() => onEdit(tip)}
                className="text-slate-400 hover:text-brand-600"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Delete tip"
                onClick={() => onDelete(tip)}
                className="text-slate-400 hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          )}
          {isAdmin && (
            <button
              type="button"
              aria-label={tip.isPinned ? "Unpin tip" : "Pin tip"}
              aria-pressed={tip.isPinned}
              onClick={() => onPin(tip)}
              className={tip.isPinned ? "text-amber-600" : "text-slate-400 hover:text-amber-600"}
            >
              <Pin className="size-4" fill={tip.isPinned ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TipsModal({ place, onClose }: { place: { placeId: string; name: string }; onClose: () => void }) {
  const { user } = useAuth();
  const [sort, setSort] = useState<TipSort>("helpful");
  const [tips, setTips] = useState<Tip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [editingTipId, setEditingTipId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    listTips(place.placeId, sort)
      .then(setTips)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [place.placeId, sort]);

  const replaceTip = (updated: Tip) => {
    setTips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleVote = async (tip: Tip, value: 1 | -1) => {
    try {
      const updated = await voteTip(place.placeId, tip.id, value);
      replaceTip(updated);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleReport = async (tip: Tip) => {
    try {
      const updated = await reportTip(place.placeId, tip.id);
      replaceTip(updated);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handlePin = async (tip: Tip) => {
    try {
      const updated = await pinTip(place.placeId, tip.id, !tip.isPinned);
      replaceTip(updated);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleDelete = async (tip: Tip) => {
    try {
      await deleteTip(place.placeId, tip.id);
      setTips((prev) => prev.filter((t) => t.id !== tip.id));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleEdit = (tip: Tip) => {
    setEditingTipId(tip.id);
    setDraft(tip.body);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (editingTipId) {
        const updated = await updateTip(place.placeId, editingTipId, body);
        replaceTip(updated);
        setEditingTipId(null);
      } else {
        const created = await createTip(place.placeId, body);
        setTips((prev) => [created, ...prev]);
      }
      setDraft("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={`Tips for ${place.name}`} onClose={onClose} className="max-w-lg">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        <span className="text-xs font-medium text-slate-500">Sort by</span>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as TipSort)}
          className="h-9 w-auto"
        >
          {TIP_SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {SORT_LABEL[option]}
            </option>
          ))}
        </Select>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : tips.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            No tips yet — be the first to share one.
          </p>
        ) : (
          tips.map((tip) => (
            <TipRow
              key={tip.id}
              tip={tip}
              currentUserId={user?.id}
              isAdmin={user?.role === "admin"}
              onVote={handleVote}
              onReport={handleReport}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPin={handlePin}
            />
          ))
        )}
      </div>

      {error && <p className="px-4 pt-2 text-sm text-red-600">{error}</p>}

      {user ? (
        <form onSubmit={handleSubmit} className="border-t border-slate-100 p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="e.g. Visit before 9 AM, cash only, parking is behind the building"
            rows={2}
            maxLength={MAX_LENGTH}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {draft.length}/{MAX_LENGTH}
            </span>
            <div className="flex gap-2">
              {editingTipId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingTipId(null);
                    setDraft("");
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!draft.trim()}>
                {editingTipId ? "Save changes" : "Post tip"}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <p className="border-t border-slate-100 px-4 py-3 text-center text-sm text-slate-500">
          Log in to add a tip.
        </p>
      )}
    </Modal>
  );
}
