import { FormatOptionItem, OrderFieldGroup, OrderFieldKey } from "../types/export.types";

export const ORDER_FIELD_GROUPS: OrderFieldGroup[] = [
   {
      id: "order",
      title: "Order Details",
      fields: [
         { key: "orderId", label: "Order ID", defaultSelected: true },
         { key: "invoiceNo", label: "Invoice Number", defaultSelected: true },
         { key: "status", label: "Order Status", defaultSelected: true },
         { key: "paymentStatus", label: "Payment Status", defaultSelected: true },
         { key: "orderNote", label: "Order Note", defaultSelected: false },
         { key: "createdAt", label: "Created Date", defaultSelected: true },
         { key: "updatedAt", label: "Updated Date", defaultSelected: false },
      ],
   },
   {
      id: "customer",
      title: "Customer Information",
      fields: [
         { key: "customerName", label: "Customer Name", defaultSelected: true },
         { key: "customerPhone", label: "Phone Number", defaultSelected: true },
         { key: "customerEmail", label: "Email Address", defaultSelected: false },
         { key: "customerAddress", label: "Shipping Address", defaultSelected: false },
      ],
   },
   {
      id: "products",
      title: "Products & Items",
      fields: [
         { key: "productName", label: "Product Name(s)", defaultSelected: false },
         { key: "sku", label: "SKU / Code", defaultSelected: false },
         { key: "category", label: "Category", defaultSelected: false },
         { key: "quantity", label: "Total Quantity", defaultSelected: false },
         { key: "unit", label: "Unit", defaultSelected: false },
         { key: "unitPrice", label: "Unit Price", defaultSelected: false },
         { key: "discount", label: "Discount", defaultSelected: false },
         { key: "tax", label: "Tax", defaultSelected: false },
         { key: "subtotal", label: "Subtotal", defaultSelected: false },
      ],
   },
   {
      id: "financial",
      title: "Financial & Payment",
      fields: [
         { key: "total", label: "Grand Total", defaultSelected: true },
         { key: "paid", label: "Amount Paid", defaultSelected: true },
         { key: "due", label: "Amount Due", defaultSelected: true },
         { key: "paymentMethod", label: "Payment Method", defaultSelected: true },
         { key: "deliveryCharge", label: "Delivery Charge", defaultSelected: false },
      ],
   },
   {
      id: "other",
      title: "Courier & Attribution",
      fields: [
         { key: "courier", label: "Courier Service", defaultSelected: false },
         { key: "courierStatus", label: "Courier Status", defaultSelected: false },
         { key: "orderSource", label: "Order Source", defaultSelected: false },
         { key: "orderType", label: "Order Type", defaultSelected: false },
         { key: "createdBy", label: "Created By (Employee)", defaultSelected: false },
         { key: "printStatus", label: "Print Status", defaultSelected: false },
      ],
   },
];

export const ALL_FIELD_KEYS: OrderFieldKey[] = ORDER_FIELD_GROUPS.flatMap((g) =>
   g.fields.map((f) => f.key),
);

export const DEFAULT_SELECTED_FIELDS: OrderFieldKey[] = ORDER_FIELD_GROUPS.flatMap(
   (g) => g.fields.filter((f) => f.defaultSelected).map((f) => f.key),
);

export const FORMAT_OPTIONS: FormatOptionItem[] = [
   {
      id: "excel",
      name: "Microsoft Excel",
      ext: ".xlsx",
      description: "Full workbook with formula totals, styled header, and frozen panes",
      icon: "vscode-icons:file-type-excel",
      color: "#107C41",
   },
   {
      id: "csv",
      name: "CSV Spreadsheet",
      ext: ".csv",
      description: "Clean UTF-8 comma-separated text compatible with all spreadsheet apps",
      icon: "vscode-icons:file-type-csv",
      color: "#0284C7",
   },
   {
      id: "word",
      name: "Microsoft Word",
      ext: ".docx",
      description: "Formatted document table with summary layout and signature blocks",
      icon: "vscode-icons:file-type-word",
      color: "#185ABD",
   },
];
