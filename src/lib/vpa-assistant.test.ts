import { describe, expect, test } from "vite-plus/test";
import {
  buildAssistantMessages,
  buildWorkoutCardIds,
  chooseWorkout,
  formatSeconds,
} from "./vpa-assistant";

describe("vpa assistant helpers", () => {
  test("chooses a recovery workout for mobility prompts", () => {
    expect(chooseWorkout("I want a mobility reset").id).toBe("reset-recovery");
  });

  test("chooses a core workout for abs prompts", () => {
    expect(chooseWorkout("could you suggest list of exercises for abs").id).toBe("core-control");
  });

  test("returns product cards for recommendation prompts", () => {
    const reply = buildAssistantMessages("recommend some products", "ignite-hiit");

    expect(reply.messages).toHaveLength(1);
    expect(reply.messages[0]?.kind).toBe("products");
  });

  test("does not treat blog recommendation prompts as product prompts", () => {
    const reply = buildAssistantMessages("give me recommended blogs", "ignite-hiit");

    expect(reply.messages).toHaveLength(1);
    expect(reply.messages[0]?.kind).toBe("text");
    expect(reply.messages[0]?.text.toLowerCase()).toContain("blog");
  });

  test("returns a Shopify auth form response for registration prompts", () => {
    const reply = buildAssistantMessages("I want to create an account", "ignite-hiit");

    expect(reply.messages).toHaveLength(1);
    expect(reply.messages[0]?.kind).toBe("auth");
  });

  test("returns workout card slugs for workout prompts", () => {
    const reply = buildAssistantMessages("show me some strength workouts", "ignite-hiit");
    const message = reply.messages[0];

    expect(reply.messages).toHaveLength(1);
    expect(message?.kind).toBe("text");

    if (!message || message.kind !== "text") {
      throw new Error("Expected a text response");
    }

    expect(message.workoutSlugs).toEqual(buildWorkoutCardIds("strength"));
  });

  test("treats recommended abs workouts as workout guidance, not products", () => {
    const reply = buildAssistantMessages("recommend some abs workouts", "ignite-hiit");
    const message = reply.messages[0];

    expect(reply.messages).toHaveLength(1);
    expect(message?.kind).toBe("text");

    if (!message || message.kind !== "text") {
      throw new Error("Expected a text response");
    }

    expect(message.workoutSlugs?.[0]).toBe("core-control");
  });

  test("formats seconds for chat labels", () => {
    expect(formatSeconds(45)).toBe("45s");
    expect(formatSeconds(120)).toBe("2m");
    expect(formatSeconds(135)).toBe("2m 15s");
  });
});
