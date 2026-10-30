export interface InvoiceItem {
   name: string;
   sku?: string;
   barcode?: string;
   quantity: number;
   price: number;
   subtotal: number;
   unit?: string;
}

export interface InvoiceCustomer {
   name?: string;
   phone?: string;
   email?: string;
   address?: string;
   customId?: string;
}

export interface InvoiceOrderData {
   id?: string;
   orderId?: string;
   customId?: string;
   invoiceNo?: string;
   createdAt?: string | Date;
   date?: string;
   paymentMethod?: string;
   paymentStatus?: string;
   status?: string;
   courier?: string;
   courierTrackingId?: string;
   employeeName?: string;
   notes?: string;
   customer?: InvoiceCustomer;
   items: InvoiceItem[];
   subtotal: number;
   deliveryCharge?: number;
   discount?: number;
   tax?: number;
   total: number;
   advancePayment?: number;
   dueAmount?: number;
}

export interface InvoiceCustomization {
   templateId?: string;
   storeName?: string;
   tagline?: string;
   logoUrl?: string;
   phone?: string;
   email?: string;
   address?: string;
   website?: string;
   invoiceTitle?: string;
   invoiceHeader?: string;
   invoiceFooter?: string;
   paperSize?: "80mm" | "58mm" | "A4" | "A5";
   orientation?: "portrait" | "landscape";
   accentColor?: string;
   fontFamily?: string;
   logoPosition?: "left" | "center" | "right";
   logoSize?: "small" | "medium" | "large";
   showCustomerInfo?: boolean;
   showCourierInfo?: boolean;
   showCashierName?: boolean;
   showBarcode?: boolean;
   showSkuColumn?: boolean;
   showSubtotalBreakdown?: boolean;
   showDiscount?: boolean;
   showPaidDue?: boolean;
   showSignatureBox?: boolean;
   showTerms?: boolean;
   showThankYou?: boolean;
   termsText?: string;
}

export interface InvoiceTemplateMeta {
   id: string;
   name: string;
   category: "Standard A4" | "Thermal POS" | "Compact A5" | "Specialized";
   paperSize: "A4" | "A5" | "80mm" | "58mm";
   description: string;
   accent: string;
}
