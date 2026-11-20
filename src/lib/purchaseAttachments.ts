/**
 * Purchase attachments (B2-2, audit C-8 / P1-6).
 *
 * The Purchase Publish form collects attachments (AttachmentUploader
 * + the uploads flow) and the PurchaseAttachment model has always
 * existed, but the submit payload omitted them and the purchase
 * POST/PUT routes never created rows — files users believed were
 * stored were silently dropped. These pure helpers are the single
 * normalisation/reconciliation point shared by both routes (and
 * the tests):
 *
 *  - normalizePurchaseAttachments validates the payload shape the
 *    form/API sends — { name, url, type?, size? } descriptors of
 *    files already stored through POST /api/uploads — against the
 *    model's actual fields (name/url required, type/size optional)
 *    and drops anything that cannot become a row.
 *  - reconcilePurchaseAttachments diffs the stored set against the
 *    payload set (identity = the stored file URL) so the PUT route
 *    can replace the set inside its transaction: rows whose URL
 *    left the payload are deleted, payload entries with a new URL
 *    are created, and rows present in both are left untouched (no
 *    delete/recreate churn on a note-only edit that resends the
 *    same set).
 */

export interface PurchaseAttachmentInput {
   name: string;
   url: string;
   type: string | null;
   size: number | null;
}

export interface StoredPurchaseAttachment {
   id: string;
   name: string;
   url: string;
   type?: string | null;
   size?: number | null;
}

const MAX_ATTACHMENTS = 20;

export function normalizePurchaseAttachments(
   raw: unknown,
): PurchaseAttachmentInput[] {
   if (!Array.isArray(raw)) return [];
   const out: PurchaseAttachmentInput[] = [];
   const seenUrls = new Set<string>();
   for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const name = typeof e.name === "string" ? e.name.trim() : "";
      const url = typeof e.url === "string" ? e.url.trim() : "";
      if (!name || !url || seenUrls.has(url)) continue;
      seenUrls.add(url);
      const type =
         typeof e.type === "string" && e.type.trim() ? e.type.trim() : null;
      const sizeNum = Number(e.size);
      const size =
         e.size != null && Number.isFinite(sizeNum) && sizeNum >= 0
            ? Math.floor(sizeNum)
            : null;
      out.push({ name, url, type, size });
      if (out.length >= MAX_ATTACHMENTS) break;
   }
   return out;
}

export interface PurchaseAttachmentReconciliation {
   toCreate: PurchaseAttachmentInput[];
   toDeleteIds: string[];
   keptIds: string[];
}

export function reconcilePurchaseAttachments(
   existing: StoredPurchaseAttachment[],
   payload: PurchaseAttachmentInput[],
): PurchaseAttachmentReconciliation {
   const payloadUrls = new Set(payload.map((p) => p.url));
   const existingUrls = new Set(existing.map((e) => e.url));
   return {
      toCreate: payload.filter((p) => !existingUrls.has(p.url)),
      toDeleteIds: existing.filter((e) => !payloadUrls.has(e.url)).map((e) => e.id),
      keptIds: existing.filter((e) => payloadUrls.has(e.url)).map((e) => e.id),
   };
}
