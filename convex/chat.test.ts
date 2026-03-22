import { describe, expect, test } from "vite-plus/test";
import {
  buildArticleSearchTerms,
  buildCollectionSearchTerms,
  buildPageSearchTerms,
  extractEventRecapUrlsFromEventsHub,
  extractEmailAddress,
  extractOrderNumber,
  isArticleRecommendationRequest,
  isFormLikePage,
  isOrderHistoryRequest,
  isPageRecommendationRequest,
  isOrderTrackingRequest,
  isStaleEventPage,
  scorePageIntentMatch,
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

  test("treats faq requests as page intent", () => {
    expect(isPageRecommendationRequest("show me your faqs")).toBe(true);
  });

  test("builds page-oriented search terms for homepage requests", () => {
    expect(buildPageSearchTerms("show me your homepage")).toContain("home");
  });

  test("prefers the real FAQ page over faq-adjacent pages", () => {
    expect(
      scorePageIntentMatch(
        "could you give me the vpa faqs",
        "Frequently Asked Questions https://www.vpa.com.au/pages/frequently-asked-questions FAQs",
      ),
    ).toBeGreaterThan(
      scorePageIntentMatch(
        "could you give me the vpa faqs",
        "FAQ - VPA Stockists https://www.vpa.com.au/pages/faq-vpa-stockists FAQs",
      ),
    );
  });

  test("prefers the main events hub for generic event requests", () => {
    expect(
      scorePageIntentMatch(
        "show me your events",
        "VPA Events https://www.vpa.com.au/pages/vpa-events Events upcoming events past events",
      ),
    ).toBeGreaterThan(
      scorePageIntentMatch(
        "show me your events",
        "Women's Health and Fitness Fest https://www.vpa.com.au/pages/womens-health-and-fitness-event Events",
      ),
    );
  });

  test("prefers the signup form page for signup-form requests", () => {
    expect(
      scorePageIntentMatch(
        "show me the event signup form",
        "VPA Signup Form - Events https://www.vpa.com.au/pages/vpa-signup-form-events Events",
      ),
    ).toBeGreaterThan(
      scorePageIntentMatch(
        "show me the event signup form",
        "VPA Events https://www.vpa.com.au/pages/vpa-events Events upcoming events past events",
      ),
    );
  });

  test("filters out stale year-stamped event pages", () => {
    expect(
      isStaleEventPage(
        {
          pageType: "Events",
          title: "VPA New Year, New You Workshop 2022",
          summary: "This is the best event to kick off 2022.",
          url: "https://www.vpa.com.au/pages/vpa-new-year-new-you-workshop-2022",
          updatedAt: "2022-01-15T00:00:00+10:00",
        },
        2026,
      ),
    ).toBe(true);
  });

  test("keeps recent event pages available", () => {
    expect(
      isStaleEventPage(
        {
          pageType: "Events",
          title: "VPA Events",
          summary: "Find out more about our upcoming events and how you can get involved.",
          url: "https://www.vpa.com.au/pages/vpa-events",
          updatedAt: "2026-02-23T11:38:33+10:00",
        },
        2026,
      ),
    ).toBe(false);
  });

  test("extracts unique recap urls from the events hub", () => {
    expect(
      extractEventRecapUrlsFromEventsHub(`
        <h2>PAST EVENTS</h2>
        <a href="https://www.vpa.com.au/pages/vday-5km-fun-run">One</a>
        <a href="https://www.vpa.com.au/pages/vpa-events">Hub</a>
        <a href="https://www.vpa.com.au/pages/vday-5km-fun-run">Duplicate</a>
        <a href="https://www.vpa.com.au/pages/vpa-christmas-party-2025">Two</a>
      `),
    ).toEqual([
      "https://www.vpa.com.au/pages/vday-5km-fun-run",
      "https://www.vpa.com.au/pages/vpa-christmas-party-2025",
    ]);
  });

  test("detects form-like event signup pages", () => {
    expect(
      isFormLikePage({
        title: "VPA Signup Form - Events",
        summary: "Receive exclusive offers, news and event updates from VPA.",
        url: "https://www.vpa.com.au/pages/vpa-signup-form-events",
        contentHtml: "<form><input /><button>Submit</button></form>",
      }),
    ).toBe(true);
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
