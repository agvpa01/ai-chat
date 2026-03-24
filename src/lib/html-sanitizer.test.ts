import { describe, expect, test } from "vite-plus/test";
import { normalizeRenderedRichText, sanitizeRichHtml } from "./html-sanitizer";

describe("html sanitizer", () => {
  test("removes unsafe tags and event handlers from rich html", () => {
    const sanitized = sanitizeRichHtml(
      `
        <p onclick="alert(1)">Safe <strong>copy</strong>.</p>
        <script>alert(1)</script>
        <form><input name="password" /></form>
        <iframe src="https://evil.example"></iframe>
      `,
    );

    expect(sanitized).toContain("<p>Safe <strong>copy</strong>.</p>");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("<form");
    expect(sanitized).not.toContain("<iframe");
  });

  test("converts sanitized rich html into plain text for comparisons", () => {
    expect(normalizeRenderedRichText("<p>Hello&nbsp;<strong>world</strong>.</p>")).toBe(
      "Hello world.",
    );
  });
});
