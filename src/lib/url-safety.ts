const SAFE_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const SAFE_ASSET_PROTOCOLS = new Set(["http:", "https:"]);
const SAFE_YOUTUBE_HOSTS = new Set([
  "youtu.be",
  "www.youtu.be",
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);
const SAFE_VPA_HOSTS = new Set([
  "vpa.com.au",
  "www.vpa.com.au",
  "checkout.vpa.com.au",
  "products.vpa.com.au",
]);

function parseSafeUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}

export function sanitizeAppUrl(value: string | null | undefined) {
  const normalized = parseSafeUrl(value);

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("#") || normalized.startsWith("/")) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized, "https://www.vpa.com.au");
    return SAFE_URL_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function sanitizeAssetUrl(value: string | null | undefined) {
  const normalized = parseSafeUrl(value);

  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized, "https://www.vpa.com.au");
    return SAFE_ASSET_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function sanitizeVpaUrl(value: string | null | undefined) {
  const normalized = parseSafeUrl(value);

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized, "https://www.vpa.com.au");

    if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }

    if (parsed.protocol === "mailto:" || parsed.protocol === "tel:") {
      return parsed.toString();
    }

    return SAFE_VPA_HOSTS.has(parsed.hostname.toLowerCase()) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function buildSafeStorefrontProductJsonUrl(productUrl: string | null | undefined) {
  const safeProductUrl = sanitizeVpaUrl(productUrl);

  if (!safeProductUrl) {
    return null;
  }

  try {
    const url = new URL(safeProductUrl, "https://www.vpa.com.au");
    const pathname = url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
    return `${url.origin}${pathname}.js`;
  } catch {
    return null;
  }
}

export function buildSafeYoutubeEmbedUrl(youtubeUrl: string | null | undefined) {
  if (!youtubeUrl) {
    return null;
  }

  try {
    const parsed = new URL(youtubeUrl);

    if (!SAFE_YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) {
      return null;
    }

    const videoId = parsed.hostname.toLowerCase().includes("youtu.be")
      ? parsed.pathname.replace("/", "")
      : (parsed.searchParams.get("v") ?? "");

    if (!/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) {
      return null;
    }

    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  } catch {
    return null;
  }
}
