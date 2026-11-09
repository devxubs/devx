import { ProductType } from "../../type";

export interface QuickEditCustomerData {
   name: string;
   phone: string;
   address: string;
   email?: string;
}

export interface QuickEditPricingData {
   subtotal: number;
   deliveryCharge: number;
   discount: number;
   advancePayment: number;
   total: number;
   dueAmount: number;
   paymentMethod: string;
}

export interface OrderNoteItem {
   id: string;
   type: "customer" | "courier" | "packing" | "employee" | "instruction" | "general";
   title: string;
   content: string;
   author?: string;
   createdAt: string;
   isNew?: boolean;
}

export interface QuickEditFormData {
   orderId?: string;
   orderCode?: string;
   invoiceNo?: string;
   status: string;
   orderSource: string;
   orderNote?: string;
   courier?: string;
   customer: QuickEditCustomerData;
   pricing: QuickEditPricingData;
   products: ProductType[];
   notes?: OrderNoteItem[];
}

export interface QuickEditModalProps {
   products?: ProductType[];
   order?: any;
   orderId?: string;
   isLoading?: boolean;
   onClose?: () => void;
   onUpdate?: (
      updatedProducts: ProductType[],
      extraFields?: {
         customer?: QuickEditCustomerData;
         pricing?: QuickEditPricingData;
         status?: string;
         orderSource?: string;
         orderNote?: string;
         courier?: string;
         deliveryCharge?: number;
         discount?: number;
         advancePayment?: number;
         paymentMethod?: string;
         notes?: OrderNoteItem[];
      },
   ) => Promise<void> | void;
}
