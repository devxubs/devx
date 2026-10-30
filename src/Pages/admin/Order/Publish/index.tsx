"use client";

import {
   Stack,
   Container,
   Button,
   CircularProgress,
   Typography,
   useTheme,
   alpha,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import CustomerDetails from "./CustomerDetails";
import ProductDetails from "./ProductDetails";
import OrderInfo from "./OrderInfo";
import Pricing from "./Pricing";

import { OrderType } from "../type";
import { OrderFormValues, orderSchema } from "./schema";
import { orders as orderData } from "../data";

const Publish = () => {
   const theme = useTheme();
   const [order, setOrder] = useState<OrderType>({} as OrderType);
   const [loading, setLoading] = useState(false);
   const [isEditMode, setIsEditMode] = useState(false);
   const router = useRouter();
   const params = useSearchParams();
   const id = params?.get("id");

   const {
      control,
      handleSubmit,
      reset,
      formState: { errors },
      watch,
      setValue,
   } = useForm<OrderFormValues>({
      resolver: yupResolver<OrderFormValues, any, any>(orderSchema),
      defaultValues: {
         status: "Pending",
         orderNote: "",
         orderSource: "",
         customer: {
            name: "",
            email: "",
            address: "",
            phone: "",
         },
         products: [],
         pricing: {
            paymentMethod: "Cash on Delivery",
            subtotal: 0,
            deliveryCharge: 0,
            discount: 0,
            advancePayment: 0,
            total: 0,
         },
      },
   });

   useEffect(() => {
      if (!id) {
         setIsEditMode(false);
         return;
      }

      const fetchOrder = async () => {
         try {
            const res = await fetch(`/api/orders/${id}`);
            if (res.ok) {
               const o = await res.json();
               reset({
                  status: o.status ? (o.status.charAt(0) + o.status.slice(1).toLowerCase()) : "Pending",
                  orderNote: o.orderNote || "",
                  orderSource: o.orderSource || "",
                  customer: {
                     name: o.customer?.name || "",
                     email: o.customer?.email || "",
                     address: o.customer?.address || "",
                     phone: o.customer?.phone || "",
                  },
                  products: (o.items || []).map((it: any) => ({
                     id: it.productId || it.id,
                     name: it.name,
                     code: it.code || "",
                     quantity: it.quantity,
                     price: Number(it.price),
                     images: [it.product?.images?.[0] || "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-1.webp"],
                  })),
                  pricing: {
                     paymentMethod: o.paymentMethod || "Cash on Delivery",
                     subtotal: Number(o.subtotal),
                     deliveryCharge: Number(o.deliveryCharge),
                     discount: Number(o.discount),
                     total: Number(o.total),
                     advancePayment: Number(o.advancePayment),
                     dueAmount: Number(o.dueAmount),
                  },
               });
               setIsEditMode(true);
            }
         } catch {}
      };

      fetchOrder();
   }, [id, reset]);

   const watchedProducts = watch("products");
   useEffect(() => {
      if (Array.isArray(watchedProducts)) {
         const calculatedSubtotal = watchedProducts.reduce((sum: number, item: any) => {
            const qty = Number(item?.quantity) || 0;
            const price = Number(item?.price) || 0;
            return sum + qty * price;
         }, 0);
         setValue("pricing.subtotal", parseFloat(calculatedSubtotal.toFixed(2)));
      }
   }, [watchedProducts, setValue]);

   const customerData = order.customer ? order.customer : watch("customer");
   const productsData = order.products ? order.products : watch("products");
   const orderInfoData = {
      orderSource: order.orderSource ? order.orderSource : watch("orderSource"),
      orderNote: order.orderNote ? order.orderNote : watch("orderNote"),
   };
   const pricingData = order.pricing ? order.pricing : watch("pricing");

   const [submitError, setSubmitError] = useState<string | null>(null);

   const onSubmit: SubmitHandler<OrderFormValues> = async (formData) => {
      setLoading(true);
      setSubmitError(null);

      try {
         const payload = {
            customer: formData.customer,
            products: (formData.products || []).map((p: any) => ({
               productId: p.id,
               name: p.name,
               code: p.code,
               quantity: p.quantity,
               price: p.price,
            })),
            pricing: formData.pricing,
            orderNote: formData.orderNote || "",
            orderSource: formData.orderSource || "Direct",
            status: formData.status || "Pending",
         };

         const url = id ? `/api/orders/${id}` : "/api/orders";
         const method = id ? "PUT" : "POST";

         const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
         });

         if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to save order");
         }

         router.push("/admin/order");
      } catch (err: any) {
         setSubmitError(err.message || "Failed to save order");
      } finally {
         setLoading(false);
      }
   };

   return (
      <Stack width={"100%"} maxWidth={650} mx={"auto"} height={"100%"}>
         <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3}>
               <CustomerDetails
                  control={control}
                  errors={errors.customer || {}}
                  data={customerData as any}
               />
               <ProductDetails
                  control={control}
                  errors={errors}
                  data={productsData as any}
               />
               <OrderInfo
                  control={control}
                  errors={errors}
                  data={orderInfoData as any}
               />
               <Pricing
                  control={control}
                  errors={errors.pricing || {}}
                  setValue={setValue}
                  watch={watch}
                  data={pricingData as any}
               />
            </Stack>
            {submitError && (
               <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {submitError}
               </Typography>
            )}
            <Stack
               spacing={2}
               direction="row"
               justifyContent="flex-end"
               width="100%"
               mt={2}
            >
               <Button
                  variant="text"
                  color="inherit"
                  onClick={() => {
                     reset();
                     setIsEditMode(false);

                     router.push("/admin/order");
                  }}
               >
                  Cancel
               </Button>

               <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={loading}
                  sx={{
                     position: "relative",
                     overflow: "hidden",
                     backgroundColor: loading
                        ? alpha(theme.palette.primary.main, 0.5) + "!important"
                        : theme.palette.primary.main + "!important",
                     color: loading
                        ? alpha(theme.palette.primary.contrastText, 0.7) +
                          "!important"
                        : theme.palette.primary.contrastText,
                  }}
               >
                  {isEditMode ? "Update Order" : "Place Order"}
                  {loading && (
                     <CircularProgress
                        size={24}
                        sx={{
                           color: theme.palette.primary.contrastText,
                           position: "absolute",
                           top: "50%",
                           left: "50%",
                           marginTop: "-12px",
                           marginLeft: "-12px",
                        }}
                     />
                  )}
               </Button>
            </Stack>
         </form>
      </Stack>
   );
};

export default Publish;
