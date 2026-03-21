import { describe, expect, test } from "vite-plus/test";
import {
  buildArticleSearchTerms,
  buildCollectionSearchTerms,
  extractEmailAddress,
  extractOrderNumber,
  isArticleRecommendationRequest,
  isOrderHistoryRequest,
  isOrderTrackingRequest,
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

  test("detects order tracking requests", () => {
    expect(isOrderTrackingRequest("could you track my order #747066")).toBe(true);
  });

  test("detects order history requests by email", () => {
    expect(
      isOrderHistoryRequest("could you give me orders of this email: it@vpaaustralia.com"),
    ).toBe(true);
  });

  test("detects conversational order history requests with a line break", () => {
    expect(
      isOrderHistoryRequest(
        "how about this email could you take a look on the orders of this email:\ndaniel.neish@gmail.com",
      ),
    ).toBe(true);
  });

  test("extracts an order number from order tracking prompts", () => {
    expect(
      extractOrderNumber(
        "could you track this order number #599005 the email is this it@vpaaustralia.com",
      ),
    ).toBe("599005");
  });

  test("extracts an email address from order tracking prompts", () => {
    expect(
      extractEmailAddress(
        "could you track this order number #599005 the email is this it@vpaaustralia.com",
      ),
    ).toBe("it@vpaaustralia.com");
  });
});
