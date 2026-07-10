import { ExamEnvironmentExamModeration } from "@prisma/client";
import { InfiniteData } from "@tanstack/react-query";

import { toaster } from "../components/toaster";
import { queryClient } from "../contexts";
import { moderationKeys } from "../hooks/queries";
import { cancelAttemptDeletion, scheduleAttemptDeletion } from "./fetch";

const DELETE_DELAY_SECONDS = 10;

// The countdown toast must outlive the page: the toaster is global, so if the
// timers died with a component the toast would freeze on navigation. All
// pending-delete state therefore lives at module scope, shared by every page
// that renders attempts or moderations.
const deleteTimers = new Map<
  string,
  { timeout: number; interval: number; toastId: string }
>();

// Attempt ids scheduled for (or past) deletion. Entries are only removed on
// undo; a finalized delete stays in the set so stale cached lists keep hiding
// the records.
let pendingDeletes = new Set<string>();
const pendingDeleteListeners = new Set<() => void>();

export function subscribePendingDeletes(listener: () => void) {
  pendingDeleteListeners.add(listener);
  return () => pendingDeleteListeners.delete(listener);
}

export function getPendingDeletes() {
  return pendingDeletes;
}

function setPendingDelete(attemptId: string, pending: boolean) {
  const next = new Set(pendingDeletes);
  if (pending) {
    next.add(attemptId);
  } else {
    next.delete(attemptId);
  }
  pendingDeletes = next;
  pendingDeleteListeners.forEach((listener) => listener());
}

// Tear down an attempt's countdown toast and timers.
function clearDeleteTimers(attemptId: string) {
  const timers = deleteTimers.get(attemptId);
  if (timers) {
    window.clearTimeout(timers.timeout);
    window.clearInterval(timers.interval);
    toaster.dismiss(timers.toastId);
    deleteTimers.delete(attemptId);
  }
}

// Restore an attempt in the UI and tear down its countdown toast/timers.
function clearPending(attemptId: string) {
  clearDeleteTimers(attemptId);
  setPendingDelete(attemptId, false);
}

// Drop cached data referencing the now-deleted records so nothing renders or
// refetches a 404 for them. Inactive-only: removing an actively observed query
// would trigger an immediate refetch, which is exactly the 404 to avoid —
// active views are already hidden via the pendingDeletes filter.
function purgeDeletedAttempt(attemptId: string) {
  queryClient.removeQueries({
    queryKey: ["attempt", attemptId],
    type: "inactive",
  });
  queryClient.removeQueries({
    queryKey: ["moderation", attemptId],
    type: "inactive",
  });
  queryClient.removeQueries({ queryKey: ["user-search"], type: "inactive" });
  queryClient.setQueriesData<InfiniteData<ExamEnvironmentExamModeration[]>>(
    { queryKey: moderationKeys.all },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) =>
          page.filter((m) => m.examAttemptId !== attemptId),
        ),
      },
  );
}

// Undo: cancel the server-side pending delete and restore the attempt.
export function undoDelete(attemptId: string) {
  clearPending(attemptId);
  cancelAttemptDeletion(attemptId).catch((e: Error) => {
    toaster.create({
      type: "error",
      title: "Undo failed",
      description: e.message,
    });
  });
}

export function scheduleDelete(attemptId: string) {
  setPendingDelete(attemptId, true);
  // Server owns the grace-period timer; the client countdown is only the undo affordance.
  scheduleAttemptDeletion(attemptId).catch((e: Error) => {
    clearPending(attemptId);
    toaster.create({
      type: "error",
      title: "Delete failed",
      description: e.message,
    });
  });

  let remaining = DELETE_DELAY_SECONDS;
  const toastId = toaster.create({
    type: "info",
    title: "Deleting attempt + moderation",
    description: `Undo within ${remaining}s`,
    duration: Number.POSITIVE_INFINITY,
    action: {
      label: "Undo",
      onClick: () => undoDelete(attemptId),
    },
  });

  const interval = window.setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      toaster.update(toastId, { description: `Undo within ${remaining}s` });
    }
  }, 1000);

  // Grace elapsed: the server has now deleted the attempt. Dismiss the toast,
  // purge stale caches, and leave the attempt in pendingDeletes so it stays
  // hidden. No undo past this point.
  const timeout = window.setTimeout(() => {
    clearDeleteTimers(attemptId);
    purgeDeletedAttempt(attemptId);
  }, DELETE_DELAY_SECONDS * 1000);

  deleteTimers.set(attemptId, { timeout, interval, toastId });
}
