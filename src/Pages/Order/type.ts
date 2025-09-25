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
      id: string;
      name: string;
      email: string;
      address: string;
      phone: string;
   };

   products: {
      id?: string;
      name: string;
      code: string;
      quantity: number;
      price: number;
      images: string;
   }[];

   pricing: {
      paymentMethod:
         | "Cash on Delivery"
         | "Card"
         | "Bank Transfer"
         | "Wallet"
         | "Credit Card"
         | string;
      subtotal: number;
      deliveryCharge: number;
      discount: number; // always positive
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
