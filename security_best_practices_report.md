# Security Best Practices Report

## Executive Summary

The highest-value AI security issue in this codebase was prompt injection exposure from untrusted Shopify and CMS content being serialized directly into the LLM system prompt. That issue has been mitigated in this review pass by normalizing retrieved content into bounded plain-text reference data and by explicitly instructing the model to treat retrieved content as untrusted.

I did not find evidence of tool-calling or agentic execution from model output in the current AI flow, which substantially reduces prompt-injection blast radius. The main residual risks are frontend HTML rendering that still relies on regex sanitization and the absence of visible CSP or Trusted Types defenses in app code.

## High Severity

### SP-001: Untrusted Shopify and CMS content reached the system prompt without a trust boundary

Impact: A malicious or compromised product description, blog article, or page body could steer the assistant's answer by embedding instruction-like text inside retrieved store content.

- Status: Fixed in this review pass
- Location:
  - `convex/chat.ts:289`
  - `convex/chat.ts:293`
  - `convex/chat.ts:316`
  - `convex/chat.ts:335`
  - `convex/chat.ts:355`
  - `convex/chat.ts:2265`
  - `convex/chat.ts:2294`
- Evidence:
  - The AI response path builds a `systemPrompt` in `createOpenAiReply`.
  - Retrieved store, product, article, and page data are now passed through prompt-safe builders that strip HTML, decode entities, truncate content, and serialize only narrow fields.
  - The prompt now contains explicit instructions to treat retrieved content as untrusted reference data and never as instructions.
- Fix:
  - Added `normalizePromptText(...)` and prompt-safe serializers for store snapshot, products, articles, and pages.
  - Added prompt instructions to ignore any instructions found inside retrieved content.
- Mitigation:
  - Keep external content out of high-privilege model instructions where possible.
  - Continue preferring structured fields over raw HTML or full-body content in model context.
- False positive notes:
  - The current model path does not expose function calling or privileged tool execution, so this was primarily an instruction-steering risk rather than immediate server-side code execution.

## Medium Severity

### SP-002: Regex-based HTML sanitization is used before `dangerouslySetInnerHTML`

- Status: Open
- Location:
  - `src/routes/index.tsx:1921`
  - `src/routes/index.tsx:1995`
  - `src/routes/index.tsx:3366`
- Evidence:
  - Article and page content are rendered with `dangerouslySetInnerHTML`.
  - The sanitization routine removes some tags and inline handlers with regexes, but it is not a full allowlist-based HTML sanitizer.
- Impact:
  - If attacker-controlled HTML reaches Shopify page/article content, regex stripping may miss dangerous markup patterns such as protocol-based URL payloads or edge-case HTML/SVG vectors.
- Fix:
  - Replace the regex sanitizer with a proven allowlist sanitizer such as DOMPurify and keep all rich-text sanitization centralized in one reviewed helper.
- Mitigation:
  - Restrict rendered HTML to a small safe subset and avoid raw HTML rendering where plain text or structured rendering is enough.
- False positive notes:
  - I did not verify whether upstream Shopify content is tightly admin-controlled in production; if it is, exploitability is reduced but not eliminated.

## Low Severity

### SP-003: No CSP or Trusted Types policy is visible in app code

- Status: Open
- Location:
  - No in-repo CSP, Trusted Types, or related browser policy configuration was found during this review.
- Evidence:
  - Repo search did not show `Content-Security-Policy`, `frame-ancestors`, `trusted-types`, or similar browser policy configuration in app code.
- Impact:
  - If an HTML injection bug survives sanitization, the browser has less defense-in-depth to contain it.
- Fix:
  - Verify whether CSP is configured at the hosting or CDN layer.
  - If not already present, add a production CSP and consider Trusted Types for HTML sinks.
- Mitigation:
  - Even with CSP, keep sanitization and safe rendering in place; CSP is defense-in-depth, not the primary fix.
- False positive notes:
  - This may already be enforced outside the repo at the CDN, proxy, or hosting layer; that is not visible from application code alone.

## Validation

- `vp test` passed: `3` test files, `36` tests.
- `vp check --fix` passed.
