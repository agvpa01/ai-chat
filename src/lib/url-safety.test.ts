import { describe, expect, test } from "vite-plus/test";
import {
  buildSafeStorefrontProductJsonUrl,
  buildSafeYoutubeEmbedUrl,
  sanitizeAppUrl,
  sanitizeAssetUrl,
  sanitizeVpaUrl,
} from "./url-safety";

describe("url safety", () => {
  test("allows safe absolute and relative urls", () => {
    expect(sanitizeAppUrl("https://www.vpa.com.au/pages/returns")).toBe(
      "https://www.vpa.com.au/pages/returns",
    );
    expect(sanitizeAppUrl("/pages/returns")).toBe("/pages/returns");
    expect(sanitizeAppUrl("#details")).toBe("#details");
  });

  test("rejects unsafe protocols", () => {
    expect(sanitizeAppUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeAppUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  test("restricts VPA-only urls to approved hosts", () => {
    expect(sanitizeVpaUrl("https://www.vpa.com.au/pages/returns")).toBe(
      "https://www.vpa.com.au/pages/returns",
    );
    expect(sanitizeVpaUrl("/pages/returns")).toBe("/pages/returns");
    expect(sanitizeVpaUrl("https://evil.example/pages/returns")).toBeNull();
  });

  test("builds storefront json urls only for approved VPA product hosts", () => {
    expect(
      buildSafeStorefrontProductJsonUrl("https://products.vpa.com.au/products/whey-protein"),
    ).toBe("https://products.vpa.com.au/products/whey-protein.js");
    expect(
      buildSafeStorefrontProductJsonUrl("https://evil.example/products/whey-protein"),
    ).toBeNull();
  });

  test("allows only safe asset urls", () => {
    expect(sanitizeAssetUrl("https://cdn.example.com/image.jpg")).toBe(
      "https://cdn.example.com/image.jpg",
    );
    expect(sanitizeAssetUrl("data:image/png;base64,abc")).toBeNull();
  });

  test("builds youtube embeds only for expected youtube urls", () => {
    expect(buildSafeYoutubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0",
    );
    expect(buildSafeYoutubeEmbedUrl("https://evil.example/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});
