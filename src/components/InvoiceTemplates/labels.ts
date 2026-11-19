// Invoice label sets (Phase 4, §4.3 — Bengali invoice option).
//
// The InvoiceRenderer renders every fixed label through this
// dictionary. English ("en") is the default and reproduces the
// renderer's historical strings exactly; Bengali ("bn") is selected
// when the store's settings language is "bn" (Settings → Invoices),
// which reaches the renderer through InvoiceCustomization.language.
//
// Money keeps the existing formatMoney() output (৳ + Western digits
// with en-US grouping) in both languages — the standard convention on
// Bangladeshi printed invoices — so totals stay unambiguous.
// Payment method VALUES (Cash / bKash / …) are data, not labels, and
// are printed as recorded; only the field captions are translated.

export type InvoiceLanguage = "en" | "bn";

/** Font stack applied to the invoice root when Bengali is active. */
export const BENGALI_FONT_STACK =
   "'Hind Siliguri', 'Noto Sans Bengali', 'Public Sans', sans-serif";

export interface InvoiceLabels {
   tel: string;
   phone: string;
   invoice: string;
   invoiceNo: string;
   date: string;
   server: string;
   customer: string;
   item: string;
   qty: string;
   rate: string;
   total: string;
   subtotal: string;
   delivery: string;
   deliveryCharge: string;
   discount: string;
   totalUpper: string;
   paid: string;
   paidAmount: string;
   due: string;
   dueBalance: string;
   grandTotal: string;
   taxVat: string;
   billTo: string;
   walkInCustomer: string;
   valuedCustomer: string;
   noAddress: string;
   paymentMethod: string;
   a5Title: string;
   invoicedTo: string;
   invoiceDetails: string;
   method: string;
   description: string;
   sku: string;
   quantity: string;
   price: string;
   amount: string;
   totalAmount: string;
   officialInvoice: string;
   customerInvoicedTo: string;
   orderPaymentDetails: string;
   courier: string;
   servedBy: string;
   address: string;
   orderRemarks: string;
   termsTitle: string;
   termsDefault: string;
   itemDescription: string;
   unitPrice: string;
   cashierOperator: string;
   customerAcceptance: string;
   authorizedSignature: string;
   cashMemo: string;
   defaultTitle: string;
   defaultHeader: string;
   defaultFooter: string;
}

const en: InvoiceLabels = {
   tel: "Tel",
   phone: "Phone",
   invoice: "INVOICE",
   invoiceNo: "Invoice",
   date: "Date",
   server: "Server",
   customer: "Customer",
   item: "Item",
   qty: "Qty",
   rate: "Rate",
   total: "Total",
   subtotal: "Subtotal",
   delivery: "Delivery",
   deliveryCharge: "Delivery Charge",
   discount: "Discount",
   totalUpper: "TOTAL",
   paid: "Paid",
   paidAmount: "Paid Amount",
   due: "Due",
   dueBalance: "Due Balance",
   grandTotal: "Grand Total",
   taxVat: "Tax / VAT",
   billTo: "Bill To Customer:",
   walkInCustomer: "Walk-in Customer",
   valuedCustomer: "Valued Customer",
   noAddress: "No address provided",
   paymentMethod: "Payment Method",
   a5Title: "A5 BUSINESS INVOICE",
   invoicedTo: "INVOICED TO:",
   invoiceDetails: "INVOICE DETAILS:",
   method: "Method",
   description: "Description",
   sku: "SKU",
   quantity: "Quantity",
   price: "Price",
   amount: "Amount",
   totalAmount: "Total Amount",
   officialInvoice: "OFFICIAL INVOICE",
   customerInvoicedTo: "Customer / Invoiced To:",
   orderPaymentDetails: "Order & Payment Details:",
   courier: "Courier",
   servedBy: "Served by",
   address: "Address",
   orderRemarks: "Order Remarks:",
   termsTitle: "Warranty & Return Terms:",
   termsDefault:
      "Goods once sold can be exchanged within 7 days with original invoice. Preserve this slip.",
   itemDescription: "Item Description",
   unitPrice: "Unit Price",
   cashierOperator: "Cashier / Operator",
   customerAcceptance: "Customer Acceptance",
   authorizedSignature: "Authorized Signature",
   cashMemo: "CASH MEMO",
   defaultTitle: "Sales Invoice",
   defaultHeader: "Official Sales Receipt",
   defaultFooter: "Thank you for shopping with us! Please come again.",
};

