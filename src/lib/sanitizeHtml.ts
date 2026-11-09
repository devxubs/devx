import DOMPurify from "dompurify";

/**
 * Checks whether a given string contains HTML tags.
 */
export function isHtmlContent(content?: string | null): boolean {
   if (!content || typeof content !== "string") return false;
   // Match standard HTML tag patterns (e.g., <p>, </h1>, <br/>, <span style=...>)
   return /<\/?[a-z][a-z0-9]*\b[^>]*>/i.test(content);
}

/**
 * Determines whether the description has meaningful content.
 * Returns true if empty, null, undefined, whitespace-only, or composed solely of empty HTML tags (e.g. <p></p>, <p><br></p>).
 */
export function isDescriptionEmpty(content?: string | null): boolean {
   if (!content || typeof content !== "string") return true;
   const trimmed = content.trim();
   if (!trimmed) return true;

   if (isHtmlContent(trimmed)) {
      // If there are media elements (images, etc.), consider it not empty
      if (/<(img|svg|iframe|video|audio)\b[^>]*>/i.test(trimmed)) {
         return false;
      }
      // Strip tags, html entities like &nbsp;, and whitespace
      const stripped = trimmed
         .replace(/<[^>]+>/g, "")
         .replace(/&nbsp;/gi, " ")
         .replace(/&#160;/gi, " ")
         .trim();
      return stripped.length === 0;
   }

   return false;
}

/**
 * Sanitizes an HTML string using DOMPurify with safe allowed tags and attributes.
 * Runs in both browser and server environments safely.
 */
export function sanitizeHtml(rawHtml?: string | null): string {
   if (!rawHtml || typeof rawHtml !== "string") return "";

   if (typeof window !== "undefined") {
      const purify =
         typeof DOMPurify === "function" ? (DOMPurify as any)(window) : DOMPurify;

      // Add hook to ensure external links open safely in a new tab
      if (purify && typeof purify.addHook === "function") {
         purify.addHook("afterSanitizeAttributes", (node: Element) => {
            if (node.tagName === "A" && node.hasAttribute("href")) {
               node.setAttribute("target", "_blank");
               node.setAttribute("rel", "noopener noreferrer");
            }
         });
      }

      return purify.sanitize(rawHtml, {
         ALLOWED_TAGS: [
            "p",
            "br",
            "strong",
            "b",
            "em",
            "i",
            "u",
            "s",
            "strike",
            "del",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "ul",
            "ol",
            "li",
            "a",
            "span",
            "div",
            "blockquote",
            "code",
            "pre",
            "hr",
            "img",
         ],
         ALLOWED_ATTR: [
            "href",
            "target",
            "rel",
            "class",
            "style",
            "src",
            "alt",
            "title",
            "width",
            "height",
         ],
         ALLOWED_URI_REGEXP:
            /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
         FORBID_TAGS: [
            "script",
            "style",
            "iframe",
            "object",
            "embed",
            "form",
            "input",
            "button",
            "textarea",
            "select",
         ],
         FORBID_ATTR: [
            "onerror",
            "onload",
            "onclick",
            "onmouseover",
            "onfocus",
            "onblur",
            "onkeydown",
            "onkeyup",
         ],
      });
   }

   // Server-side fallback: strip script tags and inline event handlers
   return rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, "")
      .replace(/\bon\w+\s*=\s*[^\s>]+/gi, "");
}
