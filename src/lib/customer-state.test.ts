import { describe, expect, test } from "vite-plus/test";
import {
  mergeSavedThreads,
  mergeWorkoutActivityEntries,
  pickPreferredThreadId,
  sanitizeSavedThreads,
  sanitizeWorkoutActivityEntries,
  type SavedChatThread,
  type WorkoutActivityEntry,
} from "./customer-state";

const sampleThread = (overrides: Partial<SavedChatThread> = {}): SavedChatThread => ({
  id: "thread-1",
  title: "Thread",
  messages: [],
  activeWorkoutId: "ignite-hiit",
  updatedAt: 100,
  ...overrides,
});

const sampleActivity = (overrides: Partial<WorkoutActivityEntry> = {}): WorkoutActivityEntry => ({
  id: "ignite-hiit-started-100",
  workoutSlug: "ignite-hiit",
  workoutName: "Ignite HIIT",
  type: "started",
  completedExercises: 0,
  totalExercises: 4,
  timestamp: 100,
  ...overrides,
});

describe("customer state helpers", () => {
  test("sanitizes invalid saved threads", () => {
    expect(sanitizeSavedThreads([sampleThread(), { id: 123 }])).toEqual([sampleThread()]);
  });

  test("sanitizes invalid workout activity entries", () => {
    expect(sanitizeWorkoutActivityEntries([sampleActivity(), { id: 123 }])).toEqual([
      sampleActivity(),
    ]);
  });

  test("merges saved threads by newest updated time", () => {
    const merged = mergeSavedThreads(
      [sampleThread({ id: "thread-1", title: "Older", updatedAt: 100 })],
      [sampleThread({ id: "thread-1", title: "Newer", updatedAt: 200 })],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe("Newer");
  });

  test("merges workout activity by newest timestamp", () => {
    const merged = mergeWorkoutActivityEntries(
      [sampleActivity({ id: "entry-1", workoutName: "Older", timestamp: 100 })],
      [sampleActivity({ id: "entry-1", workoutName: "Newer", timestamp: 200 })],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.workoutName).toBe("Newer");
  });

  test("picks the first preferred thread id that exists", () => {
    const threads = [sampleThread({ id: "local-thread" }), sampleThread({ id: "remote-thread" })];

    expect(pickPreferredThreadId(threads, ["missing", "remote-thread", "local-thread"])).toBe(
      "remote-thread",
    );
  });
});
