import type { DemoMessage } from "./vpa-assistant";

export type SavedChatThread = {
  id: string;
  title: string;
  messages: DemoMessage[];
  activeWorkoutId: string;
  updatedAt: number;
};

export type WorkoutActivityEntry = {
  id: string;
  workoutSlug: string;
  workoutName: string;
  type: "started" | "completed";
  completedExercises: number;
  totalExercises: number;
  timestamp: number;
};

export function isSavedChatThread(value: unknown): value is SavedChatThread {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SavedChatThread).id === "string" &&
    typeof (value as SavedChatThread).title === "string" &&
    Array.isArray((value as SavedChatThread).messages) &&
    typeof (value as SavedChatThread).activeWorkoutId === "string" &&
    typeof (value as SavedChatThread).updatedAt === "number"
  );
}

export function isWorkoutActivityEntry(value: unknown): value is WorkoutActivityEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as WorkoutActivityEntry).id === "string" &&
    typeof (value as WorkoutActivityEntry).workoutSlug === "string" &&
    typeof (value as WorkoutActivityEntry).workoutName === "string" &&
    ((value as WorkoutActivityEntry).type === "started" ||
      (value as WorkoutActivityEntry).type === "completed") &&
    typeof (value as WorkoutActivityEntry).completedExercises === "number" &&
    typeof (value as WorkoutActivityEntry).totalExercises === "number" &&
    typeof (value as WorkoutActivityEntry).timestamp === "number"
  );
}

export function sanitizeSavedThreads(value: unknown) {
  return Array.isArray(value) ? value.filter(isSavedChatThread) : [];
}

export function sanitizeWorkoutActivityEntries(value: unknown) {
  return Array.isArray(value) ? value.filter(isWorkoutActivityEntry) : [];
}

export function mergeSavedThreads(
  localThreads: SavedChatThread[],
  remoteThreads: SavedChatThread[],
) {
  const mergedById = new Map<string, SavedChatThread>();

  for (const thread of [...localThreads, ...remoteThreads]) {
    const existing = mergedById.get(thread.id);

    if (!existing || thread.updatedAt >= existing.updatedAt) {
      mergedById.set(thread.id, thread);
    }
  }

  return Array.from(mergedById.values())
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, 20);
}

export function mergeWorkoutActivityEntries(
  localEntries: WorkoutActivityEntry[],
  remoteEntries: WorkoutActivityEntry[],
) {
  const mergedById = new Map<string, WorkoutActivityEntry>();

  for (const entry of [...localEntries, ...remoteEntries]) {
    const existing = mergedById.get(entry.id);

    if (!existing || entry.timestamp >= existing.timestamp) {
      mergedById.set(entry.id, entry);
    }
  }

  return Array.from(mergedById.values())
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 18);
}

export function pickPreferredThreadId(
  threads: SavedChatThread[],
  preferredIds: Array<string | null | undefined>,
) {
  for (const preferredId of preferredIds) {
    if (preferredId && threads.some((thread) => thread.id === preferredId)) {
      return preferredId;
    }
  }

  return threads[0]?.id ?? null;
}
