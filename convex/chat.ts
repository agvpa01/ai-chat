"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

type AdminProductCard = {
  title: string;
  handle: string;
  description: string;
  onlineStoreUrl: string | null;
  legacyResourceId: string;
  featuredImage: {
    url: string;
    altText: string | null;
  } | null;
  priceRangeV2: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  options: Array<{
    name: string;
    optionValues: Array<{
      name: string;
    }>;
  }>;
  variants: {
    nodes: Array<{
      legacyResourceId: string;
      title: string;
      price: string;
      selectedOptions: Array<{
        name: string;
        value: string;
      }>;
    }>;
  };
};

type AdminArticleCard = {
  title: string;
  handle: string;
  excerpt: string | null;
  contentHtml: string;
  publishedAt: string | null;
  image: {
    url: string;
    altText: string | null;
  } | null;
  blog: {
    handle: string;
    title: string;
  } | null;
  onlineStoreUrl: string | null;
};

type AdminPageCard = {
  title: string;
  handle: string;
  body: string;
  bodySummary: string;
  updatedAt: string | null;
};

type AdminCollectionCard = {
  title: string;
  handle: string;
  products: {
    nodes: AdminProductCard[];
  };
};

type BundleTier = {
  label: string;
  totalPrice: string;
  saveAmount: string | null;
};

type RecommendedProduct = {
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  imageAlt: string | null;
  price: string;
  reviewCount: number | null;
  bundlePricing: BundleTier[];
  variants: Array<{
    name: string;
    values: string[];
  }>;
  variantChoices: Array<{
    id: string;
    title: string;
    price: string;
    selectedOptions: Array<{
      name: string;
      value: string;
    }>;
  }>;
};

type RecommendedArticle = {
  title: string;
  summary: string;
  contentHtml: string;
  url: string;
  imageUrl: string | null;
  imageAlt: string | null;
  publishedAt: string | null;
  readTimeMinutes: number | null;
  blogTitle: string | null;
};

type RecommendedPage = {
  title: string;
  summary: string;
  contentHtml: string;
  url: string;
  imageUrl: string | null;
  imageAlt: string | null;
  updatedAt: string | null;
  pageType: string | null;
  linkedPages?: RecommendedPage[];
};

type OrderTrackingPreview = {
  orderNumber: string;
  status: string;
  eta: string;
  lastEvent: string;
  financialStatus: string | null;
  trackingNumber: string | null;
  trackingCompany: string | null;
  trackingUrl: string | null;
  customerEmail: string | null;
};

type AdminOrderCard = {
  name: string;
  email: string | null;
  processedAt: string | null;
  displayFulfillmentStatus: string | null;
  displayFinancialStatus: string | null;
  statusPageUrl: string | null;
  customer: {
    email: string | null;
  } | null;
  fulfillments: Array<{
    status: string | null;
    createdAt: string | null;
    trackingInfo: Array<{
      company: string | null;
      number: string | null;
      url: string | null;
    }>;
  }>;
};

type AdminCustomerOrderLookup = {
  id: string;
  email: string | null;
  orders: {
    nodes: AdminOrderCard[];
  };
};

type ProductRecommendationResult = {
  products: RecommendedProduct[];
  collectionTitle: string | null;
};

type PublicSitemapArticle = {
  title: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string | null;
  blogTitle: string | null;
};

type PublicSitemapPage = {
  title: string;
  url: string;
  updatedAt: string | null;
  pageType: string | null;
};

type ConnectedCustomer = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
};

const WORKOUT_SEARCH_TERMS: Record<string, string[]> = {
  "ignite-hiit": ["pre workout", "hydration", "protein"],
  "core-control": ["hydration", "protein"],
  "strength-builder": ["protein", "creatine"],
  "reset-recovery": ["protein", "hydration"],
};

const PRODUCT_ALIASES: Record<string, string[]> = {
  "whey protein isolate": ["whey protein isolate", "whey isolate", "wpi"],
  "premium whey (wpc)": ["premium whey", "wpc", "whey concentrate"],
  "creatine monohydrate powder": ["creatine monohydrate", "creatine"],
  "gold coast stim pre-workout": ["gold coast stim pre-workout", "pre workout", "pre-workout"],
  "protein water": ["protein water"],
  "complete tri-protein": ["complete tri-protein", "tri protein"],
};

const COLLECTION_HINTS = [
  { title: "Best selling products", triggers: ["best seller", "best sellers", "best selling"] },
  { title: "Supplements", triggers: ["supplement", "supplements"] },
  { title: "Running Essentials", triggers: ["running", "runner", "run"] },
  { title: "New Arrival", triggers: ["new arrival", "new arrivals"] },
  { title: "New", triggers: ["new products", "new product", "latest"] },
  { title: "Gifts Under $100", triggers: ["gift under 100", "gifts under 100"] },
  { title: "Gifts Under $50", triggers: ["gift under 50", "gifts under 50"] },
] as const;

