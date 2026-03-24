import DOMPurify from "isomorphic-dompurify";

const SAFE_HTML_TAGS = [
  "a",
  "blockquote",
  "br",
  "em",
  "h2",
  "h3",
  "h4",
  "li",
  "ol",
  "p",
  "section",
  "strong",
  "ul",
] as const;

const SAFE_HTML_ATTRS = ["href", "rel", "target"] as const;

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function sanitizeRichHtml(html: string) {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [...SAFE_HTML_TAGS],
    ALLOWED_ATTR: [...SAFE_HTML_ATTRS],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [
      "button",
      "form",
      "iframe",
      "img",
      "input",
      "script",
      "select",
      "style",
      "svg",
      "textarea",
    ],
  });
}

export function normalizeRenderedRichText(value: string) {
  return decodeHtmlEntities(sanitizeRichHtml(value))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
