import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, IndianRupee, LayoutGrid, MapPin } from "lucide-react";

import { deleteVisit, getVisitStats, listVisits, updateVisit } from "@/api/visits";
import { getApiErrorMessage } from "@/api/client";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { VisitCard } from "@/components/visits/VisitCard";
import { VisitFormModal } from "@/components/visits/VisitFormModal";
import type { Visit, VisitStats } from "@/types";

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </Card>
  );
}

function MonthlyActivityChart({ monthlyActivity }: { monthlyActivity: VisitStats["monthlyActivity"] }) {
  if (monthlyActivity.length === 0) return null;
  const max = Math.max(...monthlyActivity.map((m) => m.count));

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-slate-900">Monthly activity</h2>
      <div className="mt-3 space-y-2">
        {monthlyActivity.map(({ month, count }) => (
          <div key={month} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-slate-500">{month}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${Math.max((count / max) * 100, 6)}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-xs text-slate-500">{count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function TimelinePage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listVisits(), getVisitStats()])
      .then(([v, s]) => {
        setVisits(v);
        setStats(s);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, []);

  const handleUpdateVisit = async (visitId: string, input: Parameters<typeof updateVisit>[1]) => {
    const updated = await updateVisit(visitId, input);
    setVisits((prev) => prev.map((v) => (v.id === visitId ? updated : v)));
    setStats(await getVisitStats());
  };

  const handleDelete = async (visit: Visit) => {
    try {
      await deleteVisit(visit.id);
      setVisits((prev) => prev.filter((v) => v.id !== visit.id));
      setStats(await getVisitStats());
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
      <h1 className="text-2xl font-semibold text-slate-900">Your visit timeline</h1>
      <p className="mt-1 text-sm text-slate-500">Everywhere you've logged a visit, most recent first.</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {stats && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={<CalendarClock className="size-5" />} label="Total visits" value={String(stats.totalVisits)} />
            <StatCard
              icon={<IndianRupee className="size-5" />}
              label="Total spent"
              value={`₹${stats.totalSpent.toLocaleString()}`}
            />
            <StatCard
              icon={<LayoutGrid className="size-5" />}
              label="Categories visited"
              value={String(stats.categoriesVisited)}
            />
            <StatCard
              icon={<MapPin className="size-5" />}
              label="Favorite category"
              value={stats.favoriteCategory ? stats.favoriteCategory.replace("_", " ") : "—"}
            />
          </div>

          <div className="mt-4">
            <MonthlyActivityChart monthlyActivity={stats.monthlyActivity} />
          </div>
        </>
      )}

      <div className="mt-6 space-y-3">
        {visits.length === 0 ? (
          <p className="mt-10 text-center text-sm text-slate-500">
            No visits logged yet — head to{" "}
            <Link to="/discover" className="text-brand-600 hover:underline">
              Discover
            </Link>{" "}
            and log a visit to a place.
          </p>
        ) : (
          visits.map((visit) => (
            <VisitCard
              key={visit.id}
              visit={visit}
              onEdit={setEditingVisit}
              onRequestDelete={(v) => setConfirmDeleteId(v.id)}
              onConfirmDelete={handleDelete}
              isConfirmingDelete={confirmDeleteId === visit.id}
              onCancelDelete={() => setConfirmDeleteId(null)}
            />
          ))
        )}
      </div>

      {editingVisit && (
        <VisitFormModal
          place={{
            placeId: editingVisit.placeId,
            name: editingVisit.placeName,
            category: editingVisit.placeCategory,
            address: editingVisit.placeAddress,
            photoUrl: editingVisit.placePhotoUrl,
          }}
          visit={editingVisit}
          onClose={() => setEditingVisit(null)}
          onSubmit={async (input) => {
            await handleUpdateVisit(editingVisit.id, input);
          }}
        />
      )}
    </div>
  );
}
