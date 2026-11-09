import { ExportColumn, SummaryRowItem } from "@src/lib/exportEngine";

export type ExportFormat = "excel" | "csv" | "word";
export type DocumentPreviewTheme = "light" | "dark";

export type OrderFieldKey =
   // Order Group
   | "orderId"
   | "invoiceNo"
   | "status"
   | "paymentStatus"
   | "orderNote"
   | "createdAt"
   | "updatedAt"
   // Customer Group
   | "customerName"
   | "customerPhone"
   | "customerEmail"
   | "customerAddress"
   // Products Group
   | "productName"
   | "sku"
   | "category"
   | "quantity"
   | "unit"
   | "unitPrice"
   | "discount"
   | "tax"
   | "subtotal"
   // Financial Group
   | "total"
   | "paid"
   | "due"
   | "paymentMethod"
   | "deliveryCharge"
   // Other Group
   | "courier"
   | "courierStatus"
   | "orderSource"
   | "orderType"
   | "createdBy"
   | "printStatus";

export interface OrderFieldItem {
   key: OrderFieldKey;
   label: string;
   defaultSelected?: boolean;
}

export interface OrderFieldGroup {
   id: string;
   title: string;
   fields: OrderFieldItem[];
}

export interface NormalizedOrderRow {
   id: string;
   orderId: string;
   invoiceNo: string;
   status: string;
   paymentStatus: string;
   orderNote: string;
   createdAt: string;
   updatedAt: string;
   customerName: string;
   customerPhone: string;
   customerEmail: string;
   customerAddress: string;
   productName: string;
   sku: string;
   category: string;
   quantity: number;
   unit: string;
   unitPrice: number;
   discount: number;
   tax: number;
   subtotal: number;
   total: number;
   paid: number;
   due: number;
   paymentMethod: string;
   deliveryCharge: number;
   courier: string;
   courierStatus: string;
   orderSource: string;
   orderType: string;
   createdBy: string;
   printStatus: string;
   raw: any;
}

export interface StoreInfo {
   name?: string;
   phone?: string;
   email?: string;
   address?: string;
   logoUrl?: string;
}

export interface OrderExportConfig {
   format: ExportFormat;
   fileName: string;
   documentTitle: string;
   selectedFields: Set<OrderFieldKey>;
   storeInfo?: StoreInfo;
}

export interface FormatOptionItem {
   id: ExportFormat;
   name: string;
   ext: string;
   description: string;
   icon: string;
   color: string;
}

export interface ExportOrderModalProps {
   open: boolean;
   onClose: () => void;
   selectedOrders: any[];
   onSuccess?: () => void;
}
