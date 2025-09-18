export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Hold"
  | "Cancelled"
  | "Delivered"
  | "Returned";

export type Customer = {
  id?: string;
  name: string;
  email: string;
  ip: string;
  address: string;
  phone: string;
};

export type Delivery = {
  shipBy: string; // courier
  speedy: string; // shipping speed
  trackingNo: string; // tracking number
  estimatedDate?: string; // ISO date string
};

export type Payment = {
  method:
    | "COD"
    | "Credit Card"
    | "Bank Transfer"
    | "Wallet"
    | "Card"
    | "Cash on Delivery";
  status?: "Unpaid" | "Paid" | "Refunded";
  cardMasked?: string;
  cardType?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
};

export type Product = {
  id?: string;
  name: string;
  code: string;
  images: string[];
  quantity: number;
  price: number;
  total?: number; // computed: quantity * price
};

export type Pricing = {
  subtotal: number;
  shipping: number;
  discount: number;
  taxes: number;
  total: number;
};

export type OrderHistory = {
  status: OrderStatus;
  date: string; // ISO date
  time: string; // HH:mm
  note?: string;
  updatedBy?: string;
};

export type OrderTimestamps = {
  orderPlaced: string; // ISO date
  paymentTime?: string; // ISO date
  deliveryTime?: string; // ISO date
  completionTime?: string; // ISO date
  cancelledAt?: string;
};
export type Employee = {
  id: string;
  name: string;
};
export type OrderSource =
  | "Website"
  | "Mobile App"
  | "WhatsApp"
  | "Phone Call"
  | "Messenger"
  | "Instagram"
  | "FaceBook";

export type OrderType = {
  orderId: string;
  status: OrderStatus;
  date: string;
  time: string;
  note: string;
  employee: Employee;
  orderSource: OrderSource;
  customer: Customer;
  delivery: Delivery;
  payment: Payment;
  products: Product[];
  pricing: Pricing;
  // history: OrderHistory[];
  timestamps: OrderTimestamps;
};
