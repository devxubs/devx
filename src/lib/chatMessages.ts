/**
 * Chat message pagination + payload shaping (P2-8 / P2-9) — pure
 * helpers shared by the messages API route and unit tests.
 *
 * Pagination model: messages are consumed by the UI in ascending
 * createdAt order (oldest at top, newest at bottom), but pages are
 * FETCHED newest-first: a page request returns the newest `limit`
 * messages at or before the cursor, in ascending order, plus a
 * cursor for the next older page. The cursor is the (createdAt, id)
 * pair of the oldest message in the returned page — createdAt alone
 * is not unique, so the id breaks ties (both indexes exist on
 * ChatMessage). Incremental polling uses `since` with the same
 * (createdAt, id) shape: only messages strictly after it are
 * returned, ascending, so the client can append without ever
 * re-downloading history.
 */

export const CHAT_DEFAULT_PAGE_SIZE = 50;
export const CHAT_MAX_PAGE_SIZE = 200;

export interface ChatCursor {
   createdAt: Date;
   id: string;
}

/** Parse the `limit` query param: default 50, clamped [1, 200]. */
export function parseChatLimit(raw: string | null | undefined): number {
   const n = parseInt(raw || "", 10);
   if (Number.isNaN(n)) return CHAT_DEFAULT_PAGE_SIZE;
   return Math.min(CHAT_MAX_PAGE_SIZE, Math.max(1, n));
}

/**
 * Parse a cursor from query params. Two encodings are accepted:
 * `before=<ISO timestamp>` + `beforeId=<id>` (the pair this API
 * hands back as `nextBefore` / `nextBeforeId`), or a single
 * `cursor=<ISO timestamp>~<id>` token. Returns null when absent or
 * malformed — a malformed cursor is treated as "newest page"
 * rather than an error, so a stale client never hard-fails.
 */
export function parseChatCursor(
   before: string | null | undefined,
   beforeId: string | null | undefined,
   cursorToken?: string | null | undefined,
): ChatCursor | null {
   let tsRaw = before || null;
   let idRaw = beforeId || null;
   if ((!tsRaw || !idRaw) && cursorToken) {
      const sep = cursorToken.lastIndexOf("~");
      if (sep > 0) {
         tsRaw = cursorToken.slice(0, sep);
         idRaw = cursorToken.slice(sep + 1);
      }
   }
   if (!tsRaw || !idRaw) return null;
   const createdAt = new Date(tsRaw);
   if (Number.isNaN(createdAt.getTime())) return null;
   return { createdAt, id: idRaw };
}

/** Parse the incremental-polling `since` pair (same shape as a cursor). */
export function parseChatSince(
   since: string | null | undefined,
   sinceId: string | null | undefined,
): ChatCursor | null {
   if (!since) return null;
   const createdAt = new Date(since);
   if (Number.isNaN(createdAt.getTime())) return null;
   // Without an id, fall back to a strict timestamp comparison.
   return { createdAt, id: sinceId || "" };
}

/**
 * Prisma `where` fragment selecting messages strictly OLDER than
 * the cursor (for fetching the previous page, newest-first).
 */
export function olderThanCursorWhere(cursor: ChatCursor) {
   return {
      OR: [
         { createdAt: { lt: cursor.createdAt } },
         { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ],
   };
}

/**
 * Prisma `where` fragment selecting messages strictly NEWER than
 * the `since` point (incremental polling). With no id, only the
 * timestamp is compared (strictly greater).
 */
export function newerThanSinceWhere(since: ChatCursor) {
   if (!since.id) return { createdAt: { gt: since.createdAt } };
   return {
      OR: [
         { createdAt: { gt: since.createdAt } },
         { createdAt: since.createdAt, id: { gt: since.id } },
      ],
   };
}

/**
 * Shape the paging metadata for a fetched page. `messages` must be
 * in ASCENDING createdAt order (the order the API returns and the
 * UI consumes). `fetchedCount` is the number of rows the database
 * returned for the page probe (limit + 1 rows are probed to detect
 * whether an older page exists).
 */
export function chatPageMeta(
   messages: Array<{ id: string; createdAt: Date | string }>,
   fetchedCount: number,
   limit: number,
) {
   const hasMore = fetchedCount > limit;
   const oldest = messages[0];
   return {
      hasMore,
      nextBefore: hasMore && oldest ? new Date(oldest.createdAt).toISOString() : null,
      nextBeforeId: hasMore && oldest ? oldest.id : null,
   };
}

/**
 * Normalise a stored `attachments` JSON value into the single
 * attachment object the chat UI renders (ChatBox expects one
 * Attachment: { type, url, name }). Accepts either a single object
 * or an array (first entry wins — the composer attaches one file).
 * Returns null for anything without a usable URL, so a malformed
 * payload can never create a phantom attachment bubble.
 */
export function normalizeChatAttachment(input: unknown):
   | { type: string; url: string; name: string }
   | null {
   const candidate = Array.isArray(input) ? input[0] : input;
   if (!candidate || typeof candidate !== "object") return null;
   const c = candidate as Record<string, unknown>;
   const url = typeof c.url === "string" ? c.url.trim() : "";
   if (!url) return null;
   return {
      type: typeof c.type === "string" && c.type ? c.type : "image",
      url,
      name: typeof c.name === "string" && c.name ? c.name : "Attachment",
   };
}

/**
 * Toggle one user's reaction on a message's stored `reactions`
 * JSON map ({ [userId]: unifiedEmoji }). Selecting the same emoji
 * again removes it; selecting a different one replaces it. Pure —
 * returns the next map (possibly empty).
 */
export function toggleReaction(
   reactions: unknown,
   userId: string,
   unified: string,
): Record<string, string> {
   const current: Record<string, string> =
      reactions && typeof reactions === "object" && !Array.isArray(reactions)
         ? { ...(reactions as Record<string, string>) }
         : {};
   if (current[userId] === unified) {
      delete current[userId];
   } else {
      current[userId] = unified;
   }
   return current;
}