function normalizeProduct(product: AdminProductCard): RecommendedProduct | null {
  const loweredTitle = product.title.toLowerCase();
  const loweredHandle = product.handle.toLowerCase();

  if (
    loweredTitle.startsWith("zz") ||
    loweredHandle.startsWith("zz") ||
    loweredTitle.includes("internal use only")
  ) {
    return null;
  }

  const currencyCode = product.priceRangeV2.minVariantPrice.currencyCode;

  return {
    title: product.title,
    description: product.description,
    url: product.onlineStoreUrl ?? `https://www.vpa.com.au/products/${product.handle}`,
    imageUrl: product.featuredImage?.url ?? null,
    imageAlt: product.featuredImage?.altText ?? product.title,
    price: `${currencyCode} ${product.priceRangeV2.minVariantPrice.amount}`,
    reviewCount: null,
    bundlePricing: [],
    variants: product.options
      .map((option) => ({
        name: option.name,
        values: option.optionValues.map((value) => value.name).filter(Boolean),
      }))
      .filter((option) => option.values.length > 0),
    variantChoices: product.variants.nodes.map((variant) => ({
      id: variant.legacyResourceId,
      title: variant.title,
      price: `${currencyCode} ${variant.price}`,
      selectedOptions: variant.selectedOptions,
    })),
  };
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function humanizeSlug(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function humanizeBlogSlug(slug: string) {
  return humanizeSlug(slug).replace(/\bAnd\b/g, "and");
}

function normalizeArticle(article: AdminArticleCard): RecommendedArticle | null {
  const plainText = stripHtml(article.contentHtml);
  const summary = (article.excerpt?.trim() || plainText).slice(0, 280).trim();

  if (!article.title.trim() || !plainText) {
    return null;
  }

  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  return {
    title: article.title,
    summary,
    contentHtml: article.contentHtml,
    url:
      article.onlineStoreUrl ??
      `https://www.vpa.com.au/blogs/${article.blog?.handle ?? "news"}/${article.handle}`,
    imageUrl: article.image?.url ?? null,
    imageAlt: article.image?.altText ?? article.title,
    publishedAt: article.publishedAt,
    readTimeMinutes: wordCount ? Math.max(1, Math.round(wordCount / 220)) : null,
    blogTitle: article.blog?.title ?? null,
  };
}

function inferPageType(title: string, handle: string) {
  const haystack = `${title} ${handle}`.toLowerCase();

  if (haystack.includes("faq") || haystack.includes("frequently asked questions")) {
    return "FAQs";
  }

  if (haystack.includes("event")) {
    return "Events";
  }

  if (haystack.includes("about")) {
    return "About";
  }

  if (
    haystack.includes("shipping") ||
    haystack.includes("returns") ||
    haystack.includes("refund") ||
    haystack.includes("support") ||
    haystack.includes("contact") ||
    haystack.includes("policy") ||
    haystack.includes("privacy") ||
    haystack.includes("terms")
  ) {
    return "Support";
  }

  if (haystack.includes("home")) {
    return "Storefront";
  }

  return "Page";
}

export function scorePageIntentMatch(message: string, value: string) {
  const loweredMessage = message.toLowerCase();
  const loweredValue = value.toLowerCase();
  let score = 0;

  if (
    loweredMessage.includes("signup") ||
    loweredMessage.includes("sign up") ||
    loweredMessage.includes("form")
  ) {
    if (
      loweredValue.includes("signup form") ||
      loweredValue.includes("sign up form") ||
      loweredValue.includes("/pages/vpa-signup-form")
    ) {
      score += 320;
    }
  }

  if (loweredMessage.includes("faq")) {
    if (
      loweredValue.includes("frequently-asked-questions") ||
      loweredValue.includes("frequently asked questions")
    ) {
      score += 120;
    }

    if (loweredValue.includes("faq")) {
      score += 40;
    }
  }

  if (loweredMessage.includes("about")) {
    if (loweredValue.includes("about-us") || loweredValue.includes("about us")) {
      score += 120;
    }
  }

  if (loweredMessage.includes("contact")) {
    if (loweredValue.includes("contact-us") || loweredValue.includes("contact us")) {
      score += 120;
    }
  }

  if (loweredMessage.includes("shipping") || loweredMessage.includes("delivery")) {
    if (
      loweredValue.includes("/pages/delivery") ||
      loweredValue.includes("delivery") ||
      loweredValue.includes("shipping")
    ) {
      score += 120;
    }
  }

  if (loweredMessage.includes("return") || loweredMessage.includes("refund")) {
    if (
      loweredValue.includes("returns-and-refunds") ||
      loweredValue.includes("returns") ||
      loweredValue.includes("refund")
    ) {
      score += 120;
    }
  }

  if (loweredMessage.includes("support")) {
    if (loweredValue.includes("support")) {
      score += 120;
    }
  }

  if (loweredMessage.includes("event")) {
    if (loweredValue.includes("/pages/vpa-events") || loweredValue.includes("vpa events")) {
      score += 200;
    }

    if (loweredValue.includes("event")) {
      score += 120;
    }

    if (
      loweredValue.includes("upcoming events") ||
      loweredValue.includes("past events") ||
      loweredValue.includes("community events")
    ) {
      score += 80;
    }
  }

  return score;
}

function inferExplicitYears(...values: Array<string | null | undefined>) {
  const years = values.flatMap((value) =>
    Array.from(value?.matchAll(/\b20\d{2}\b/g) ?? []).flatMap((match) => {
      const parsed = Number.parseInt(match[0], 10);
      return Number.isFinite(parsed) ? [parsed] : [];
    }),
  );

  return Array.from(new Set(years));
}

export function isStaleEventPage(
  page: {
    pageType: string | null;
    title: string;
    summary: string;
    url: string;
    updatedAt: string | null;
    contentHtml?: string;
  },
  currentYear = new Date().getFullYear(),
) {
  if (page.pageType !== "Events") {
    return false;
  }

  const explicitYears = inferExplicitYears(page.title, page.summary, page.url, page.contentHtml);

  if (!explicitYears.length) {
    return false;
  }

  return Math.max(...explicitYears) < currentYear - 2;
}

export function isFormLikePage(page: {
  title: string;
  summary: string;
  url: string;
  contentHtml?: string;
}) {
  const haystack =
    `${page.title} ${page.summary} ${page.url} ${page.contentHtml ?? ""}`.toLowerCase();

  return (
    haystack.includes("signup form") ||
    haystack.includes("sign up form") ||
    haystack.includes("/pages/vpa-signup-form") ||
    (haystack.includes("<form") &&
      haystack.includes("submit") &&
      (haystack.includes("email") || haystack.includes("first name")))
  );
}

function isEventsHubPage(page: { title: string; url: string; pageType: string | null }) {
  return (
    page.pageType === "Events" &&
    (page.url.includes("/pages/vpa-events") || page.title.toLowerCase().includes("vpa events"))
  );
}

function normalizePage(page: AdminPageCard): RecommendedPage | null {
  const extractedContentHtml = extractStorefrontPageContentHtml(page.body);
  const normalizedContentHtml = extractedContentHtml || page.body;
  const plainText = stripHtml(normalizedContentHtml);
  const summary = (page.bodySummary?.trim() || plainText).slice(0, 280).trim();
  const pageImage = extractPageImage(page.body);

  if (!page.title.trim() || !plainText) {
    return null;
  }

  return {
    title: page.title,
    summary,
    contentHtml: normalizedContentHtml,
    url: `https://www.vpa.com.au/pages/${page.handle}`,
    imageUrl: pageImage.imageUrl,
    imageAlt: pageImage.imageAlt ?? page.title,
    updatedAt: page.updatedAt,
    pageType: inferPageType(page.title, page.handle),
  };
}

function convertPlainTextToHtml(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [normalized];
  const chunks: string[] = [];

  for (let index = 0; index < sentences.length; index += 2) {
    const chunk = `${sentences[index] ?? ""} ${sentences[index + 1] ?? ""}`.trim();
    if (chunk) {
      chunks.push(`<p>${escapeHtml(chunk)}</p>`);
    }
  }

  return chunks.join("");
}

function extractStorefrontPageContentHtml(html: string) {
  const shogunStructuredContent = extractStructuredShogunContentHtml(html);

  if (shogunStructuredContent) {
    return shogunStructuredContent;
  }

  const accordionSection = html.split(/<div class="shogun-accordion-wrapper"[^>]*>/i)[1];

  if (accordionSection) {
    const accordionChunks = accordionSection.split(/<div class="shogun-accordion">/i).slice(1, 5);
    const sections = accordionChunks.flatMap((chunk) => {
      const title = stripHtml(
        chunk.match(/<h4[^>]*class="shogun-accordion-title"[^>]*>([\s\S]*?)<\/h4>/i)?.[1] ?? "",
      );
      const bodyParagraphs = Array.from(
        chunk.matchAll(/<div[^>]*class="panel-body"[^>]*>([\s\S]*?)<\/div>/gi),
      )
        .map((match) => stripHtml(match[1] ?? ""))
        .filter(Boolean)
        .slice(0, 3);

      if (!title || !bodyParagraphs.length) {
        return [];
      }

      return [
        `<section><h3>${escapeHtml(title)}</h3>${bodyParagraphs
          .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
          .join("")}</section>`,
      ];
    });

    if (sections.length) {
      return sections.join("");
    }
  }

  const richTextContent = html.match(
    /<div[^>]*class=["'][^"']*(?:shg-rich-text|rte|shopify-policy__body)[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
  )?.[1];

  if (richTextContent) {
    return sanitizeHtmlFragment(richTextContent);
  }

  return "";
}

function extractStructuredShogunContentHtml(html: string) {
  const shogunRootIndex = html.search(/<div[^>]+class=["'][^"']*shogun-root[^"']*["']/i);

  if (shogunRootIndex === -1) {
    return "";
  }

  const shogunHtml = html.slice(shogunRootIndex);
  const matches = Array.from(shogunHtml.matchAll(/<(h[1-4]|p)\b[^>]*>([\s\S]*?)<\/\1>/gi));
  const blocks: string[] = [];
  const seenTexts = new Set<string>();
  let accumulatedLength = 0;

  for (const match of matches) {
    const tag = match[1]?.toLowerCase() ?? "p";
    const text = stripHtml(match[2] ?? "")
      .replace(/\s+/g, " ")
      .trim();

    if (!text || text.length < 3) {
      continue;
    }

    const normalizedText = text.toLowerCase();

    if (seenTexts.has(normalizedText)) {
      continue;
    }

    seenTexts.add(normalizedText);

    const isHeading = tag.startsWith("h");
    const renderedTag = isHeading ? (tag === "h1" ? "h2" : "h3") : "p";
    blocks.push(`<${renderedTag}>${escapeHtml(text)}</${renderedTag}>`);
    accumulatedLength += text.length;

    if (blocks.length >= 8 || accumulatedLength >= 1600) {
      break;
    }
  }

  return blocks.join("");
}

export function extractEventRecapUrlsFromEventsHub(html: string) {
  const pastEventsIndex = html.indexOf("PAST EVENTS");

  if (pastEventsIndex === -1) {
    return [];
  }

  const section = html.slice(pastEventsIndex, pastEventsIndex + 180000);
  const urls = Array.from(
    section.matchAll(/href=["'](https:\/\/www\.vpa\.com\.au\/pages\/[^"']+)["']/g),
  )
    .map((match) => match[1]?.trim() ?? "")
    .filter((url) => url && !url.includes("/pages/vpa-events"));

  return Array.from(new Set(urls)).slice(0, 8);
}

function sanitizeHtmlFragment(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "");
}

function isRenderablePageImageUrl(url: string | null | undefined) {
  if (!url) {
    return false;
  }

  const normalized = normalizeImageUrl(url);

  if (!normalized) {
    return false;
  }

  const lowered = normalized.toLowerCase();

  if (
    lowered.endsWith(".js") ||
    lowered.endsWith(".css") ||
    lowered.includes("global-assets") ||
    lowered.includes("vpa-white-transparent") ||
    lowered.includes("vpa-logo-square")
  ) {
    return false;
  }

  return /\.(avif|gif|jpe?g|png|svg|webp)(\?|$)/i.test(lowered) || lowered.includes("/-/format/");
}

function extractPageImage(html: string) {
  const shogunImageMatch = html.match(
    /<div[^>]*class="[^"]*shogun-image-container[^"]*"[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']/i,
  );
  const shogunImageUrl = normalizeImageUrl(shogunImageMatch?.[1] ?? null);

  if (isRenderablePageImageUrl(shogunImageUrl)) {
    return {
      imageUrl: shogunImageUrl,
      imageAlt: shogunImageMatch?.[2]?.trim() || null,
    };
  }

  const metaImageUrl =
    normalizeImageUrl(extractMetaContent(html, "og:image")) ||
    normalizeImageUrl(extractMetaContent(html, "twitter:image"));

  if (isRenderablePageImageUrl(metaImageUrl)) {
    return {
      imageUrl: metaImageUrl,
      imageAlt:
        extractMetaContent(html, "og:image:alt") || extractMetaContent(html, "twitter:image:alt"),
    };
  }

  const firstContentImageMatch = html.match(
    /<img[^>]+src=["']([^"']+)["'][^>]*?(?:alt=["']([^"']*)["'])?[^>]*>/i,
  );
  const firstContentImageUrl = normalizeImageUrl(firstContentImageMatch?.[1] ?? null);

  if (isRenderablePageImageUrl(firstContentImageUrl)) {
    return {
      imageUrl: firstContentImageUrl,
      imageAlt: firstContentImageMatch?.[2]?.trim() || null,
    };
  }

  return {
    imageUrl: null,
    imageAlt: null,
  };
}

function parseSitemapArticles(xml: string) {
  const matches = Array.from(xml.matchAll(/<url>([\s\S]*?)<\/url>/g));

  return matches.flatMap((match) => {
    const block = match[1];
    const url = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim() ?? "";

    if (!url.includes("/blogs/")) {
      return [];
    }

    const segments = url.replace("https://www.vpa.com.au/", "").split("/").filter(Boolean);

    if (segments.length < 3 || segments[0] !== "blogs") {
      return [];
    }

    const blogSlug = segments[1];
    const articleSlug = segments[2];
    const imageUrl = block.match(/<image:loc>([^<]+)<\/image:loc>/)?.[1]?.trim() ?? null;
    const imageTitle = block.match(/<image:title>([\s\S]*?)<\/image:title>/)?.[1]?.trim();
    const publishedAt = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? null;

    return [
      {
        title: decodeHtmlEntities(imageTitle || humanizeSlug(articleSlug)),
        url,
        imageUrl,
        publishedAt,
        blogTitle: humanizeBlogSlug(blogSlug),
      } satisfies PublicSitemapArticle,
    ];
  });
}

function parsePageSitemapIndex(xml: string) {
  return Array.from(xml.matchAll(/<loc>([^<]+sitemap_pages_[^<]+)<\/loc>/g))
    .map((match) => decodeHtmlEntities(match[1]?.trim() ?? ""))
    .filter(Boolean);
}

function parseSitemapPages(xml: string) {
  const matches = Array.from(xml.matchAll(/<url>([\s\S]*?)<\/url>/g));

  return matches.flatMap((match) => {
    const block = match[1];
    const url = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim() ?? "";

    if (!url.includes("/pages/")) {
      return [];
    }

    const handle = url.split("/pages/")[1]?.split(/[?#]/)[0]?.trim() ?? "";

    if (!handle) {
      return [];
    }

    const updatedAt = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? null;
    const title = decodeHtmlEntities(humanizeSlug(handle));

    return [
      {
        title,
        url,
        updatedAt,
        pageType: inferPageType(title, handle),
      } satisfies PublicSitemapPage,
    ];
  });
}

function normalizeImageUrl(
  image:
    | string
    | { url?: string | null }
    | Array<string | { url?: string | null }>
    | null
    | undefined,
): string | null {
  let raw: string | null = null;

  if (typeof image === "string") {
    raw = image;
  } else if (Array.isArray(image)) {
    const firstImage = image[0];
    raw = typeof firstImage === "string" ? firstImage : (firstImage?.url ?? null);
  } else {
    raw = image?.url ?? null;
  }

  if (!raw) {
    return null;
  }

  return raw.startsWith("//") ? `https:${raw}` : raw;
}

function extractMetaContent(html: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  return regex.exec(html)?.[1]?.trim() ?? null;
}

function parseJsonLdArticle(html: string) {
  const scripts = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  );

  for (const script of scripts) {
    const raw = script[1]?.trim();
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw.replace(/\u2028|\u2029/g, " "));
      const candidates = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.["@graph"])
          ? parsed["@graph"]
          : [parsed];

      for (const candidate of candidates) {
        const type = candidate?.["@type"];
        const types = Array.isArray(type) ? type : [type];

        if (!types.some((entry) => ["Article", "BlogPosting", "NewsArticle"].includes(entry))) {
          continue;
        }

        return candidate as {
          headline?: string;
          description?: string;
          image?: string | { url?: string | null } | Array<string | { url?: string | null }>;
          datePublished?: string;
          articleBody?: string;
        };
      }
    } catch {}
  }

  return null;
}

async function getRecommendedArticlesFromPublicSite(message: string) {
  const sitemapResponse = await fetch("https://www.vpa.com.au/sitemap_blogs_1.xml", {
    signal: AbortSignal.timeout(10000),
  });

  if (!sitemapResponse.ok) {
    return [];
  }

  const sitemapXml = await sitemapResponse.text();
  const searchTerms = buildArticleSearchTerms(message);
  const sitemapArticles = parseSitemapArticles(sitemapXml);

  const ranked = sitemapArticles
    .map((article) => ({
      article,
      score:
        scoreTextMatch(message, `${article.title} ${article.url} ${article.blogTitle ?? ""}`) +
        searchTerms.reduce(
          (sum, term) =>
            sum +
            scoreTextMatch(term, `${article.title} ${article.url} ${article.blogTitle ?? ""}`),
          0,
        ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!ranked.length) {
    if (!isArticleRecommendationRequest(message)) {
      return [];
    }

    ranked.push(
      ...sitemapArticles
        .slice()
        .sort((a, b) => {
          const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 3)
        .map((article) => ({ article, score: 1 })),
    );
  }

  const hydrated = await Promise.all(
    ranked.map(async ({ article }) => {
      try {
        const response = await fetch(article.url, {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          return null;
        }

        const html = await response.text();
        const jsonLd = parseJsonLdArticle(html);
        const headline =
          jsonLd?.headline?.trim() || extractMetaContent(html, "og:title") || article.title;
        const summary =
          jsonLd?.description?.trim() ||
          extractMetaContent(html, "og:description") ||
          article.title;
        const articleBody = jsonLd?.articleBody?.trim() || summary;
        const imageUrl =
          normalizeImageUrl(jsonLd?.image) ||
          extractMetaContent(html, "og:image") ||
          article.imageUrl;

        if (!headline || !articleBody) {
          return null;
        }

        const wordCount = articleBody.split(/\s+/).filter(Boolean).length;

        return {
          title: headline,
          summary: summary.slice(0, 280).trim(),
          contentHtml: convertPlainTextToHtml(articleBody),
          url: article.url,
          imageUrl,
          imageAlt: headline,
          publishedAt: jsonLd?.datePublished || article.publishedAt,
          readTimeMinutes: wordCount ? Math.max(1, Math.round(wordCount / 220)) : null,
          blogTitle: article.blogTitle,
        } satisfies RecommendedArticle;
      } catch {
        return null;
      }
    }),
  );

  return hydrated.flatMap((article) => (article ? [article] : []));
}

async function getBundlePricing(productId: string, basePrice: string, currencyCode: string) {
  const response = await fetch(
    `https://bundles.vpa.com.au/api/bundles/product/${productId}?api_token=rhmjKLGodhlpTolmNBVTH45GHJKLyujhGFRhgstJK`,
    {
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    product?: {
      size?: string;
      bundles?: Array<{
        quantity: number;
        discount: number;
        type: "fixed_amount" | "percentage";
      }>;
    };
  };

  const size = payload.product?.size?.trim();
  const bundles = payload.product?.bundles ?? [];
  const parsedBasePrice = Number.parseFloat(basePrice);

  if (!Number.isFinite(parsedBasePrice) || bundles.length === 0) {
    return [];
  }

  return bundles.slice(0, 5).map((bundle) => {
    let totalPrice = parsedBasePrice * bundle.quantity;

    if (bundle.type === "fixed_amount") {
      totalPrice = parsedBasePrice * bundle.quantity - bundle.quantity * (bundle.discount / 100);
    } else if (bundle.type === "percentage") {
      totalPrice =
        parsedBasePrice * bundle.quantity -
        bundle.quantity * (parsedBasePrice * (bundle.discount / 100));
    }

    const fullPrice = parsedBasePrice * bundle.quantity;
    const saveAmount = fullPrice - totalPrice;

    return {
      label: `${bundle.quantity}x${size || ""}`.trim(),
      totalPrice: `${currencyCode} ${totalPrice.toFixed(2)}`,
      saveAmount: saveAmount > 0 ? `${currencyCode} ${saveAmount.toFixed(2)}` : null,
    };
  });
}

async function getReviewCount(productHandle: string) {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!storeDomain || !adminToken) {
    return null;
  }

  const response = await fetch(`https://${storeDomain}/admin/api/2025-10/graphql.json`, {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify({
      query: `
        query ProductReviewCount($handle: String!) {
          productByHandle(handle: $handle) {
            metafield(namespace: "okendo", key: "summaryData") {
              value
            }
          }
        }
      `,
      variables: { handle: productHandle },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    data?: {
      productByHandle?: {
        metafield?: {
          value?: string;
        } | null;
      } | null;
    };
  };

  try {
    const raw = payload.data?.productByHandle?.metafield?.value;
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { reviewCount?: number };
    return typeof parsed.reviewCount === "number" ? parsed.reviewCount : null;
  } catch {
    return null;
  }
}

function buildRecommendationSearchTerms(message: string, workoutId?: string) {
  const lowered = message.toLowerCase();
  const terms = new Set<string>();

  for (const aliases of Object.values(PRODUCT_ALIASES)) {
    if (aliases.some((alias) => lowered.includes(alias))) {
      terms.add(aliases[0]);
    }
  }

  if (
    lowered.includes("workout") ||
    lowered.includes("exercise") ||
    lowered.includes("session") ||
    lowered.includes("training")
  ) {
    for (const term of WORKOUT_SEARCH_TERMS[workoutId ?? ""] ?? []) {
      terms.add(term);
    }
  }

  if (
    lowered.includes("protein") ||
    lowered.includes("recovery") ||
    lowered.includes("post-workout")
  ) {
    terms.add("protein");
  }

  if (
    lowered.includes("pre-workout") ||
    lowered.includes("pre workout") ||
    lowered.includes("energy") ||
    lowered.includes("hiit") ||
    lowered.includes("cardio")
  ) {
    terms.add("pre workout");
  }

  if (lowered.includes("creatine") || lowered.includes("strength") || lowered.includes("muscle")) {
    terms.add("creatine");
  }

  if (
    lowered.includes("electrolyte") ||
    lowered.includes("hydration") ||
    lowered.includes("hydrate") ||
    lowered.includes("sweat")
  ) {
    terms.add("hydration");
  }

  if (
    lowered.includes("supplement") ||
    lowered.includes("recommend") ||
    lowered.includes("product")
  ) {
    for (const term of WORKOUT_SEARCH_TERMS[workoutId ?? ""] ?? ["protein", "pre workout"]) {
      terms.add(term);
    }
  }

  return Array.from(terms).slice(0, 3);
}

export function isOrderTrackingRequest(message: string) {
  const lowered = message.toLowerCase();

  return (
    lowered.includes("track my order") ||
    lowered.includes("track this order") ||
    lowered.includes("order number") ||
    (lowered.includes("track") && lowered.includes("order")) ||
    lowered.includes("where is my order")
  );
}

export function isOrderHistoryRequest(message: string) {
  const lowered = message.toLowerCase();

  return (
    (lowered.includes("orders") && lowered.includes("email")) ||
    lowered.includes("order history") ||
    lowered.includes("my orders") ||
    lowered.includes("previous orders") ||
    lowered.includes("past orders") ||
    lowered.includes("orders for") ||
    lowered.includes("orders of")
  );
}

export function extractOrderNumber(message: string) {
  const explicitMatch =
    message.match(/\border(?:\s+number)?\s*#?\s*([A-Z0-9-]{4,})\b/i) ??
    message.match(/#([A-Z0-9-]{4,})\b/);

  return explicitMatch?.[1]?.toUpperCase() ?? null;
}

export function extractEmailAddress(message: string) {
  const match = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase() ?? null;
}

export function isArticleRecommendationRequest(message: string) {
  const lowered = message.toLowerCase();

  return ["blog", "blogs", "article", "articles", "post", "posts", "read", "reading"].some((term) =>
    lowered.includes(term),
  );
}

export function isPageRecommendationRequest(message: string) {
  const lowered = message.toLowerCase();

  return (
    ["page", "pages", "faq", "faqs", "about", "support", "contact", "policy", "policies"].some(
      (term) => lowered.includes(term),
    ) ||
    lowered.includes("home page") ||
    lowered.includes("homepage") ||
    lowered.includes("events") ||
    lowered.includes("event")
  );
}

function extractPageTopic(message: string) {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(
      /\b(give|show|share|find|suggest|recommend|recommended|me|some|few|best|top|good|please|pages|page|faqs|faq|about|support|contact|policy|policies|home|homepage|events|event|on|for|the|vpa|website)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function buildPageSearchTerms(message: string) {
  const lowered = message.toLowerCase();
  const terms = new Set<string>();
  const isPageRequest = isPageRecommendationRequest(message);
  const pageTopic = extractPageTopic(message);

  if (lowered.includes("faq")) {
    terms.add("faq");
  }

  if (lowered.includes("about")) {
    terms.add("about");
  }

  if (lowered.includes("event")) {
    terms.add("event");
  }

  if (lowered.includes("support") || lowered.includes("contact")) {
    terms.add("support");
    terms.add("contact");
  }

  if (lowered.includes("shipping")) {
    terms.add("shipping");
  }

  if (lowered.includes("return") || lowered.includes("refund")) {
    terms.add("returns");
  }

  if (lowered.includes("privacy")) {
    terms.add("privacy");
  }

  if (lowered.includes("terms")) {
    terms.add("terms");
  }

  if (lowered.includes("home page") || lowered.includes("homepage") || lowered.includes("home")) {
    terms.add("home");
  }

  if (isPageRequest && pageTopic) {
    terms.add(pageTopic);
  }

  if (isPageRequest && !pageTopic) {
    terms.add("faq");
    terms.add("about");
    terms.add("support");
  }

  if (!terms.size) {
    terms.add(message);
  }

  return Array.from(terms).slice(0, 4);
}

function extractArticleTopic(message: string) {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(
      /\b(give|show|share|find|suggest|recommend|recommended|me|some|few|best|top|good|please|blogs|blog|articles|article|posts|post|reads|read|reading|content|about|on|for)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function buildArticleSearchTerms(message: string) {
  const lowered = message.toLowerCase();
  const terms = new Set<string>();
  const isArticleRequest = isArticleRecommendationRequest(message);
  const articleTopic = extractArticleTopic(message);

  if (isArticleRequest) {
    if (articleTopic) {
      terms.add(articleTopic);
    }

    terms.add("blog");
  }

  for (const aliases of Object.values(PRODUCT_ALIASES)) {
    if (aliases.some((alias) => lowered.includes(alias))) {
      terms.add(aliases[0]);
    }
  }

  if (lowered.includes("safe") || lowered.includes("kid") || lowered.includes("child")) {
    terms.add("kids protein");
    terms.add("protein safety");
  }

  if (lowered.includes("what is")) {
    const fragment = lowered.split("what is")[1]?.trim();
    if (fragment) {
      terms.add(fragment);
    }
  }

  if (lowered.includes("difference") || lowered.includes("vs")) {
    terms.add(message);
  }

  if (
    !isArticleRequest &&
    (lowered.includes("good") ||
      lowered.includes("best") ||
      lowered.includes("better") ||
      lowered.includes("worth it"))
  ) {
    terms.add("benefits");
    terms.add("best protein powder");
  }

  if (lowered.includes("supplement")) {
    terms.add("protein supplement");
    terms.add("protein powder");
  }

  if (isArticleRequest && !articleTopic) {
    terms.add("protein");
    terms.add("workout");
    terms.add("supplements");
  }

  const nounishTerms = lowered
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3)
    .slice(0, 5);

  if (nounishTerms.length) {
    terms.add(nounishTerms.join(" "));
  }

  if (!terms.size) {
    terms.add(message);
  }

  return Array.from(terms).slice(0, 4);
}

function scoreProductMatch(message: string, product: RecommendedProduct) {
  const lowered = message.toLowerCase();
  const title = product.title.toLowerCase();
  const handle = product.url.toLowerCase();
  let score = 0;

  if (lowered.includes(title)) {
    score += 100;
  }

  if (
    handle.includes("whey-isolate-protein-powder") &&
    (lowered.includes("wpi") || lowered.includes("whey isolate"))
  ) {
    score += 90;
  }

  for (const aliases of Object.values(PRODUCT_ALIASES)) {
    if (
      aliases.some((alias) => lowered.includes(alias)) &&
      aliases.some((alias) => title.includes(alias))
    ) {
      score += 50;
    }
  }

  for (const token of lowered.split(/[^a-z0-9]+/).filter(Boolean)) {
    if (title.includes(token)) {
      score += 4;
    }
  }

  return score;
}

export function buildCollectionSearchTerms(message: string, workoutId?: string) {
  const lowered = message.toLowerCase();
  const terms = new Set<string>();

  if (isArticleRecommendationRequest(message)) {
    return [];
  }

  for (const hint of COLLECTION_HINTS) {
    if (hint.triggers.some((trigger) => lowered.includes(trigger))) {
      terms.add(hint.title);
    }
  }

  if (
    lowered.includes("recommended") ||
    lowered.includes("recommend") ||
    lowered.includes("product list") ||
    lowered.includes("best products")
  ) {
    terms.add("Best selling products");
  }

  if (
    lowered.includes("supplement") ||
    lowered.includes("supplements") ||
    lowered.includes("vitamin")
  ) {
    terms.add("Supplements");
  }

  for (const term of buildRecommendationSearchTerms(message, workoutId)) {
    terms.add(term);
  }

  return Array.from(terms).slice(0, 5);
}

function scoreCollectionMatch(message: string, collectionTitle: string) {
  const lowered = message.toLowerCase();
  const title = collectionTitle.toLowerCase();
  let score = scoreTextMatch(message, collectionTitle);

  if (
    title.includes("best selling") &&
    (lowered.includes("best") || lowered.includes("recommended") || lowered.includes("top"))
  ) {
    score += 40;
  }

  if (title.includes("supplement") && lowered.includes("supplement")) {
    score += 25;
  }

  return score;
}

async function getAdminStoreSnapshot() {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!storeDomain || !adminToken) {
    return null;
  }

  const response = await fetch(`https://${storeDomain}/admin/api/2025-10/graphql.json`, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify({
      query: `
        query AdminStoreSnapshot {
          shop {
            name
            description
          }
          products(first: 6, reverse: true) {
            nodes {
              title
              handle
              description
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      `,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    data?: {
      shop: { name: string; description: string };
      products: {
        nodes: Array<{
          title: string;
          handle: string;
          description: string;
          priceRangeV2: {
            minVariantPrice: {
              amount: string;
              currencyCode: string;
            };
          };
        }>;
      };
    };
  };

  return payload.data
    ? {
        shopName: payload.data.shop.name,
        description: payload.data.shop.description,
        products: payload.data.products.nodes.map((product) => ({
          title: product.title,
          handle: product.handle,
          description: product.description,
          price: `${product.priceRangeV2.minVariantPrice.currencyCode} ${product.priceRangeV2.minVariantPrice.amount}`,
        })),
      }
    : null;
}

async function getRecommendedProducts(message: string, workoutId?: string) {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const searchTerms = buildRecommendationSearchTerms(message, workoutId);
  const collectionSearchTerms = buildCollectionSearchTerms(message, workoutId);

  if (!storeDomain || !adminToken || searchTerms.length === 0) {
    return { products: [], collectionTitle: null };
  }

  if (collectionSearchTerms.length > 0) {
    const collectionFields = collectionSearchTerms
      .map(
        (term, index) => `
          collectionSearch${index}: collections(first: 4, query: ${JSON.stringify(term)}) {
            nodes {
              title
              handle
              products(first: 6) {
                nodes {
                  title
                  handle
                  description
                  legacyResourceId
                  onlineStoreUrl
                  featuredImage {
                    url
                    altText
                  }
                  priceRangeV2 {
                    minVariantPrice {
                      amount
                      currencyCode
                    }
                  }
                  options {
                    name
                    optionValues {
                      name
                    }
                  }
                  variants(first: 50) {
                    nodes {
                      legacyResourceId
                      title
                      price
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      )
      .join("\n");

    const collectionResponse = await fetch(
      `https://${storeDomain}/admin/api/2025-10/graphql.json`,
      {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": adminToken,
        },
        body: JSON.stringify({
          query: `
          query RecommendedCollections {
            ${collectionFields}
          }
        `,
        }),
      },
    );

    if (collectionResponse.ok) {
      const collectionPayload = (await collectionResponse.json()) as {
        data?: Record<
          string,
          {
            nodes: AdminCollectionCard[];
          }
        >;
      };

      const rankedCollections = Object.values(collectionPayload.data ?? {})
        .flatMap((result) => result.nodes)
        .map((collection) => ({
          collection,
          score: scoreCollectionMatch(message, collection.title),
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);

      const bestCollection = rankedCollections[0]?.collection;

      if (bestCollection?.products.nodes.length) {
        const dedupedCollectionProducts = new Map<string, RecommendedProduct>();

        for (const product of bestCollection.products.nodes) {
          const normalized = normalizeProduct(product);

          if (normalized && !dedupedCollectionProducts.has(normalized.url)) {
            normalized.bundlePricing = await getBundlePricing(
              product.legacyResourceId,
              product.priceRangeV2.minVariantPrice.amount,
              product.priceRangeV2.minVariantPrice.currencyCode,
            ).catch(() => []);
            normalized.reviewCount = await getReviewCount(product.handle).catch(() => null);
            dedupedCollectionProducts.set(normalized.url, normalized);
          }
        }

        const collectionProducts = Array.from(dedupedCollectionProducts.values())
          .sort((a, b) => scoreProductMatch(message, b) - scoreProductMatch(message, a))
          .slice(0, 6);

        if (collectionProducts.length > 0) {
          return {
            products: collectionProducts,
            collectionTitle: bestCollection.title,
          } satisfies ProductRecommendationResult;
        }
      }
    }
  }

  const fields = searchTerms
    .map(
      (term, index) => `
        search${index}: products(first: 4, query: ${JSON.stringify(term)}) {
          nodes {
            title
            handle
            description
            legacyResourceId
            onlineStoreUrl
            featuredImage {
              url
              altText
            }
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            options {
              name
              optionValues {
                name
              }
            }
            variants(first: 50) {
              nodes {
                legacyResourceId
                title
                price
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      `,
    )
    .join("\n");

  const response = await fetch(`https://${storeDomain}/admin/api/2025-10/graphql.json`, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify({
      query: `
        query RecommendedProducts {
          ${fields}
        }
      `,
    }),
  });

  if (!response.ok) {
    return { products: [], collectionTitle: null };
  }

  const payload = (await response.json()) as {
    data?: Record<
      string,
      {
        nodes: AdminProductCard[];
      }
    >;
  };

  const deduped = new Map<string, RecommendedProduct>();

  for (const result of Object.values(payload.data ?? {})) {
    for (const product of result.nodes) {
      const normalized = normalizeProduct(product);

      if (normalized && !deduped.has(normalized.url)) {
        normalized.bundlePricing = await getBundlePricing(
          product.legacyResourceId,
          product.priceRangeV2.minVariantPrice.amount,
          product.priceRangeV2.minVariantPrice.currencyCode,
        ).catch(() => []);
        normalized.reviewCount = await getReviewCount(product.handle).catch(() => null);
        deduped.set(normalized.url, normalized);
      }
    }
  }

  return {
    products: Array.from(deduped.values())
      .sort((a, b) => scoreProductMatch(message, b) - scoreProductMatch(message, a))
      .slice(0, 3),
    collectionTitle: null,
  } satisfies ProductRecommendationResult;
}

async function getRecommendedArticles(message: string) {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const searchTerms = buildArticleSearchTerms(message);

  if (!storeDomain || !adminToken || searchTerms.length === 0) {
    return [];
  }

  const fields = searchTerms
    .map(
      (term, index) => `
        articleSearch${index}: articles(first: 3, query: ${JSON.stringify(term)}) {
          nodes {
            title
            handle
            excerpt
            contentHtml
            publishedAt
            onlineStoreUrl
            image {
              url
              altText
            }
            blog {
              handle
              title
            }
          }
        }
      `,
    )
    .join("\n");

  const response = await fetch(`https://${storeDomain}/admin/api/2025-10/graphql.json`, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify({
      query: `
        query RecommendedArticles {
          ${fields}
        }
      `,
    }),
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    data?: Record<
      string,
      {
        nodes: AdminArticleCard[];
      }
    >;
  };

  const deduped = new Map<string, RecommendedArticle>();

  for (const result of Object.values(payload.data ?? {})) {
    for (const article of result.nodes) {
      const normalized = normalizeArticle(article);
      if (normalized && !deduped.has(normalized.url)) {
        deduped.set(normalized.url, normalized);
      }
    }
  }

  const adminArticles = Array.from(deduped.values())
    .sort(
      (a, b) =>
        scoreTextMatch(message, b.title + " " + b.summary) -
        scoreTextMatch(message, a.title + " " + a.summary),
    )
    .slice(0, 3);

  if (adminArticles.length > 0) {
    return adminArticles;
  }

  return getRecommendedArticlesFromPublicSite(message).catch(() => []);
}

async function getRecommendedPages(message: string) {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const searchTerms = buildPageSearchTerms(message);

  if (!storeDomain || !adminToken || searchTerms.length === 0) {
    return [];
  }

  const fields = searchTerms
    .map(
      (term, index) => `
        pageSearch${index}: pages(first: 3, query: ${JSON.stringify(term)}) {
          nodes {
            title
            handle
            body
            bodySummary
            updatedAt
          }
        }
      `,
    )
    .join("\n");

  const response = await fetch(`https://${storeDomain}/admin/api/2025-10/graphql.json`, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify({
      query: `
        query RecommendedPages {
          ${fields}
        }
      `,
    }),
  });

  if (!response.ok) {
    return getRecommendedPagesFromPublicSite(message).catch(() => []);
  }

  const payload = (await response.json()) as {
    data?: Record<
      string,
      {
        nodes: AdminPageCard[];
      }
    >;
    errors?: Array<{ message: string; extensions?: { code?: string } }>;
  };

  if (payload.errors?.length) {
    return getRecommendedPagesFromPublicSite(message).catch(() => []);
  }

  const deduped = new Map<string, RecommendedPage>();

  for (const result of Object.values(payload.data ?? {})) {
    for (const page of result.nodes) {
      const normalized = normalizePage(page);
      if (normalized && !isStaleEventPage(normalized) && !deduped.has(normalized.url)) {
        deduped.set(normalized.url, normalized);
      }
    }
  }

  const recommendedPages = Array.from(deduped.values())
    .sort(
      (a, b) =>
        scoreTextMatch(message, `${b.title} ${b.summary} ${b.pageType ?? ""}`) +
        scorePageIntentMatch(message, `${b.title} ${b.url} ${b.pageType ?? ""}`) -
        (scoreTextMatch(message, `${a.title} ${a.summary} ${a.pageType ?? ""}`) +
          scorePageIntentMatch(message, `${a.title} ${a.url} ${a.pageType ?? ""}`)),
    )
    .slice(0, 3);

  if (recommendedPages.length > 0) {
    return recommendedPages;
  }

  return getRecommendedPagesFromPublicSite(message).catch(() => []);
}

async function getRecommendedPagesFromPublicSite(message: string) {
  const sitemapIndexResponse = await fetch("https://www.vpa.com.au/sitemap.xml", {
    signal: AbortSignal.timeout(10000),
  });

  if (!sitemapIndexResponse.ok) {
    return buildHomepagePageFallback(message);
  }

  const sitemapIndexXml = await sitemapIndexResponse.text();
  const pageSitemaps = parsePageSitemapIndex(sitemapIndexXml);

  if (!pageSitemaps.length) {
    return buildHomepagePageFallback(message);
  }

  const sitemapPayloads = await Promise.all(
    pageSitemaps.map(async (url) => {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          return "";
        }

        return await response.text();
      } catch {
        return "";
      }
    }),
  );

  const sitemapPages = sitemapPayloads.flatMap((xml) => (xml ? parseSitemapPages(xml) : []));
  const searchTerms = buildPageSearchTerms(message);

  const ranked = sitemapPages
    .map((page) => ({
      page,
      score:
        scoreTextMatch(message, `${page.title} ${page.url} ${page.pageType ?? ""}`) +
        scorePageIntentMatch(message, `${page.title} ${page.url} ${page.pageType ?? ""}`) +
        searchTerms.reduce(
          (sum, term) => sum + scoreTextMatch(term, `${page.title} ${page.url}`),
          0,
        ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const fallbackRanked = ranked.length
    ? ranked
    : message.toLowerCase().includes("faq")
      ? sitemapPages
          .filter((page) => page.url.includes("frequently-asked-questions"))
          .map((page) => ({ page, score: 1 }))
      : [];

  if (!fallbackRanked.length) {
    return buildHomepagePageFallback(message);
  }

  const hydrated = await Promise.all(
    fallbackRanked.map(({ page }) => hydratePublicPage(page, sitemapPages, true)),
  );

  const recommendedPages = hydrated.flatMap((page) =>
    page && !isStaleEventPage(page) ? [page] : [],
  );

  if (recommendedPages.length > 0) {
    return recommendedPages;
  }

  return buildHomepagePageFallback(message);
}

function buildHomepagePageFallback(message: string) {
  if (message.toLowerCase().includes("home page") || message.toLowerCase().includes("homepage")) {
    return [
      {
        title: "VPA Home",
        summary:
          "Browse the latest featured products, collections, wellness content, and current promotions on the main VPA storefront.",
        contentHtml: convertPlainTextToHtml(
          "Browse the latest featured products, collections, wellness content, and current promotions on the main VPA storefront.",
        ),
        url: "https://www.vpa.com.au/",
        imageUrl: null,
        imageAlt: null,
        updatedAt: null,
        pageType: "Storefront",
      } satisfies RecommendedPage,
    ];
  }

  return [];
}

async function hydratePublicPage(
  page: PublicSitemapPage,
  sitemapPages: PublicSitemapPage[],
  includeLinkedPages = true,
): Promise<RecommendedPage | null> {
  try {
    const response = await fetch(page.url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        title: page.title,
        summary: page.pageType ? `${page.pageType} page on the VPA website.` : "VPA page.",
        contentHtml: convertPlainTextToHtml(
          page.pageType ? `${page.pageType} page on the VPA website.` : "VPA page.",
        ),
        url: page.url,
        imageUrl: null,
        imageAlt: null,
        updatedAt: page.updatedAt,
        pageType: page.pageType,
      } satisfies RecommendedPage;
    }

    const html = await response.text();
    const title =
      extractMetaContent(html, "og:title") ||
      html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ||
      page.title;
    const normalizedTitle = decodeHtmlEntities(
      title.replace(/\s*\|\s*VPA.*$/i, "").trim() || page.title,
    );
    const summary =
      extractMetaContent(html, "og:description") ||
      extractMetaContent(html, "description") ||
      `${page.pageType ?? "Page"} page on the VPA website.`;
    const contentHtml = extractStorefrontPageContentHtml(html);
    const plainContent = stripHtml(contentHtml);
    const pageImage = extractPageImage(html);

    let linkedPages: RecommendedPage[] | undefined;

    if (
      includeLinkedPages &&
      isEventsHubPage({ title: normalizedTitle, url: page.url, pageType: page.pageType })
    ) {
      const sitemapPageByUrl = new Map(sitemapPages.map((entry) => [entry.url, entry]));
      const linkedUrls = extractEventRecapUrlsFromEventsHub(html);
      const linkedPageCandidates = linkedUrls.map(
        (url) =>
          sitemapPageByUrl.get(url) ?? {
            title: humanizeSlug(url.split("/pages/")[1]?.split(/[?#]/)[0]?.trim() ?? "Event"),
            url,
            updatedAt: null,
            pageType: "Events",
          },
      );
      const hydratedLinkedPages = await Promise.all(
        linkedPageCandidates.map((candidate) => hydratePublicPage(candidate, sitemapPages, false)),
      );

      linkedPages = hydratedLinkedPages.flatMap((entry) =>
        entry && !isStaleEventPage(entry) ? [entry] : [],
      );
    }

    return {
      title: normalizedTitle,
      summary: decodeHtmlEntities(summary).slice(0, 280).trim(),
      contentHtml:
        contentHtml || convertPlainTextToHtml(decodeHtmlEntities(plainContent || summary)),
      url: page.url,
      imageUrl: pageImage.imageUrl,
      imageAlt: pageImage.imageAlt ?? normalizedTitle,
      updatedAt: page.updatedAt,
      pageType: inferPageType(title, page.url.split("/pages/")[1] ?? page.title),
      linkedPages: linkedPages?.length ? linkedPages : undefined,
    } satisfies RecommendedPage;
  } catch {
    return null;
  }
}

function scoreTextMatch(message: string, haystack: string) {
  const loweredMessage = message.toLowerCase();
  const loweredHaystack = haystack.toLowerCase();
  let score = 0;

  if (loweredMessage.includes(loweredHaystack) || loweredHaystack.includes(loweredMessage)) {
    score += 40;
  }

  for (const token of loweredMessage.split(/[^a-z0-9]+/).filter(Boolean)) {
    if (loweredHaystack.includes(token)) {
      score += 4;
    }
  }

  return score;
}

async function createOpenAiReply(
  message: string,
  storeSnapshot: Awaited<ReturnType<typeof getAdminStoreSnapshot>>,
  recommendedProducts: RecommendedProduct[],
  recommendedArticles: RecommendedArticle[],
  recommendedPages: RecommendedPage[],
) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-5.4";

  if (!apiKey) {
    return null;
  }

  const systemPrompt = `
You are the VPA Coach assistant for vpa.com.au.

Be friendly, concise, practical, and brand-safe.
Sound like a warm, helpful coach having a natural conversation, not a catalog or sales script.
Your allowed topics are:
- VPA and vpa.com.au
- VPA products, ingredients, flavors, pricing, policies, blogs, about content, events, and general store questions
- workout ideas, exercise guidance, beginner-friendly training structure, recovery, and supplement-related guidance
- customer order help for VPA orders

If a question is not about VPA, workouts, exercises, health/fitness guidance, or supplements, politely refuse and redirect back to what you can help with.
Do not answer general off-topic questions, news, entertainment, politics, coding, or unrelated shopping questions.
For order help, use the connected Shopify customer account whenever it is available, and do not ask for their email again in that case.
Only ask for the order email when there is no connected Shopify customer context available.
Do not invent medical advice, diagnoses, treatments, or store policies.
Do not claim certainty when live store data is unavailable.
Do not invent products, bundles, starter packs, or prices that are not in the provided data.
When recommending products:
- Prefer 1 to 3 real products from the provided recommendation list when available
- Explain in plain language why each pick fits the user's goal
- Keep the tone friendly and conversational
- End with one simple follow-up question when helpful
If the user asks for exercises, workouts, stretches, mobility, or a routine:
- Answer with exercise or workout guidance first
- Keep product recommendations out unless the user explicitly asks for products or supplements too
- If the question mentions pain, avoid sounding diagnostic and encourage a professional check if pain is severe, persistent, or worsening
When article/blog content is available and the user's question is informational, prefer answering from the article context instead of switching into a product card.
If a relevant blog article is available, keep the text short and introduce it naturally, for example: "Here’s a VPA article that covers this topic."
If a product detail card is available for the user's question, keep the text very short.
For direct product-detail questions, prefer 1 or 2 short sentences such as "Here are the details for Whey Protein Isolate. You can pick a bundle and flavour below."
Do not repeat long pricing tables, flavour lists, or product-page URLs in the text when the card already shows them.

Live admin-backed store context:
${storeSnapshot ? JSON.stringify(storeSnapshot, null, 2) : "No live store snapshot available."}

Recommended products for this reply:
${recommendedProducts.length ? JSON.stringify(recommendedProducts, null, 2) : "No recommended products available."}

Relevant blog/article context for this reply:
${recommendedArticles.length ? JSON.stringify(recommendedArticles, null, 2) : "No relevant blog articles available."}

Relevant Shopify page context for this reply:
${recommendedPages.length ? JSON.stringify(recommendedPages, null, 2) : "No relevant store pages available."}
  `.trim();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: message }],
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  const derivedText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text ?? "")
    .join("\n")
    .trim();

  return payload.output_text?.trim() || derivedText || null;
}

function isDirectProductDetailQuestion(message: string) {
  const lowered = message.toLowerCase();
  const explicitDetailIntent =
    lowered.includes("show me") ||
    lowered.includes("details for") ||
    lowered.includes("product detail") ||
    lowered.includes("product details") ||
    lowered.includes("give me the detail") ||
    lowered.includes("give me the details") ||
    lowered.includes("tell me about");
  const mentionsSpecificProduct = Object.values(PRODUCT_ALIASES).some((aliases) =>
    aliases.some((alias) => lowered.includes(alias)),
  );
  const isShortProductLookup =
    mentionsSpecificProduct &&
    lowered.split(/\s+/).filter(Boolean).length <= 5 &&
    !lowered.includes("?") &&
    !lowered.includes("safe");

  return mentionsSpecificProduct && (explicitDetailIntent || isShortProductLookup);
}

function isInformationalHealthQuestion(message: string) {
  const lowered = message.toLowerCase();

  return [
    "safe",
    "safety",
    "kid",
    "child",
    "children",
    "year old",
    "years old",
    "doctor",
    "medical",
    "allergy",
    "allergies",
    "side effect",
    "side effects",
    "pregnant",
    "pregnancy",
    "breastfeeding",
    "breast feeding",
    "dosage",
    "how much should",
    "is it okay",
  ].some((term) => lowered.includes(term));
}

function isExerciseGuidanceQuestion(message: string) {
  const lowered = message.toLowerCase();

  return [
    "exercise",
    "exercises",
    "workout",
    "workouts",
    "abs",
    "ab workout",
    "core",
    "stretch",
    "stretches",
    "mobility",
    "routine",
    "training plan",
    "session",
    "warm up",
    "warmup",
    "cool down",
    "cooldown",
    "lower back pain",
    "back pain",
    "knee pain",
    "hip pain",
    "shoulder pain",
    "sore back",
  ].some((term) => lowered.includes(term));
}

function shouldPreferArticle(message: string) {
  const lowered = message.toLowerCase();
  const mentionsSpecificProduct = Object.values(PRODUCT_ALIASES).some((aliases) =>
    aliases.some((alias) => lowered.includes(alias)),
  );
  const looksLikeOrderSupport = isOrderTrackingRequest(message) || isOrderHistoryRequest(message);

  return (
    !looksLikeOrderSupport &&
    (isArticleRecommendationRequest(message) ||
      isInformationalHealthQuestion(message) ||
      lowered.includes("what is") ||
      lowered.includes("benefit") ||
      lowered.includes("benefits") ||
      lowered.includes("difference") ||
      lowered.includes("vs") ||
      lowered.includes("compare") ||
      lowered.includes("good for") ||
      lowered.includes("good supplement") ||
      lowered.includes("is ") ||
      lowered.includes("how does") ||
      lowered.includes("explain") ||
      (mentionsSpecificProduct && lowered.includes("?") && !isDirectProductDetailQuestion(message)))
  );
}

function shouldPreferPage(message: string) {
  const lowered = message.toLowerCase();

  return (
    isPageRecommendationRequest(message) ||
    lowered.includes("faq") ||
    lowered.includes("about") ||
    lowered.includes("support") ||
    lowered.includes("contact") ||
    lowered.includes("policy") ||
    lowered.includes("returns") ||
    lowered.includes("shipping") ||
    lowered.includes("event") ||
    lowered.includes("homepage") ||
    lowered.includes("home page")
  );
}

export const reply = action({
  args: {
    message: v.string(),
    workoutId: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerAccessToken: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const message = args.message.trim();

    if (!message) {
      throw new Error("Message is required");
    }

    const connectedCustomer =
      isOrderHistoryRequest(message) || isOrderTrackingRequest(message)
        ? await resolveConnectedCustomerForOrderSupport(args.customerAccessToken).catch(() => null)
        : null;

    if (isOrderHistoryRequest(message)) {
      if (!connectedCustomer) {
        return buildOrderConnectionRequiredResponse();
      }

      const providedEmail = extractEmailAddress(message)?.toLowerCase() ?? null;
      const connectedEmail = connectedCustomer.email.toLowerCase();

      if (providedEmail && providedEmail !== connectedEmail) {
        return buildOrderAccountMismatchResponse(connectedCustomer.email);
      }

      const orders = await getOrdersByEmail(connectedEmail).catch(() => []);

      if (!orders.length) {
        return {
          text: `I couldn't find any VPA orders for the connected Shopify account (${connectedCustomer.email}).`,
          source: "live",
          storeSnapshot: null,
          recommendedProductsCollectionTitle: null,
          recommendedProducts: [],
          recommendedArticles: [],
          recommendedPages: [],
          orderPreview: null,
          orderPreviews: [],
          requiresAccountConnection: false,
        };
      }

      return {
        text:
          orders.length === 1
            ? `I found 1 order for the connected Shopify account (${connectedCustomer.email}).`
            : `I found ${orders.length} recent orders for the connected Shopify account (${connectedCustomer.email}).`,
        source: "live",
        storeSnapshot: null,
        recommendedProductsCollectionTitle: null,
        recommendedProducts: [],
        recommendedArticles: [],
        recommendedPages: [],
        orderPreview: null,
        orderPreviews: orders,
        requiresAccountConnection: false,
      };
    }

    if (isOrderTrackingRequest(message)) {
      if (!connectedCustomer) {
        return buildOrderConnectionRequiredResponse();
      }

      const orderNumber = extractOrderNumber(message);
      const providedEmail = extractEmailAddress(message)?.toLowerCase() ?? null;
      const connectedEmail = connectedCustomer.email.toLowerCase();

      if (!orderNumber) {
        return {
          text: "I can help with that. Share the order number and I’ll check the status for your connected Shopify account.",
          source: "live",
          storeSnapshot: null,
          recommendedProductsCollectionTitle: null,
          recommendedProducts: [],
          recommendedArticles: [],
          recommendedPages: [],
          orderPreview: null,
          orderPreviews: [],
          requiresAccountConnection: false,
        };
      }

      if (providedEmail && providedEmail !== connectedEmail) {
        return buildOrderAccountMismatchResponse(connectedCustomer.email);
      }

      const trackedOrder = await getTrackedOrder(orderNumber, connectedEmail).catch(() => null);

      if (!trackedOrder) {
        return {
          text: `I couldn't find a VPA order matching #${orderNumber} for the connected Shopify account (${connectedCustomer.email}).`,
          source: "live",
          storeSnapshot: null,
          recommendedProductsCollectionTitle: null,
          recommendedProducts: [],
          recommendedArticles: [],
          recommendedPages: [],
          orderPreview: null,
          orderPreviews: [],
          requiresAccountConnection: false,
        };
      }

      return {
        text: `Here’s the latest tracking view for ${trackedOrder.orderNumber}.`,
        source: "live",
        storeSnapshot: null,
        recommendedProductsCollectionTitle: null,
        recommendedProducts: [],
        recommendedArticles: [],
        recommendedPages: [],
        orderPreview: trackedOrder,
        orderPreviews: [],
        requiresAccountConnection: false,
      };
    }

    const storeSnapshot = await getAdminStoreSnapshot().catch(() => null);
    const shouldPrioritizeExerciseGuidance = isExerciseGuidanceQuestion(message);
    const shouldPrioritizeArticleRecommendations = isArticleRecommendationRequest(message);
    const shouldPrioritizePageRecommendations = isPageRecommendationRequest(message);
    const productRecommendations =
      shouldPrioritizeExerciseGuidance ||
      shouldPrioritizeArticleRecommendations ||
      shouldPrioritizePageRecommendations
        ? ({
            products: [],
            collectionTitle: null,
          } satisfies ProductRecommendationResult)
        : await getRecommendedProducts(message, args.workoutId).catch(
            () =>
              ({
                products: [],
                collectionTitle: null,
              }) satisfies ProductRecommendationResult,
          );
    const recommendedProducts = productRecommendations.products;
    const recommendedProductsCollectionTitle = productRecommendations.collectionTitle;
    const recommendedArticles = await getRecommendedArticles(message).catch(() => []);
    const recommendedPages = await getRecommendedPages(message).catch(() => []);
    let text =
      (await createOpenAiReply(
        message,
        storeSnapshot,
        recommendedProducts,
        recommendedArticles,
        recommendedPages,
      ).catch(() => null)) ??
      "I’m here to help with VPA products, workouts, and order support. Ask me about recovery, muscle gain, or what product might fit your goal.";

    const shouldHideProductCards =
      isInformationalHealthQuestion(message) ||
      shouldPrioritizeExerciseGuidance ||
      shouldPrioritizeArticleRecommendations ||
      shouldPrioritizePageRecommendations;
    const shouldShowPage =
      !shouldPrioritizeExerciseGuidance &&
      (shouldPrioritizePageRecommendations || shouldPreferPage(message)) &&
      recommendedPages.length > 0;
    const shouldShowArticle =
      !shouldShowPage &&
      !shouldPrioritizeExerciseGuidance &&
      (shouldPrioritizeArticleRecommendations || shouldPreferArticle(message)) &&
      recommendedArticles.length > 0;
    const shouldShowProductGallery =
      !shouldShowArticle &&
      !shouldHideProductCards &&
      recommendedProducts.length > 1 &&
      !isDirectProductDetailQuestion(message);

    if (
      !shouldShowArticle &&
      !shouldHideProductCards &&
      recommendedProducts.length > 0 &&
      isDirectProductDetailQuestion(message)
    ) {
      text = `Here are the details for ${recommendedProducts[0].title}. You can pick a bundle and flavour below.`;
    }

    if (shouldShowArticle) {
      text =
        recommendedArticles.length > 1
          ? `Here are a few VPA blog picks you might like.`
          : `Here’s a VPA article that covers this topic.`;
    }

    if (shouldShowPage) {
      text = isFormLikePage(recommendedPages[0])
        ? "This page includes a sign-up form. Open the VPA page to complete your registration."
        : recommendedPages.length > 1
          ? "Here are a few VPA pages that match what you asked for."
          : "Here’s the VPA page that covers this topic.";
    }

    if (shouldPrioritizeArticleRecommendations && recommendedArticles.length === 0) {
      text =
        "I couldn’t find a matching VPA blog article just yet, but I can help narrow it down by topic like protein, creatine, recovery, or workouts.";
    }

    if (
      shouldPrioritizePageRecommendations &&
      recommendedPages.length === 0 &&
      recommendedArticles.length === 0
    ) {
      text =
        "I couldn’t find a matching VPA page just yet, but I can help with FAQs, About, support, shipping, returns, or events.";
    }

    if (shouldShowProductGallery) {
      text = recommendedProductsCollectionTitle
        ? `Here are a few picks from ${recommendedProductsCollectionTitle}.`
        : `Here are a few VPA picks to start with.`;
    }

    return {
      text,
      source: text ? "live" : "fallback",
      storeSnapshot,
      recommendedProductsCollectionTitle,
      recommendedProducts:
        shouldHideProductCards || shouldShowArticle || shouldShowPage ? [] : recommendedProducts,
      recommendedArticles: shouldShowArticle ? recommendedArticles : [],
      recommendedPages: shouldShowPage ? recommendedPages : [],
      orderPreview: null,
      orderPreviews: [],
      requiresAccountConnection: false,
    };
  },
});

function buildOrderConnectionRequiredResponse() {
  return {
    text: "Connect your Shopify account to track orders or view order history in chat. For privacy, I only show orders for the signed-in Shopify customer.",
    source: "live" as const,
    storeSnapshot: null,
    recommendedProductsCollectionTitle: null,
    recommendedProducts: [],
    recommendedArticles: [],
    recommendedPages: [],
    orderPreview: null,
    orderPreviews: [],
    requiresAccountConnection: true,
  };
}

function buildOrderAccountMismatchResponse(connectedEmail: string) {
  return {
    text: `I can only show orders for the connected Shopify account. You're currently connected as ${connectedEmail}.`,
    source: "live" as const,
    storeSnapshot: null,
    recommendedProductsCollectionTitle: null,
    recommendedProducts: [],
    recommendedArticles: [],
    recommendedPages: [],
    orderPreview: null,
    orderPreviews: [],
    requiresAccountConnection: false,
  };
}

async function getTrackedOrder(
  orderNumber: string,
  email: string,
): Promise<OrderTrackingPreview | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedOrderNumber = orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`;
  const targetOrderNumber = normalizedOrderNumber.replace(/^#/, "").trim().toUpperCase();
  const [customerOrders, searchedOrders] = await Promise.all([
    getCustomerOrdersByEmail(normalizedEmail),
    getOrdersByEmailSearchResults(normalizedEmail),
  ]);
  const mergedOrders = mergeAdminOrders(customerOrders, searchedOrders);
  const trackedOrder = findOrderByNumber(mergedOrders, targetOrderNumber, true, normalizedEmail);

  if (!trackedOrder) {
    return null;
  }

  return mapAdminOrderToPreview(trackedOrder, normalizedEmail);
}

async function getOrdersByEmail(email: string): Promise<OrderTrackingPreview[]> {
  const normalizedEmail = email.trim().toLowerCase();
  const [customerOrders, searchedOrders] = await Promise.all([
    getCustomerOrdersByEmail(normalizedEmail),
    getOrdersByEmailSearchResults(normalizedEmail),
  ]);

  return mergeAdminOrders(customerOrders, searchedOrders)
    .map((entry) => mapAdminOrderToPreview(entry, normalizedEmail))
    .slice(0, 5);
}

async function getOrdersByEmailSearchResults(normalizedEmail: string): Promise<AdminOrderCard[]> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!storeDomain || !adminToken) {
    return [];
  }

  const response = await fetch(`https://${storeDomain}/admin/api/2025-10/graphql.json`, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify({
      query: `
        query OrdersByEmail($query: String!) {
          orders(first: 10, query: $query, sortKey: PROCESSED_AT, reverse: true) {
            nodes {
              name
              email
              processedAt
              displayFulfillmentStatus
              displayFinancialStatus
              statusPageUrl
              customer {
                email
              }
              fulfillments {
                status
                createdAt
                trackingInfo {
                  company
                  number
                  url
                }
              }
            }
          }
        }
      `,
      variables: {
        query: buildOrderEmailSearchQuery(normalizedEmail),
      },
    }),
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    data?: {
      orders?: {
        nodes: AdminOrderCard[];
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (payload.errors?.length) {
    console.error("Shopify orders by email search returned GraphQL errors", {
      email: normalizedEmail,
      errors: payload.errors,
    });
    return [];
  }

  return (payload.data?.orders?.nodes ?? []).filter((entry) =>
    hasMatchingEmail(entry, normalizedEmail),
  );
}

async function getCustomerOrdersByEmail(email: string): Promise<AdminOrderCard[]> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  if (!storeDomain || !adminToken) {
    return [];
  }

  const response = await fetch(`https://${storeDomain}/admin/api/2025-10/graphql.json`, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify({
      query: `
        query CustomerOrdersByEmail($query: String!) {
          customers(first: 5, query: $query) {
            nodes {
              id
              email
              orders(first: 25, sortKey: PROCESSED_AT, reverse: true) {
                nodes {
                  name
                  email
                  processedAt
                  displayFulfillmentStatus
                  displayFinancialStatus
                  statusPageUrl
                  customer {
                    email
                  }
                  fulfillments {
                    status
                    createdAt
                    trackingInfo {
                      company
                      number
                      url
                    }
                  }
                }
              }
            }
          }
        }
      `,
      variables: {
        query: buildCustomerEmailSearchQuery(email),
      },
    }),
  });

  if (!response.ok) {
    console.error("Shopify customer orders lookup failed", {
      status: response.status,
      email,
    });
    return [];
  }

  const payload = (await response.json()) as {
    data?: {
      customers?: {
        nodes: AdminCustomerOrderLookup[];
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (payload.errors?.length) {
    console.error("Shopify customer orders lookup returned GraphQL errors", {
      email,
      errors: payload.errors,
    });
    return [];
  }

  const matchingCustomers = (payload.data?.customers?.nodes ?? []).filter(
    (customer) => !customer.email || customer.email.trim().toLowerCase() === email,
  );
  const orders = matchingCustomers
    .flatMap((customer) => customer.orders.nodes)
    .filter(
      (entry, index, entries) =>
        entries.findIndex((candidate) => candidate.name === entry.name) === index,
    );

  return orders;
}

export function mergeAdminOrders(...orderGroups: AdminOrderCard[][]) {
  return orderGroups
    .flatMap((orders) => orders)
    .sort((left, right) => {
      const leftTimestamp = left.processedAt ? Date.parse(left.processedAt) : 0;
      const rightTimestamp = right.processedAt ? Date.parse(right.processedAt) : 0;
      return rightTimestamp - leftTimestamp;
    })
    .filter(
      (entry, index, entries) =>
        entries.findIndex((candidate) => candidate.name === entry.name) === index,
    );
}

function findOrderByNumber(
  orders: AdminOrderCard[],
  targetOrderNumber: string,
  requireEmailMatch: boolean,
  normalizedEmail: string,
) {
  return orders.find((entry) => {
    const normalizedName = entry.name.replace(/^#/, "").trim().toUpperCase();
    return (
      normalizedName === targetOrderNumber &&
      (!requireEmailMatch || hasMatchingEmail(entry, normalizedEmail))
    );
  });
}

function hasMatchingEmail(entry: AdminOrderCard, normalizedEmail: string) {
  const candidateEmails = [entry.email, entry.customer?.email]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toLowerCase());

  return candidateEmails.includes(normalizedEmail);
}

export function mapAdminOrderToPreview(
  entry: AdminOrderCard,
  normalizedEmail: string,
): OrderTrackingPreview {
  const latestFulfillment = entry.fulfillments[0] ?? null;
  const latestTracking = latestFulfillment?.trackingInfo[0] ?? null;
  const financialStatusLabel = humanizeOrderStatus(entry.displayFinancialStatus);
  const statusLabel =
    humanizeOrderStatus(entry.displayFulfillmentStatus ?? latestFulfillment?.status) ??
    financialStatusLabel;
  const isRefunded = (entry.displayFinancialStatus ?? "").toLowerCase().includes("refund");

  return {
    orderNumber: entry.name,
    status: statusLabel ?? "Processing",
    eta: latestTracking?.url
      ? "Tracking available"
      : isRefunded
        ? "Order refunded"
        : "Awaiting courier update",
    lastEvent: latestTracking?.number
      ? `${latestTracking.company ?? "Courier"} tracking ${latestTracking.number} is now available.`
      : isRefunded
        ? "This order has been refunded."
        : latestFulfillment?.createdAt
          ? `Fulfilment updated on ${new Date(latestFulfillment.createdAt).toLocaleString("en-AU")}.`
          : "Your order is being prepared for its next delivery update.",
    financialStatus: financialStatusLabel,
    trackingNumber: latestTracking?.number ?? null,
    trackingCompany: latestTracking?.company ?? null,
    trackingUrl: latestTracking?.url ?? entry.statusPageUrl ?? null,
    customerEmail: entry.email ?? entry.customer?.email ?? normalizedEmail,
  };
}

function humanizeOrderStatus(status?: string | null) {
  if (!status) {
    return null;
  }

  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildOrderEmailSearchQuery(email: string) {
  const escapedEmail = email.replace(/(["\\])/g, "\\$1");
  return `email:"${escapedEmail}"`;
}

function buildCustomerEmailSearchQuery(email: string) {
  const escapedEmail = email.replace(/(["\\])/g, "\\$1");
  return `email:"${escapedEmail}"`;
}

async function resolveConnectedCustomerForOrderSupport(
  accessToken?: string,
): Promise<ConnectedCustomer | null> {
  const trimmedToken = accessToken?.trim();
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;

  if (!trimmedToken || !storeDomain) {
    return null;
  }

  const accountConfig = await getCustomerAccountDiscovery(storeDomain);
  return await fetchConnectedCustomer(accountConfig.graphql_api, trimmedToken);
}

async function getCustomerAccountDiscovery(storeDomain: string) {
  const response = await fetch(`https://${storeDomain}/.well-known/customer-account-api`, {
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent": "VPA Coach Order Support",
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify customer account discovery failed with ${response.status}`);
  }

  return (await response.json()) as {
    graphql_api: string;
  };
}

async function fetchConnectedCustomer(graphqlEndpoint: string, accessToken: string) {
  const response = await fetch(graphqlEndpoint, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken,
      "User-Agent": "VPA Coach Order Support",
    },
    body: JSON.stringify({
      query: `
        query ConnectedCustomer {
          customer {
            id
            firstName
            lastName
            displayName
            emailAddress {
              emailAddress
            }
          }
        }
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Shopify customer profile request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: {
      customer?: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        displayName: string | null;
        emailAddress: {
          emailAddress: string;
        } | null;
      } | null;
    };
    errors?: Array<{ message: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  const customer = payload.data?.customer;

  if (!customer?.emailAddress?.emailAddress) {
    throw new Error("Connected Shopify customer profile did not include an email address.");
  }

  return {
    id: customer.id,
    email: customer.emailAddress.emailAddress,
    firstName: customer.firstName,
    lastName: customer.lastName,
    displayName:
      customer.displayName?.trim() ||
      [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
      customer.emailAddress.emailAddress,
  } satisfies ConnectedCustomer;
}
