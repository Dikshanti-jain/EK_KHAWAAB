/**
 * Application Security utilities for Ek Khawaab (Fixes AS-06).
 */

/**
 * Safely serializes objects into JSON strings for embedding inside inline HTML script tags
 * (such as <script type="application/ld+json">).
 *
 * Escapes characters that can trigger HTML tag termination or script breakout:
 * - '<' -> '\u003c' (prevents </script> breakout)
 * - '>' -> '\u003e'
 * - '&' -> '\u0026' (prevents entity decoding ambiguity)
 * - '\u2028' -> '\u2028' (line separator issue in older JS engines)
 * - '\u2029' -> '\u2029' (paragraph separator issue in older JS engines)
 */
export function safeJsonLd(data: unknown): string {
  if (data === undefined || data === null) {
    return "{}";
  }

  const serialized = typeof data === "string" ? data : JSON.stringify(data);
  if (!serialized) {
    return "{}";
  }

  return serialized
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

