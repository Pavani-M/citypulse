import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { timeAgo } from "@/lib/utils";
import type { RequestComment } from "@/types";

export function CommentSection({
  comments,
  onSubmit,
}: {
  comments: RequestComment[];
  onSubmit: (content: string) => Promise<void>;
}) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Share your thoughts on this request…"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!content.trim()}>
            Post comment
          </Button>
        </form>
      ) : (
        <p className="text-sm text-slate-500">Log in to join the discussion.</p>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-slate-500">No comments yet — be the first to weigh in.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">
                  {comment.userName ?? "Anonymous"}
                </span>
                <span className="text-xs text-slate-400">{timeAgo(comment.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{comment.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
