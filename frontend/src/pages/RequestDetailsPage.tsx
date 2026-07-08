import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowBigUp, MapPin } from "lucide-react";

import {
  getRequest,
  postComment,
  postRequestUpdate,
  removeUpvote,
  upvoteRequest,
} from "@/api/requests";
import { getApiErrorMessage } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Input";
import { StatusTimeline } from "@/components/requests/StatusTimeline";
import { CommentSection } from "@/components/requests/CommentSection";
import { formatDate } from "@/lib/utils";
import { REQUEST_STATUSES, type BusinessRequest, type RequestComment, type RequestStatus, type RequestUpdate } from "@/types";

export function RequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState<BusinessRequest | null>(null);
  const [updates, setUpdates] = useState<RequestUpdate[]>([]);
  const [comments, setComments] = useState<RequestComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    getRequest(id)
      .then((res) => {
        setRequest(res.request);
        setUpdates(res.updates);
        setComments(res.comments);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpvote = async () => {
    if (!id) return;
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      const updated = request?.isUpvotedByMe ? await removeUpvote(id) : await upvoteRequest(id);
      setRequest(updated);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleComment = async (content: string) => {
    if (!id) return;
    const comment = await postComment(id, content);
    setComments((prev) => [...prev, comment]);
  };

  if (isLoading) return <FullPageSpinner />;
  if (error && !request) {
    return <p className="mx-auto max-w-3xl px-4 py-10 text-sm text-red-600">{error}</p>;
  }
  if (!request) return null;

  const canPostUpdate = user?.role === "business_rep" || user?.role === "admin";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">{request.businessName}</h1>
              <StatusBadge status={request.status} />
              <Badge tone="purple">{request.category}</Badge>
            </div>
            <p className="mt-2 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="size-4" />
              {request.sourceCity} → {request.targetCity}
            </p>
            <p className="mt-1 text-xs text-slate-400">Requested on {formatDate(request.createdAt)}</p>
          </div>

          <button
            type="button"
            onClick={handleUpvote}
            aria-pressed={request.isUpvotedByMe}
            className={`flex h-fit flex-col items-center gap-0.5 rounded-lg border px-4 py-3 transition-colors ${
              request.isUpvotedByMe
                ? "border-brand-500 bg-brand-50 text-brand-600"
                : "border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600"
            }`}
          >
            <ArrowBigUp className="size-6" fill={request.isUpvotedByMe ? "currentColor" : "none"} />
            <span className="text-sm font-semibold">{request.upvoteCount}</span>
          </button>
        </div>

        {request.description && (
          <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-700">
            {request.description}
          </p>
        )}
      </Card>

      {canPostUpdate && (
        <BusinessUpdateForm
          requestId={request.id}
          currentStatus={request.status}
          onPosted={(update, newStatus) => {
            setUpdates((prev) => [...prev, update]);
            if (newStatus) setRequest((prev) => (prev ? { ...prev, status: newStatus } : prev));
          }}
        />
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Status timeline & updates</h2>
        <Card className="mt-3 p-5">
          <StatusTimeline updates={updates} />
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Discussion</h2>
        <Card className="mt-3 p-5">
          <CommentSection comments={comments} onSubmit={handleComment} />
        </Card>
      </section>
    </div>
  );
}

function BusinessUpdateForm({
  requestId,
  currentStatus,
  onPosted,
}: {
  requestId: string;
  currentStatus: RequestStatus;
  onPosted: (update: RequestUpdate, newStatus?: RequestStatus) => void;
}) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<RequestStatus>(currentStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const statusChanged = status !== currentStatus;
      const update = await postRequestUpdate(requestId, {
        message: message.trim(),
        status: statusChanged ? status : undefined,
      });
      onPosted(update, statusChanged ? status : undefined);
      setMessage("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-6 border-brand-200 bg-brand-50/50 p-5">
      <p className="text-sm font-semibold text-brand-700">Post an official update</p>
      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <Textarea
          rows={3}
          placeholder="We've signed the lease and construction begins next month…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as RequestStatus)}
            className="max-w-[200px]"
          >
            {REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!message.trim()}>
            Post update
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Card>
  );
}
