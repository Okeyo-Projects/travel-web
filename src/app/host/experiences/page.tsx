"use client";

import { useMemo, useState } from "react";
import { HostExperienceCard } from "@/components/host/HostExperienceCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useHostExperienceCounts,
  useHostExperiences,
  useToggleExperienceVisibility,
} from "@/hooks/use-host-experiences";
import type {
  HostExperience,
  HostExperienceFilter,
} from "@/types/host-experiences";

type UnpublishDialogState = {
  open: boolean;
  experience: HostExperience | null;
};

const FILTERS: Array<{ id: HostExperienceFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
  { id: "review", label: "In Review" },
];

function normalizeTerm(value: string) {
  return value.trim().toLowerCase();
}

export default function HostExperiencesPage() {
  const [filter, setFilter] = useState<HostExperienceFilter>("all");
  const [search, setSearch] = useState("");
  const [dialogState, setDialogState] = useState<UnpublishDialogState>({
    open: false,
    experience: null,
  });

  const {
    data: experiences = [],
    isLoading,
    isError,
    error,
  } = useHostExperiences();
  const visibilityMutation = useToggleExperienceVisibility();

  const counts = useHostExperienceCounts(experiences);

  const filteredExperiences = useMemo(() => {
    const term = normalizeTerm(search);

    return experiences.filter((experience) => {
      const matchesFilter =
        filter === "all" ? true : experience.status === filter;
      const matchesSearch =
        term.length === 0
          ? true
          : experience.title.toLowerCase().includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [experiences, filter, search]);

  const pendingExperienceId = visibilityMutation.variables?.experienceId;

  const handlePublish = (experience: HostExperience) => {
    visibilityMutation.mutate({
      experienceId: experience.id,
      status: "published",
    });
  };

  const requestUnpublish = (experience: HostExperience) => {
    setDialogState({ open: true, experience });
  };

  const handleToggleVisibility = (experience: HostExperience) => {
    if (experience.status === "published") {
      requestUnpublish(experience);
      return;
    }

    handlePublish(experience);
  };

  const confirmUnpublish = () => {
    if (!dialogState.experience) {
      return;
    }

    visibilityMutation.mutate({
      experienceId: dialogState.experience.id,
      status: "draft",
    });

    setDialogState({ open: false, experience: null });
  };

  const closeDialog = () => {
    setDialogState({ open: false, experience: null });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Manage experience visibility
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Publish and unpublish your experiences without leaving host mode.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search experiences"
              aria-label="Search experiences"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((tab) => {
            const count = counts[tab.id];
            const active = filter === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className={
                  active ? "bg-slate-900 text-white hover:bg-slate-800" : ""
                }
                onClick={() => setFilter(tab.id)}
              >
                {tab.label} ({count})
              </Button>
            );
          })}
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((skeletonId) => (
            <div
              key={skeletonId}
              className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>
      ) : null}

      {!isLoading && isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <h3 className="text-sm font-semibold text-rose-700">
            Could not load experiences
          </h3>
          <p className="mt-1 text-sm text-rose-600">
            {error instanceof Error
              ? error.message
              : "Please retry in a moment."}
          </p>
        </div>
      ) : null}

      {!isLoading && !isError && filteredExperiences.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-base font-medium text-slate-900">
            {experiences.length === 0
              ? "You do not have any experiences yet."
              : "No experiences match this filter."}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {experiences.length === 0
              ? "Create or publish an experience from mobile to manage it here."
              : "Try another status tab or clear the search term."}
          </p>
        </div>
      ) : null}

      {!isLoading && !isError && filteredExperiences.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredExperiences.map((experience) => (
            <HostExperienceCard
              key={experience.id}
              experience={experience}
              onToggleVisibility={handleToggleVisibility}
              busy={Boolean(
                visibilityMutation.isPending &&
                  pendingExperienceId === experience.id,
              )}
            />
          ))}
        </div>
      ) : null}

      <AlertDialog
        open={dialogState.open}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish this experience?</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogState.experience?.activeBookingsCount
                ? `This experience currently has ${dialogState.experience.activeBookingsCount} active booking(s). Existing bookings are preserved, but new bookings will stop while the listing is unpublished.`
                : "This will hide the listing from discovery and prevent new bookings until you publish it again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={visibilityMutation.isPending}>
              Keep published
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmUnpublish();
              }}
              disabled={visibilityMutation.isPending}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              Unpublish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
