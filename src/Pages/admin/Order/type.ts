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

// ✅ Product variant option (INV-02)
export interface ProductVariantOption {
   id: string;
   variantName: string;
   sku: string;
   quantity: number;
   regularPrice: number | string;
   salePrice?: number | string | null;
   attributes?: Record<string, string> | null;
   isDeleted?: boolean;
}

// ✅ Product type
export interface ProductType {
   id: string;
   productId?: string | null;
   orderItemId?: string | null;
   /** Selected variant for variable products (INV-02). */
   variantId?: string | null;
   variantName?: string | null;
   /** Live variants of the product, when known (picker options). */
   variants?: ProductVariantOption[];
   name: string;
   code: string;
   quantity: number;
   price: number;
   subtotal?: number;
   images: string;
   isDeleted?: boolean;
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

   orderCode?: string;
   customId?: string;
   orderId: string;
   invoiceNo: string;
   status: string;
   orderNote: string;
   employeeNote: string;
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
