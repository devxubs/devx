// type.ts

// ✅ Employee type
export interface EmployeeType {
   id: string;
   name: string;
}

// ✅ Customer type
export interface CustomerType {
   id: string;
   name: string;
   email: string;
   address: string;
   phone: string;
}

// ✅ Product type
export interface ProductType {
   id: string;
   name: string;
   code: string;
   quantity: number;
   price: number;
   subtotal?: number;
   images: string;
}

// ✅ Pricing type
export interface PricingType {
   paymentMethod: string;
   subtotal: number;
   deliveryCharge: number;
   discount: number;
   total: number;
   advancePayment?: number;
   dueAmount?: number;
}

// ✅ Timestamps type
export interface OrderTimestampsType {
   createdAt: string; // when order was created
   updatedAt: string; // last updated time
   deliveryTime: string | null; // delivery time, null if not delivered
}

// ✅ Order type
export interface OrderType {
   id: number | string; // Added id field for unique identification
   color?: string;

   orderId: string;
   invoiceNo: string;
   status: string;
   orderNote: string;
   orderSource: string;
   createdAt: string;
   updatedAt?: string;
   cancellationReason?: string;

   timestamps: OrderTimestampsType;

   employee: EmployeeType;
   customer: CustomerType;
   products: ProductType[];
   pricing: PricingType;
}
