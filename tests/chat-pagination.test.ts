import { describe, it, expect } from "vitest";
import {
   parseChatLimit,
   parseChatCursor,
   parseChatSince,
   olderThanCursorWhere,
   newerThanSinceWhere,
   chatPageMeta,
   normalizeChatAttachment,
   toggleReaction,
   CHAT_DEFAULT_PAGE_SIZE,
   CHAT_MAX_PAGE_SIZE,
} from "@src/lib/chatMessages";

// P2-8 / P2-9: pure helpers behind the chat messages API — page
// parameter parsing, (createdAt, id) cursor logic for older-page
// fetching and incremental `since` polling, attachment payload
// shaping, and reaction toggling.

describe("parseChatLimit", () => {
   it("defaults to 50 and clamps to [1, 200]", () => {
      expect(parseChatLimit(null)).toBe(CHAT_DEFAULT_PAGE_SIZE);
      expect(parseChatLimit("abc")).toBe(CHAT_DEFAULT_PAGE_SIZE);
      expect(parseChatLimit("10")).toBe(10);
      expect(parseChatLimit("0")).toBe(1);
      expect(parseChatLimit("-5")).toBe(1);
      expect(parseChatLimit("9999")).toBe(CHAT_MAX_PAGE_SIZE);
   });
});

describe("parseChatCursor", () => {
   const ts = "2026-11-20T10:00:00.000Z";
   it("parses the before/beforeId pair the API hands back", () => {
      const c = parseChatCursor(ts, "msg_1");
      expect(c?.id).toBe("msg_1");
      expect(c?.createdAt.toISOString()).toBe(ts);
   });

   it("parses the combined cursor token", () => {
      const c = parseChatCursor(null, null, `${ts}~msg_9`);
      expect(c?.id).toBe("msg_9");
      expect(c?.createdAt.toISOString()).toBe(ts);
   });

   it("returns null for absent or malformed cursors (newest page)", () => {
      expect(parseChatCursor(null, null)).toBeNull();
      expect(parseChatCursor(ts, null)).toBeNull();
      expect(parseChatCursor("not-a-date", "msg_1")).toBeNull();
   });
});

describe("cursor where fragments", () => {
   const cursor = { createdAt: new Date("2026-11-20T10:00:00.000Z"), id: "m2" };

   it("older-than selects strictly before (createdAt, id)", () => {
      const where = olderThanCursorWhere(cursor) as any;
      expect(where.OR).toHaveLength(2);
      expect(where.OR[0].createdAt.lt).toEqual(cursor.createdAt);
      expect(where.OR[1].createdAt).toEqual(cursor.createdAt);
      expect(where.OR[1].id.lt).toBe("m2");
   });

   it("newer-than selects strictly after (createdAt, id)", () => {
      const where = newerThanSinceWhere(cursor) as any;
      expect(where.OR[0].createdAt.gt).toEqual(cursor.createdAt);
      expect(where.OR[1].id.gt).toBe("m2");
   });

   it("since without an id falls back to a strict timestamp compare", () => {
      const parsed = parseChatSince("2026-11-20T10:00:00.000Z", null);
      expect(parsed?.id).toBe("");
      const where = newerThanSinceWhere(parsed!) as any;
      expect(where).toEqual({ createdAt: { gt: cursor.createdAt } });
      expect(parseChatSince(null, "m1")).toBeNull();
      expect(parseChatSince("junk", "m1")).toBeNull();
   });
});

describe("chatPageMeta", () => {
   const msgs = [
      { id: "m1", createdAt: new Date("2026-11-20T09:00:00.000Z") },
      { id: "m2", createdAt: new Date("2026-11-20T10:00:00.000Z") },
   ];

   it("reports hasMore and the oldest message as the next cursor when the probe overflowed", () => {
      const meta = chatPageMeta(msgs, 3, 2);
      expect(meta.hasMore).toBe(true);
      expect(meta.nextBeforeId).toBe("m1");
      expect(meta.nextBefore).toBe("2026-11-20T09:00:00.000Z");
   });

   it("reports no further page when the probe fit the limit", () => {
      const meta = chatPageMeta(msgs, 2, 2);
      expect(meta.hasMore).toBe(false);
      expect(meta.nextBefore).toBeNull();
      expect(meta.nextBeforeId).toBeNull();
   });
});

describe("normalizeChatAttachment", () => {
   it("keeps a well-formed single attachment", () => {
      expect(
         normalizeChatAttachment({ type: "image", url: "/uploads/a.png", name: "a.png" }),
      ).toEqual({ type: "image", url: "/uploads/a.png", name: "a.png" });
   });

   it("takes the first entry of an array payload", () => {
      expect(
         normalizeChatAttachment([{ url: "/uploads/b.png" }]),
      ).toEqual({ type: "image", url: "/uploads/b.png", name: "Attachment" });
   });

   it("rejects payloads without a usable URL", () => {
      expect(normalizeChatAttachment(null)).toBeNull();
      expect(normalizeChatAttachment(undefined)).toBeNull();
      expect(normalizeChatAttachment({ name: "x.png" })).toBeNull();
      expect(normalizeChatAttachment({ url: "  " })).toBeNull();
      expect(normalizeChatAttachment("a string")).toBeNull();
      expect(normalizeChatAttachment([])).toBeNull();
   });
});

describe("toggleReaction", () => {
   it("adds, replaces and removes a user's reaction", () => {
      expect(toggleReaction(null, "u1", "2764-fe0f")).toEqual({ u1: "2764-fe0f" });
      expect(toggleReaction({ u1: "2764-fe0f" }, "u1", "1f44d")).toEqual({ u1: "1f44d" });
      expect(toggleReaction({ u1: "2764-fe0f" }, "u1", "2764-fe0f")).toEqual({});
   });

   it("keeps other users' reactions and tolerates malformed stored values", () => {
      expect(toggleReaction({ u2: "1f606" }, "u1", "1f44d")).toEqual({
         u2: "1f606",
         u1: "1f44d",
      });
      expect(toggleReaction("junk", "u1", "1f44d")).toEqual({ u1: "1f44d" });
      expect(toggleReaction(["x"], "u1", "1f44d")).toEqual({ u1: "1f44d" });
   });
});
