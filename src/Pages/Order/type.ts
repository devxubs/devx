export interface OrderType {
  orderId: string;
  invoiceNo?: string; // optional invoice number
  status:
    | "Pending"
    | "Processing"
    | "Confirmed"
    | "Hold"
    | "Cancelled"
    | "Delivered"
    | "Completed";
  orderNote?: string; // general instructions
  orderSource: string; // e.g. Website, App, Phone
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string

  employee: {
    id: string;
    name: string;
  };

  customer: {
    id?: string;
    name: string;
    email: string;
    address: string;
    phone: string;
  };

  delivery: {
    address: string;
    shipBy: string; // FedEx, UPS, DHL, etc.
    method: string; // Express, Standard, Priority, etc.
    trackingNo?: string;
    estimatedDelivery?: string; // ISO date string
    deliveredAt?: string; // ISO date string
  };

  payment: {
    method:
      | "Cash on Delivery"
      | "Card"
      | "Bank Transfer"
      | "Wallet"
      | "Credit Card";
    status: "Pending" | "Paid" | "Failed" | "Refunded";
    transactionId?: string;
    details?: {
      cardMasked?: string;
      cardType?: string;
    };
  };

  products: {
    id?: string;
    name: string;
    code: string;
    quantity: number;
    price: number;
    images: string[];
  }[];

  pricing: {
    currency: string; // e.g., "USD"
    subtotal: number;
    shipping: number;
    discount: number; // always positive
    taxes: number;
    total: number;
    advancePayment?: number;
    dueAmount?: number;
    couponCode?: string;
  };

  statusHistory?: {
    status: string;
    timestamp: string; // ISO date
  }[];

  cancellationReason?: string;
  returnStatus?: "Requested" | "Approved" | "Rejected" | "Completed";
}
