import { describe, expect, test } from "vite-plus/test";
import {
  buildArticleSearchTerms,
  buildCollectionSearchTerms,
  isArticleRecommendationRequest,
} from "./chat";

describe("chat intent helpers", () => {
  test("treats blog requests as article intent", () => {
    expect(isArticleRecommendationRequest("give me recommended blogs")).toBe(true);
  });

  test("does not fall back to best sellers for blog recommendation requests", () => {
    expect(buildCollectionSearchTerms("give me recommended blogs")).toEqual([]);
  });

  test("builds article-oriented search terms for generic blog requests", () => {
    expect(buildArticleSearchTerms("give me recommended blogs")).toContain("blog");
  });
});