const bn: InvoiceLabels = {
   tel: "টেলি",
   phone: "ফোন",
   invoice: "ইনভয়েস",
   invoiceNo: "ইনভয়েস",
   date: "তারিখ",
   server: "ক্যাশিয়ার",
   customer: "ক্রেতা",
   item: "পণ্য",
   qty: "পরিমাণ",
   rate: "দর",
   total: "মোট",
   subtotal: "উপমোট",
   delivery: "ডেলিভারি",
   deliveryCharge: "ডেলিভারি চার্জ",
   discount: "ছাড়",
   totalUpper: "সর্বমোট",
   paid: "পরিশোধিত",
   paidAmount: "পরিশোধিত পরিমাণ",
   due: "বকেয়া",
   dueBalance: "বকেয়া পরিমাণ",
   grandTotal: "সর্বমোট",
   taxVat: "কর / ভ্যাট",
   billTo: "ক্রেতার বিবরণ:",
   walkInCustomer: "সাধারণ ক্রেতা",
   valuedCustomer: "সম্মানিত ক্রেতা",
   noAddress: "ঠিকানা দেওয়া হয়নি",
   paymentMethod: "পেমেন্ট মাধ্যম",
   a5Title: "ব্যবসায়িক ইনভয়েস",
   invoicedTo: "ইনভয়েস প্রাপক:",
   invoiceDetails: "ইনভয়েস বিবরণ:",
   method: "মাধ্যম",
   description: "বিবরণ",
   sku: "SKU",
   quantity: "পরিমাণ",
   price: "দাম",
   amount: "মূল্য",
   totalAmount: "মোট পরিমাণ",
   officialInvoice: "অফিসিয়াল ইনভয়েস",
   customerInvoicedTo: "ক্রেতা / ইনভয়েস প্রাপক:",
   orderPaymentDetails: "অর্ডার ও পেমেন্ট বিবরণ:",
   courier: "কুরিয়ার",
   servedBy: "সেবা দিয়েছেন",
   address: "ঠিকানা",
   orderRemarks: "অর্ডারের মন্তব্য:",
   termsTitle: "ওয়ারেন্টি ও রিটার্ন শর্তাবলি:",
   termsDefault:
      "বিক্রিত পণ্য মূল ইনভয়েসসহ ৭ দিনের মধ্যে বদলি করা যাবে। এই রসিদটি সংরক্ষণ করুন।",
   itemDescription: "পণ্যের বিবরণ",
   unitPrice: "একক মূল্য",
   cashierOperator: "ক্যাশিয়ার / অপারেটর",
   customerAcceptance: "ক্রেতার স্বীকৃতি",
   authorizedSignature: "অনুমোদিত স্বাক্ষর",
   cashMemo: "ক্যাশ মেমো",
   defaultTitle: "বিক্রয় ইনভয়েস",
   defaultHeader: "অফিসিয়াল বিক্রয় রসিদ",
   defaultFooter: "আমাদের দোকানে কেনাকাটা করার জন্য ধন্যবাদ! আবার আসবেন।",
};

export const INVOICE_LABELS: Record<InvoiceLanguage, InvoiceLabels> = { en, bn };

/** Resolve any settings language value to a supported invoice language. */
export function resolveInvoiceLanguage(value?: string | null): InvoiceLanguage {
   return value === "bn" ? "bn" : "en";
}
