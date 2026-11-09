export interface OrderDetailsPageProps {
   orderId?: string;
}

export interface FeedbackState {
   type: "success" | "error";
   message: string;
}

export interface QuickEditProduct {
   id: string;
   productId?: string | null;
   orderItemId?: string | null;
   name: string;
   price: number;
   quantity: number;
   images: string;
   code: string;
   subtotal?: number;
   isDeleted?: boolean;
}
