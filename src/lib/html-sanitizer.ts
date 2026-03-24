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

const SAFE_HTML_ATTRS = ["href"] as const;
const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

let hasConfiguredDomPurifyHooks = false;

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

function isSafeSanitizedHref(value: string | null) {
  if (!value) {
    return false;
  }

  const normalized = value.trim();

  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("#") || normalized.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(normalized, "https://www.vpa.com.au");
    return SAFE_LINK_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function ensureDomPurifyHooksConfigured() {
  if (hasConfiguredDomPurifyHooks) {
    return;
  }

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeName !== "A") {
      return;
    }

    const href = node.getAttribute("href");

    if (!isSafeSanitizedHref(href)) {
      node.removeAttribute("href");
      return;
    }

    node.removeAttribute("target");
    node.setAttribute("rel", "nofollow noreferrer noopener");
  });

  hasConfiguredDomPurifyHooks = true;
}

export function sanitizeRichHtml(html: string) {
  ensureDomPurifyHooksConfigured();

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
