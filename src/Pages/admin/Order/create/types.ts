// Order Create (upgrade) — shared types.
// Local to the Order Create page; nothing here changes shared app types.

export interface ApiCustomer {
   id: string;
   customId?: string | null;
   name: string;
   email?: string | null;
   phone?: string | null;
   address?: string | null;
}

export interface ApiVariant {
   id: string;
   variantName: string;
   sku: string;
   barcode?: string | null;
   quantity: number;
   regularPrice: number | string;
   salePrice?: number | string | null;
   /** O6: non-ACTIVE variants are not selectable in order lines. */
   status?: string | null;
   attributes?: Record<string, string> | null;
}

export interface ApiProduct {
   id: string;
   productName: string;
   productSku?: string | null;
   productCode?: string | null;
   barcode?: string | null;
   quantity: number;
   regularPrice: number | string;
   salePrice?: number | string | null;
   baseUnit?: string | null;
   salesUnit?: string | null;
   images?: string[] | null;
   status?: string | null;
   productType?: string | null;
   /** Live variants (products list API includes them, deleted excluded). */
   variants?: ApiVariant[] | null;
}

export interface CustomerFormState {
   /** Existing customer id when one was picked from search / just created. */
   id: string | null;
   name: string;
   email: string;
   phone: string;
   address: string;
}

export type DiscountType = "amount" | "percent";

export interface OrderLine {
   /**
    * Unique row key used by update/remove. Simple products keep
    * key === productId (one line per product, merged on re-add);
    * variable products get one line per added row so different
    * variants of the same product can coexist (INV-02).
    */
   key: string;
   productId: string;
   /** Selected variant (variable products); null until picked. */
   variantId: string | null;
   variantName: string | null;
   /** Live variants of the product; empty for simple products. */
   variants: ApiVariant[];
   name: string;
   /** SKU shown in the table and submitted as the item code. */
   code: string;
   /** The product's own barcode (kept for fallback display). */
   productBarcode: string | null;
   /**
    * Barcode shown in the line's product cell: the selected
    * variant's barcode when a variant is chosen, otherwise the
    * product's. Null when neither level carries a barcode.
    */
   barcode: string | null;
   image?: string | null;
   /** Available stock captured when the product was added/refreshed. */
   stock: number;
   unit: string;
   /** Editable list unit price (BDT). */
   listPrice: number;
   quantity: number;
   /** Per-line product discount, applied to the whole line. */
   discountType: DiscountType;
   discountValue: number;
}

export interface OrderNotesState {
   customer: string;
   courier: string;
   packing: string;
   employee: string;
}

export interface OrderCreateFormState {
   customer: CustomerFormState;
   lines: OrderLine[];
   orderSource: string;
   status: string;
   /** Delivery method — stored on the order's courier field. */
   courier: string;
   paymentMethod: string;
   advancePayment: number;
   /** Phase 3B (3.6): mobile-money reconciliation references. */
   paymentTxId: string;
   paymentSenderNumber: string;
   discountType: DiscountType;
   discountValue: number;
   taxEnabled: boolean;
   taxRate: number;
   deliveryCharge: number;
   notes: OrderNotesState;
}

export interface OrderTotals {
   /** Sum of list price × qty (before any discount). */
   subtotal: number;
   /** Sum of per-line product discounts. */
   productDiscount: number;
   /** Net product amount after product discounts — equals the server subtotal. */
   netProductAmount: number;
   /** Order-level discount amount (BDT). */
   overallDiscount: number;
   taxableAmount: number;
   taxAmount: number;
   deliveryCharge: number;
   grandTotal: number;
   advancePayment: number;
   dueAmount: number;
   paymentStatus: "Paid" | "Partial" | "Unpaid";
   /**
    * The single `discount` value submitted to the API. The server computes
    * total = subtotal − discount + deliveryCharge and has no tax column, so
    * the tax amount is folded in here: submittedDiscount = overallDiscount − tax.
    * The full breakdown is persisted on orderTags after creation.
    */
   submittedDiscount: number;
}

export const EMPTY_CUSTOMER: CustomerFormState = {
   id: null,
   name: "",
   email: "",
   phone: "",
   address: "",
};

export const EMPTY_NOTES: OrderNotesState = {
   customer: "",
   courier: "",
   packing: "",
   employee: "",
};
