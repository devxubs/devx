import { useState, useEffect, useCallback } from "react";
import { QuickEditCustomerData, QuickEditPricingData } from "../types";
import { calculateOrderPricing } from "../helpers/pricingHelpers";

export interface UseQuickEditOrderProps {
   order?: any;
   effectiveOrderId?: string;
   calculatedSubtotal: number;
   onOrderFetched?: (data: any) => void;
}

export interface UseQuickEditOrderReturn {
   customer: QuickEditCustomerData;
   setCustomer: React.Dispatch<React.SetStateAction<QuickEditCustomerData>>;
   pricing: QuickEditPricingData;
   setPricing: React.Dispatch<React.SetStateAction<QuickEditPricingData>>;
   status: string;
   setStatus: React.Dispatch<React.SetStateAction<string>>;
   orderSource: string;
   setOrderSource: React.Dispatch<React.SetStateAction<string>>;
   courier: string;
   setCourier: React.Dispatch<React.SetStateAction<string>>;
   orderNote: string;
   setOrderNote: React.Dispatch<React.SetStateAction<string>>;
   isFetchingOrder: boolean;
   handleCustomerFieldChange: (
      field: keyof QuickEditCustomerData,
      value: string,
   ) => void;
   handlePricingFieldChange: (
      field: keyof QuickEditPricingData,
      value: any,
   ) => void;
}

export const useQuickEditOrder = ({
   order,
   effectiveOrderId,
   calculatedSubtotal,
   onOrderFetched,
}: UseQuickEditOrderProps): UseQuickEditOrderReturn => {
   const [customer, setCustomer] = useState<QuickEditCustomerData>({
      name: "",
      phone: "",
      address: "",
      email: "",
   });

   const [pricing, setPricing] = useState<QuickEditPricingData>({
      subtotal: 0,
      deliveryCharge: 0,
      discount: 0,
      advancePayment: 0,
      total: 0,
      dueAmount: 0,
      paymentMethod: "Cash on Delivery",
   });

   const [status, setStatus] = useState<string>("PENDING");
   const [orderSource, setOrderSource] = useState<string>("Direct Sales");
   const [courier, setCourier] = useState<string>("None");
   const [orderNote, setOrderNote] = useState<string>("");
   const [isFetchingOrder, setIsFetchingOrder] = useState<boolean>(false);

   // Populate form from full order object
   const populateFromOrder = useCallback((data: any) => {
      if (!data) return;

      setCustomer({
         name: data.customer?.name || data.customerName || "Walk-in Customer",
         phone: data.customer?.phone || data.customerPhone || "",
         address: data.customer?.address || data.customerAddress || "",
         email: data.customer?.email || data.customerEmail || "",
      });

      const orderSub = Number(
         data.pricing?.subtotal ?? data.subtotal ?? 0,
      );
      const orderDel = Number(
         data.pricing?.deliveryCharge ?? data.deliveryCharge ?? 0,
      );
      const orderDisc = Number(
         data.pricing?.discount ?? data.discount ?? 0,
      );
      const orderAdv = Number(
         data.pricing?.advancePayment ??
            data.advancePayment ??
            data.paid ??
            0,
      );

      const computed = calculateOrderPricing(
         orderSub,
         orderDel,
         orderDisc,
         orderAdv,
      );

      setPricing({
         ...computed,
         paymentMethod:
            data.pricing?.paymentMethod ||
            data.paymentMethod ||
            "Cash on Delivery",
      });

      setStatus(data.status || "PENDING");
      setOrderSource(data.orderSource || "Direct Sales");
      setCourier(data.courier || "None");
      setOrderNote(data.orderNote || data.notes || "");
   }, []);

   // Initialize data when order prop is provided
   useEffect(() => {
      if (order) {
         populateFromOrder(order);
      }
   }, [order, populateFromOrder]);

   // If order was not passed as prop, fetch order metadata using effectiveOrderId
   useEffect(() => {
      if (order || !effectiveOrderId) return;

      let isMounted = true;
      setIsFetchingOrder(true);

      fetch(`/api/orders/${effectiveOrderId}`)
         .then((r) => (r.ok ? r.json() : null))
         .then((data) => {
            if (!isMounted || !data) return;
            populateFromOrder(data);
            onOrderFetched?.(data);
         })
         .catch(() => {})
         .finally(() => {
            if (isMounted) setIsFetchingOrder(false);
         });

      return () => {
         isMounted = false;
      };
   }, [order, effectiveOrderId, populateFromOrder, onOrderFetched]);

   // Synchronize pricing total and dueAmount whenever items calculatedSubtotal changes
   useEffect(() => {
      setPricing((prev) => {
         const computed = calculateOrderPricing(
            calculatedSubtotal,
            prev.deliveryCharge,
            prev.discount,
            prev.advancePayment,
         );
         return {
            ...prev,
            ...computed,
         };
      });
   }, [calculatedSubtotal]);

   // Customer field change
   const handleCustomerFieldChange = useCallback(
      (field: keyof QuickEditCustomerData, value: string) => {
         setCustomer((prev) => ({ ...prev, [field]: value }));
      },
      [],
   );

   // Pricing field change
   const handlePricingFieldChange = useCallback(
      (field: keyof QuickEditPricingData, value: any) => {
         setPricing((prev) => {
            const updated = { ...prev, [field]: value };
            const computed = calculateOrderPricing(
               updated.subtotal,
               updated.deliveryCharge,
               updated.discount,
               updated.advancePayment,
            );
            return {
               ...updated,
               ...computed,
            };
         });
      },
      [],
   );

   return {
      customer,
      setCustomer,
      pricing,
      setPricing,
      status,
      setStatus,
      orderSource,
      setOrderSource,
      courier,
      setCourier,
      orderNote,
      setOrderNote,
      isFetchingOrder,
      handleCustomerFieldChange,
      handlePricingFieldChange,
   };
};
